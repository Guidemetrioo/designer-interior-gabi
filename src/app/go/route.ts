import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // 2. Sort by leadsCount (ascending) then by lastAssignedAt (ascending)
    // If lastAssignedAt is null, it should come first to ensure newly added sellers get a lead.
    const sortedSellers = [...activeSellers].sort((a, b) => {
      if (a.leadsCount !== b.leadsCount) {
        return a.leadsCount - b.leadsCount;
      }
      const timeA = a.lastAssignedAt ? a.lastAssignedAt.getTime() : 0;
      const timeB = b.lastAssignedAt ? b.lastAssignedAt.getTime() : 0;
      return timeA - timeB;
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

    // 5. Redirect
    return NextResponse.redirect(whatsappUrl, 302);
  } catch (error) {
    console.error("Redirect error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro interno ao redirecionar atendimento" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
