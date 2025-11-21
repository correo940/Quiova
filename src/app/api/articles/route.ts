import { NextResponse } from 'next/server';
import { getArticlesFromGitHub } from '@/lib/github';

export async function GET() {
  try {
    const articles = await getArticlesFromGitHub();
    
    // Convertir al formato esperado por la página
    const formattedArticles = articles.map((a) => ({
      id: a.slug,
      slug: a.slug,
      title: a.title,
      excerpt: a.description || a.content.slice(0, 180),
      content: a.content,
      category: a.category,
      youtubeUrl: undefined,
      imageUrl: a.image || '/images/placeholder.png',
      imageHint: '',
      author: a.author || 'Anónimo',
      authorImageUrl: '/images/avatar-placeholder.png',
      authorImageHint: '',
      date: a.date || '',
      featured: false, // Puedes agregar lógica para featured
    }));

    return NextResponse.json(formattedArticles);
  } catch (error) {
    console.error('Error al obtener artículos:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// Revalidar cada 60 segundos
export const revalidate = 60;
