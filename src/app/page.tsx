'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  const [currentSlide, setCurrentSlide] = useState(0);

  // Carrusel con gradientes temáticos
  const slides = [
    {
      title: "Encuentra Tu Equilibrio",
      description: "Artículos sobre salud física, bienestar mental y finanzas familiares para ayudarte a prosperar.",
      gradient: "bg-gradient-to-br from-blue-600 to-purple-700"
    },
    {
      title: "Salud Física",
      description: "Ejercicios, nutrición y hábitos saludables para una vida activa y energética.",
      gradient: "bg-gradient-to-br from-green-600 to-blue-600"
    },
    {
      title: "Bienestar Mental",
      description: "Meditación, mindfulness y técnicas para reducir el estrés y mejorar tu bienestar emocional.",
      gradient: "bg-gradient-to-br from-purple-600 to-pink-600"
    },
    {
      title: "Finanzas Familiares",
      description: "Presupuestos, ahorro e inversiones para la estabilidad financiera de tu familia.",
      gradient: "bg-gradient-to-br from-orange-600 to-red-600"
    }
  ];

  // Autoplay del carrusel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [slides.length]);

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
      {/* Hero Section with Auto Carousel */}
      <section className="relative w-full h-[50vh] md:h-[60vh] text-white overflow-hidden">
        <div className="relative w-full h-full">
          {/* Slide actual */}
          <div 
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${slides[currentSlide].gradient} flex flex-col items-center justify-center text-center p-4`}
          >
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight drop-shadow-lg">
              {slides[currentSlide].title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg md:text-xl text-white/90 drop-shadow-md">
              {slides[currentSlide].description}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="#latest-articles">Explorar Artículos</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="text-secondary-foreground">
                <Link href="/apps">Portal de Apps</Link>
              </Button>
            </div>
          </div>

          {/* Indicadores de navegación */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Botones de navegación */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all duration-300"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all duration-300"
          >
            →
          </button>
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
