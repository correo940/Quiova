import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// AÑADE 'getArticleContent'
import { listArticles, createOrUpdateArticle, getArticleContent } from '@/lib/github';
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
    // 1. Obtiene la lista de archivos (ej: 'articulo1.md')
    const articleFiles = await listArticles();

    // 2. Lee el contenido de cada archivo en paralelo
    const articles = await Promise.all(
      articleFiles.map(async (file) => {
        try {
          const content = await getArticleContent(file.name);
          // 3. Extrae la metadata (frontmatter)
          const { data } = matter(content); 
          
          return {
            ...data, // Devuelve toda la metadata (title, date, excerpt, etc.)
            id: data.id || file.name.replace(/\.md$/, ''),
            slug: file.name.replace(/\.md$/, ''), // Añade el slug desde el nombre de archivo
          };
        } catch (e) {
          console.error(`Error procesando el archivo ${file.name}:`, e);
          return null; // Devuelve null si un archivo falla
        }
      })
    );

    // 4. Filtra cualquier archivo que haya fallado
    const validArticles = articles.filter(Boolean);

    return NextResponse.json(validArticles);

  } catch (error) {
    console.error('Error listando artículos:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Error al listar artículos' }), 
      { status: 500 }
    );
  }
}

// La función POST ya está correcta y no necesita cambios
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
