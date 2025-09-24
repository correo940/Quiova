'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { allArticles, ArticleCategory, categories } from '@/lib/data';
import ArticleCard from '@/components/article-card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import CategoryIcon from '@/components/category-icon';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | 'all'>('all');

  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-1');

  const featuredArticles = useMemo(() => allArticles.filter((article) => article.featured), []);

  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'all') {
      return allArticles.filter((article) => !article.featured);
    }
    return allArticles.filter(
      (article) => article.category === selectedCategory && !article.featured
    );
  }, [selectedCategory]);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative w-full h-[50vh] md:h-[60vh] text-white">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            data-ai-hint={heroImage.imageHint}
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center p-4">
          <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight drop-shadow-lg">
            Encuentra Tu Equilibrio
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-primary-foreground/90 drop-shadow-md">
            Artículos sobre salud física, bienestar mental y finanzas familiares para ayudarte a prosperar.
          </p>
          <Button asChild size="lg" className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="#latest-articles">Explorar Artículos</Link>
          </Button>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Featured Articles */}
        <section className="mb-12 md:mb-16">
          <h2 className="font-headline text-3xl font-bold mb-6 text-center">Artículos Destacados</h2>
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {featuredArticles.map((article) => (
                <CarouselItem key={article.id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1 h-full">
                    <ArticleCard article={article} className="h-full" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex"/>
            <CarouselNext className="hidden md:flex"/>
          </Carousel>
        </section>

        {/* Latest Articles */}
        <section id="latest-articles">
          <h2 className="font-headline text-3xl font-bold mb-6 text-center">Últimos Artículos</h2>

          {/* Category Filters */}
          <div className="flex justify-center flex-wrap gap-2 mb-8">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className="rounded-full"
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="capitalize rounded-full"
              >
                <CategoryIcon category={category} className="mr-2 h-4 w-4" />
                {category.replace('physical health', 'salud física').replace('mental health', 'salud mental').replace('family finance', 'finanzas familiares')}
              </Button>
            ))}
          </div>

          {/* Articles Grid */}
          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <p className="text-muted-foreground">Aún no se han encontrado artículos en esta categoría.</p>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
