export type ArticleCategory = 'physical health' | 'mental health' | 'family finance';

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: ArticleCategory;
  youtubeUrl?: string;
  imageUrl: string;
  imageHint: string;
  author: string;
  authorImageUrl: string;
  authorImageHint: string;
  date: string;
  featured?: boolean;
};
