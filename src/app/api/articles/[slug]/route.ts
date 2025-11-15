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
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { metadata, content } = await request.json();

    if (!metadata || !content) {
      return NextResponse.json({ error: 'Metadata y contenido son requeridos' }, { status: 400 });
    }

    if (!metadata.slug) {
      return NextResponse.json({ error: 'El slug es requerido en metadata' }, { status: 400 });
    }

    const articles = await listArticles();
    // Buscar el artículo original por el slug de la URL
    const originalArticle = articles.find((a) => a.name === `${params.slug}.md`);
    // Buscar si el nuevo slug ya existe (en caso de que se haya cambiado el slug)
    const newSlugArticle = metadata.slug !== params.slug 
      ? articles.find((a) => a.name === `${metadata.slug}.md`)
      : null;

    // Si se cambió el slug y el nuevo slug ya existe, devolver error
    if (newSlugArticle && metadata.slug !== params.slug) {
      return NextResponse.json({ error: 'Ya existe un artículo con ese slug' }, { status: 400 });
    }

    const newContent = matter.stringify(content, metadata);
    const fileName = `${metadata.slug}.md`;
    
    // Si el slug cambió y el artículo original existe, necesitamos eliminarlo primero
    // Por ahora, solo actualizamos/creamos con el nuevo slug
    const articleToUpdate = originalArticle && metadata.slug === params.slug 
      ? originalArticle 
      : newSlugArticle || null;

    const message = articleToUpdate 
      ? `Update ${metadata.title}` 
      : `Create ${metadata.title}`;
    
    console.log('Guardando artículo:', {
      fileName,
      slug: metadata.slug,
      title: metadata.title,
      hasSha: !!articleToUpdate?.sha,
      contentLength: newContent.length
    });
    
    // Si el artículo existe, actualizarlo con SHA. Si no existe, crearlo sin SHA
    const result = await createOrUpdateArticle(
      fileName, 
      newContent, 
      message, 
      articleToUpdate?.sha
    );
    
    console.log('Artículo guardado exitosamente en GitHub:', result);

    // Si el slug cambió y el archivo original existe, eliminarlo
    if (originalArticle && metadata.slug !== params.slug) {
      try {
        await deleteArticle(`${params.slug}.md`, `Rename from ${params.slug} to ${metadata.slug}`, originalArticle.sha);
      } catch (deleteError) {
        console.error('Error al eliminar el archivo original después de renombrar:', deleteError);
        // No fallar si no se puede eliminar, el artículo nuevo ya se creó
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar el artículo:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const articles = await listArticles();
    const article = articles.find((a) => a.name === `${params.slug}.md`);

    if (!article) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });
    }

    const message = `Delete ${article.name}`;
    await deleteArticle(`${params.slug}.md`, message, article.sha);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar el artículo:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}