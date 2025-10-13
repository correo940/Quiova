import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { listArticles } from '@/lib/github';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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