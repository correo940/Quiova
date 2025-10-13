import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { metadata, content } = await request.json();

    // TODO: Implementar la actualización del artículo usando la API de GitHub
    // Por ahora solo simulamos una respuesta exitosa
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar el artículo:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    // TODO: Implementar la eliminación real usando la API de GitHub
    // Por ahora solo simulamos una respuesta exitosa
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar el artículo:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}