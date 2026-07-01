import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: List all sellers and total lead log count
export async function GET() {
  try {
    const sellers = await prisma.seller.findMany({
      orderBy: { id: "asc" },
      include: {
        _count: {
          select: { logs: true },
        },
      },
    });

    const totalLeads = await prisma.leadLog.count();

    // Get recent logs for auditing
    const recentLogs = await prisma.leadLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ sellers, totalLeads, recentLogs });
  } catch (error) {
    console.error("Failed to fetch sellers:", error);
    return NextResponse.json(
      { error: "Erro ao carregar lista de vendedoras" },
      { status: 500 }
    );
  }
}

// POST: Add a new seller
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, phone, message, active } = data;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Nome e telefone são obrigatórios" },
        { status: 400 }
      );
    }

    // Clean phone number: remove any non-digits
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: "Número de telefone inválido (deve conter pelo menos o DDD + número)" },
        { status: 400 }
      );
    }

    const seller = await prisma.seller.create({
      data: {
        name,
        phone: cleanPhone,
        message: message || null,
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json(seller, { status: 201 });
  } catch (error) {
    console.error("Failed to create seller:", error);
    return NextResponse.json(
      { error: "Erro ao cadastrar vendedoras" },
      { status: 500 }
    );
  }
}

// PUT: Reset stats (leads count and delete all logs)
export async function PUT() {
  try {
    await prisma.$transaction(async (tx) => {
      // Set leadsCount to 0 and lastAssignedAt to null for all
      await tx.seller.updateMany({
        data: {
          leadsCount: 0,
          lastAssignedAt: null,
        },
      });

      // Clear LeadLog table
      await tx.leadLog.deleteMany({});
    });

    return NextResponse.json({ message: "Estatísticas reiniciadas com sucesso" });
  } catch (error) {
    console.error("Failed to reset statistics:", error);
    return NextResponse.json(
      { error: "Erro ao reiniciar estatísticas" },
      { status: 500 }
    );
  }
}
