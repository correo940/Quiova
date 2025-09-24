import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Article } from '@/types';
import { cn } from '@/lib/utils';
import CategoryIcon from './category-icon';

type ArticleCardProps = {
  article: Article;
  className?: string;
};

export default function ArticleCard({ article, className }: ArticleCardProps) {
  return (
    <Card className={cn("overflow-hidden flex flex-col h-full group transition-all duration-300 hover:shadow-xl hover:-translate-y-1", className)}>
      <Link href={`/articles/${article.slug}`} className="block h-full">
        <div className="flex flex-col h-full">
          <CardHeader className="p-0">
            <div className="relative h-48 w-full">
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                data-ai-hint={article.imageHint}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
               <Badge className="absolute top-3 right-3 capitalize backdrop-blur-sm bg-background/70 hover:bg-background/90 text-foreground">
                <CategoryIcon category={article.category} className="h-4 w-4 mr-1.5" />
                {article.category}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-grow">
            <CardTitle className="text-lg font-bold leading-snug mb-2 group-hover:text-primary transition-colors">
              {article.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {article.excerpt}
            </p>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={article.authorImageUrl} alt={article.author} data-ai-hint={article.authorImageHint} />
              <AvatarFallback>{article.author.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-semibold text-foreground/90">{article.author}</p>
              <p className="text-muted-foreground">{article.date}</p>
            </div>
          </CardFooter>
        </div>
      </Link>
    </Card>
  );
}
