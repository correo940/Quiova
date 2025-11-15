import { allArticles } from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import CategoryIcon from '@/components/category-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getYoutubeEmbedUrl, slugify } from '@/lib/utils';
import ArticleCard from '@/components/article-card';
import type { Metadata, ResolvingMetadata } from 'next';
import { getArticleContent } from '@/lib/github';
import { parseMarkdown } from '@/lib/markdown';

type Props = {
  params: { slug: string };
};

// Usar ISR (Incremental Static Regeneration) para Vercel
// Esto permite que la página se regenere en el fondo cada 60 segundos
export const revalidate = 60; // Revalidar cada 60 segundos

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;

  try {
    // Intentar cargar desde GitHub
    const markdownContent = await getArticleContent(`${slug}.md`);
    const article = await parseMarkdown(markdownContent);

    return {
      title: `${article.title} | Quiova`,
      description: article.description,
      openGraph: {
        title: article.title,
        description: article.description,
        images: article.image ? [
          {
            url: article.image,
            width: 1200,
            height: 630,
            alt: article.title,
          },
        ] : [],
      },
    };
  } catch (error) {
    // Fallback a allArticles
    const article = allArticles.find((a) => a.slug === slug);
    if (!article) {
      return {
        title: 'Artículo No Encontrado',
      };
    }

    return {
      title: `${article.title} | Quiova`,
      description: article.excerpt,
      openGraph: {
        title: article.title,
        description: article.excerpt,
        images: [
          {
            url: article.imageUrl,
            width: 1200,
            height: 630,
            alt: article.title,
          },
        ],
      },
    };
  }
}

export async function generateStaticParams() {
  // Intentar obtener artículos desde GitHub, si no, usar allArticles
  try {
    const { listArticles } = await import('@/lib/github');
    const githubArticles = await listArticles();
    return githubArticles.map((article) => ({
      slug: article.name.replace('.md', ''),
    }));
  } catch (error) {
    // Fallback a allArticles
    return allArticles.map((article) => ({
      slug: article.slug,
    }));
  }
}

const YoutubeEmbed = ({ url }: { url: string }) => {
  const embedUrl = getYoutubeEmbedUrl(url);

  if (!embedUrl) {
    return null;
  }

  return (
    <div className="aspect-video w-full my-8">
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        title="Reproductor de video de YouTube"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="rounded-lg shadow-lg"
      ></iframe>
    </div>
  );
};

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;

  // Intentar cargar desde GitHub primero
  let article: any;

  try {
    const markdownContent = await getArticleContent(`${slug}.md`);
    const parsedArticle = await parseMarkdown(markdownContent);
    
    // Log para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('Artículo cargado desde GitHub:', {
        slug,
        title: parsedArticle.title,
        contentPreview: parsedArticle.content.substring(0, 100),
        htmlPreview: parsedArticle.contentHtml.substring(0, 200),
        hasLinks: parsedArticle.contentHtml.includes('<a href')
      });
    }
    
    // Convertir al formato esperado por la página
    article = {
      id: slug,
      title: parsedArticle.title,
      excerpt: parsedArticle.description,
      content: parsedArticle.contentHtml,
      category: parsedArticle.category,
      imageUrl: parsedArticle.image || '/images/logo.png',
      imageHint: parsedArticle.image ? 'Imagen del artículo' : undefined,
      author: 'Autor',
      authorImageUrl: '/images/logo.png',
      authorImageHint: 'Avatar del autor',
      date: parsedArticle.date,
      slug: parsedArticle.slug,
      youtubeUrl: undefined, // Los artículos de GitHub no tienen YouTube por ahora
    };
  } catch (error) {
    console.error('Error cargando artículo desde GitHub:', error);
    // Fallback a allArticles
    article = allArticles.find((a) => a.slug === slug);
    if (!article) {
      notFound();
    }
  }

  // Para artículos relacionados, usar allArticles (o cargar desde GitHub si es necesario)
  const relatedArticles = allArticles.filter(
    (a) => a.category === article.category && a.id !== article.id
  ).slice(0, 3);

  return (
    <div className="bg-card">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <article className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <CategoryIcon category={article.category} className="h-5 w-5" />
              <Badge variant="outline" className="capitalize">{article.category.replace('physical health', 'salud física').replace('mental health', 'salud mental').replace('family finance', 'finanzas familiares')}</Badge>
            </div>
            <h1 className="font-headline text-3xl md:text-5xl font-bold leading-tight mb-4">
              {article.title}
            </h1>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={article.authorImageUrl} alt={article.author} data-ai-hint={article.authorImageHint} />
                <AvatarFallback>{article.author.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{article.author}</p>
                <p className="text-sm text-muted-foreground">{article.date}</p>
              </div>
            </div>
          </header>

          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg mb-8">
            <Image src={article.imageUrl} alt={article.title} fill className="object-cover" data-ai-hint={article.imageHint} />
          </div>

          <div className="prose prose-lg max-w-none text-foreground">
            <p className="lead text-xl italic text-muted-foreground">{article.excerpt}</p>
            {article.youtubeUrl && <YoutubeEmbed url={article.youtubeUrl} />}
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>
        </article>
      </div>
      
      {relatedArticles.length > 0 && (
        <aside className="bg-background py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="font-headline text-3xl font-bold mb-8 text-center">Artículos Relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
              {relatedArticles.map((related) => (
                <ArticleCard key={related.id} article={related} />
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
