import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

export interface ArticleMetadata {
  title: string;
  date: string;
  category: string;
  description: string;
  image?: string;
  slug: string;
}

export interface Article extends ArticleMetadata {
  content: string;
  contentHtml: string;
}

export async function parseMarkdown(markdown: string): Promise<Article> {
  try {
    const { data, content } = matter(markdown);
    
    // Procesar el markdown a HTML
    const processedContent = await remark()
      .use(html, { sanitize: false }) // No sanitizar para permitir HTML embebido
      .process(content);
    
    const contentHtml = processedContent.toString();

    // Log para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('Markdown parseado:', {
        title: data.title,
        contentLength: content.length,
        htmlLength: contentHtml.length,
        hasLinks: contentHtml.includes('<a href')
      });
    }

    return {
      title: data.title || '',
      date: data.date || new Date().toLocaleDateString('es-ES'),
      category: data.category || 'salud física',
      description: data.description || '',
      image: data.image,
      slug: data.slug || '',
      content: content || '',
      contentHtml,
    };
  } catch (error) {
    console.error('Error parsing markdown:', error);
    console.error('Markdown que causó el error:', markdown.substring(0, 500));
    throw new Error('Error al parsear el markdown del artículo');
  }
}

export function createArticleMarkdown(metadata: ArticleMetadata, content: string): string {
  const frontmatter = {
    title: metadata.title,
    date: metadata.date,
    category: metadata.category,
    description: metadata.description,
    image: metadata.image,
    slug: metadata.slug,
  };

  return matter.stringify(content, frontmatter);
}