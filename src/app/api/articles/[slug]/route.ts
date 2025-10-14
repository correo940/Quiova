import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createOrUpdateArticle, listArticles, deleteArticle } from "@/lib/github";
import matter from "gray-matter";

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

    const articles = await listArticles();
    const article = articles.find((a) => a.name === `${params.slug}.md`);

    if (!article) {
      return new NextResponse("Article not found", { status: 404 });
    }

    const newContent = matter.stringify(content, metadata);
    const message = `Update ${metadata.title}`;
    
    await createOrUpdateArticle(`${params.slug}.md`, newContent, message, article.sha);

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
    const articles = await listArticles();
    const article = articles.find((a) => a.name === `${params.slug}.md`);

    if (!article) {
      return new NextResponse("Article not found", { status: 404 });
    }

    const message = `Delete ${article.name}`;
    await deleteArticle(`${params.slug}.md`, message, article.sha);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar el artículo:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}