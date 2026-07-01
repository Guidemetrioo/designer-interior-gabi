import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH: Update a seller's fields (name, phone, message, active status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sellerId = parseInt(id, 10);

    if (isNaN(sellerId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { name, phone, message, active, leadsCount } = data;

    // Check if seller exists
    const existingSeller = await prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!existingSeller) {
      return NextResponse.json(
        { error: "Vendedora não encontrada" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (message !== undefined) updateData.message = message || null;
    if (active !== undefined) updateData.active = active;
    if (leadsCount !== undefined) updateData.leadsCount = leadsCount;
    if (phone !== undefined) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return NextResponse.json(
          { error: "Número de telefone inválido (deve conter pelo menos o DDD + número)" },
          { status: 400 }
        );
      }
      updateData.phone = cleanPhone;
    }

    const updatedSeller = await prisma.seller.update({
      where: { id: sellerId },
      data: updateData,
    });

    return NextResponse.json(updatedSeller);
  } catch (error) {
    console.error("Failed to update seller:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cadastro" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a seller
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sellerId = parseInt(id, 10);

    if (isNaN(sellerId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // Check if seller exists
    const existingSeller = await prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!existingSeller) {
      return NextResponse.json(
        { error: "Vendedora não encontrada" },
        { status: 404 }
      );
    }

    await prisma.seller.delete({
      where: { id: sellerId },
    });

    return NextResponse.json({ message: "Vendedora removida com sucesso" });
  } catch (error) {
    console.error("Failed to delete seller:", error);
    return NextResponse.json(
      { error: "Erro ao remover vendedora" },
      { status: 500 }
    );
  }
}
