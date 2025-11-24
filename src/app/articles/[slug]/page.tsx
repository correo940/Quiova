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
  params: Promise<{ slug: string }>;
};

export const revalidate = 60;

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await props.params;
  const slug = params.slug;

  try {
    const markdownContent = await getArticleContent(`${slug}.md`);
    const article = await parseMarkdown(markdownContent);

    return {
      title: article.title,
      description: article.description,
    };
  } catch (error) {
    return {
      title: 'Artículo no encontrado',
    };
  }
}

export async function generateStaticParams() {
  return []; // Dejar que ISR maneje la generación bajo demanda
}

const YoutubeEmbed = ({ url }: { url: string }) => {
  const embedUrl = getYoutubeEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg my-8">
      <iframe
        src={embedUrl}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
};

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    let article: any;

    try {
      const markdownContent = await getArticleContent(`${slug}.md`);
      const parsedArticle = await parseMarkdown(markdownContent);

      if (process.env.NODE_ENV === 'development') {
        console.log('Artículo cargado desde GitHub:', {
          slug,
          title: parsedArticle.title,
          contentPreview: parsedArticle.content?.substring(0, 100) || '',
          htmlPreview: parsedArticle.contentHtml?.substring(0, 200) || '',
          hasLinks: parsedArticle.contentHtml?.includes('<a href') || false
        });
      }

      article = {
        id: slug,
        title: parsedArticle.title || 'Sin título',
        excerpt: parsedArticle.description || '',
        content: parsedArticle.contentHtml || '',
        category: parsedArticle.category || 'salud física',
        imageUrl: parsedArticle.image || '/images/logo.png',
        imageHint: parsedArticle.image ? 'Imagen del artículo' : undefined,
        author: 'Autor',
        authorImageUrl: '/images/logo.png',
        authorImageHint: 'Avatar del autor',
        date: parsedArticle.date || new Date().toLocaleDateString('es-ES'),
        slug: parsedArticle.slug || slug,
        youtubeUrl: undefined,
      };
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (!errorMessage.includes('GITHUB_TOKEN') && !errorMessage.includes('not found')) {
        console.warn('Error cargando artículo desde GitHub, usando datos locales:', errorMessage);
      }

      // 🔧 OPCIONAL: Aquí puedes eliminar el fallback si solo quieres artículos de GitHub
      const { allArticles } = await import('@/lib/data');
      article = allArticles.find((a) => a.slug === slug);
      if (!article) {
        notFound();
      }
    }

    if (!article || !article.title) {
      notFound();
    }

    // 🆕 ARTÍCULOS RELACIONADOS DESDE GITHUB
    let relatedArticles: any[] = [];
    try {
      const { getArticlesByCategory } = await import('@/lib/github');
      const categoryArticles = await getArticlesByCategory(article.category);

      relatedArticles = categoryArticles
        .filter(a => a.slug !== article.slug)
        .slice(0, 3)
        .map(a => ({
          id: a.slug,
          slug: a.slug,
          title: a.title,
          excerpt: a.description || (a.content ? a.content.slice(0, 180) : ''),
          content: a.content,
          category: a.category,
          youtubeUrl: undefined,
          imageUrl: a.image || '/images/placeholder.png',
          imageHint: '',
          author: a.author || 'Anónimo',
          authorImageUrl: '/images/avatar-placeholder.png',
          authorImageHint: '',
          date: a.date || '',
          featured: false,
        }));
    } catch (error) {
      console.warn('⚠️ Error cargando artículos relacionados:', error);
      relatedArticles = [];
    }

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
  } catch (error) {
    console.error('Error crítico cargando página de artículo:', error);
    notFound();
  }
}
