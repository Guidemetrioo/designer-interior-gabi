import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const getNamePriority = (name: string): number => {
  const normalized = name.toLowerCase().trim();
  if (normalized.startsWith("gabriela")) return 1;
  if (normalized.startsWith("luiza")) return 2;
  if (normalized.startsWith("ashley")) return 3;
  return 99; // fallback for others
};

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch all active sellers
    const activeSellers = await prisma.seller.findMany({
      where: { active: true },
    });

    if (activeSellers.length === 0) {
      // Return a premium, clean error message
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Atendimento Indisponível</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400&family=Playfair+Display:ital@0;1&display=swap" rel="stylesheet">
          <style>
            :root {
              --color-primary: #8a7a5f;
              --color-bg: #151515;
              --color-text: #e0dcd3;
              --color-card: #20201f;
              --font-serif: 'Playfair Display', serif;
              --font-sans: 'Inter', sans-serif;
            }
            body {
              background-color: var(--color-bg);
              color: var(--color-text);
              font-family: var(--font-sans);
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            .container {
              max-width: 480px;
              padding: 40px;
              background-color: var(--color-card);
              border-radius: 12px;
              box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
              border: 1px solid rgba(138, 122, 95, 0.15);
            }
            h1 {
              font-family: var(--font-serif);
              font-size: 2.2rem;
              font-weight: 300;
              margin-bottom: 20px;
              color: var(--color-primary);
            }
            p {
              font-size: 1rem;
              line-height: 1.6;
              color: #a09d96;
              margin-bottom: 30px;
            }
            .btn {
              display: inline-block;
              padding: 12px 30px;
              background-color: var(--color-primary);
              color: #151515;
              text-decoration: none;
              font-weight: 600;
              border-radius: 4px;
              transition: all 0.3s ease;
              letter-spacing: 0.5px;
            }
            .btn:hover {
              background-color: #9e8d72;
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Atendimento Temporariamente Indisponível</h1>
            <p>No momento, todos os nossos profissionais de design de interiores estão fora de seu horário de atendimento ou ocupados. Por favor, tente novamente mais tarde.</p>
            <a href="#" onclick="window.location.reload(); return false;" class="btn">Tentar Novamente</a>
          </div>
        </body>
        </html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        }
      );
    }

    // 2. Sort strictly by lastAssignedAt (ascending) to guarantee strict round-robin
    // Sellers who never got a lead (null) come first, sorted by name priority (Gabriela -> Luiza -> Ashley).
    const sortedSellers = [...activeSellers].sort((a, b) => {
      const timeA = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
      const timeB = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      const priorityA = getNamePriority(a.name);
      const priorityB = getNamePriority(b.name);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.id - b.id; // Stable fallback
    });

    const selectedSeller = sortedSellers[0];

    // Get client info
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // 3. Update seller stats and create log in transaction
    await prisma.$transaction(async (tx) => {
      await tx.seller.update({
        where: { id: selectedSeller.id },
        data: {
          leadsCount: { increment: 1 },
          lastAssignedAt: new Date(),
        },
      });

      await tx.leadLog.create({
        data: {
          sellerId: selectedSeller.id,
          sellerName: selectedSeller.name,
          sellerPhone: selectedSeller.phone,
          clientIp: ip,
          userAgent: userAgent,
        },
      });
    });

    // 4. Construct WhatsApp URL
    let textMessage = selectedSeller.message || "Olá! Gostaria de fazer um orçamento de design de interiores.";
    // Replace placeholders
    textMessage = textMessage.replace(/\[Nome\]/gi, selectedSeller.name);
    
    // Clean phone number (only digits)
    const cleanPhone = selectedSeller.phone.replace(/\D/g, "");
    
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;

    // 5. Redirect with Cache-Control headers to prevent browser caching of the 302 redirect
    const response = NextResponse.redirect(whatsappUrl, 302);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Redirect error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro interno ao redirecionar atendimento" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
