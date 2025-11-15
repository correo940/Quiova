import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { listArticles, createOrUpdateArticle } from '@/lib/github';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import matter from 'gray-matter';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
    });
  }

  try {
    const articles = await listArticles();
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error listando artículos:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Error al listar artículos' }), 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
      return NextResponse.json({ error: 'El slug es requerido' }, { status: 400 });
    }

    const newContent = matter.stringify(content, metadata);
    const message = `Create ${metadata.title}`;
    
    console.log('Guardando artículo:', { slug: metadata.slug, title: metadata.title });
    const result = await createOrUpdateArticle(`${metadata.slug}.md`, newContent, message);
    console.log('Artículo guardado en GitHub:', result);

    return NextResponse.json({ success: true, slug: metadata.slug });
  } catch (error) {
    console.error("Error al crear el artículo:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}