export type ArticleCategory = 'salud física' | 'salud mental' | 'finanzas familiares';

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'physical health' | 'mental health' | 'family finance';
  youtubeUrl?: string;
  imageUrl: string;
  imageHint: string;
  author: string;
  authorImageUrl: string;
  authorImageHint: string;
  date: string;
  featured?: boolean;
};
