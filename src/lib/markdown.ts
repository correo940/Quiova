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
  const { data, content } = matter(markdown);
  
  const processedContent = await remark()
    .use(html)
    .process(content);
  
  const contentHtml = processedContent.toString();

  return {
    title: data.title,
    date: data.date,
    category: data.category,
    description: data.description,
    image: data.image,
    slug: data.slug,
    content,
    contentHtml,
  };
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