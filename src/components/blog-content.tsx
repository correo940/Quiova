'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { categories } from '@/lib/data';
import { ArticleCategory } from '@/types';
import ArticleCard from '@/components/article-card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card } from '@/components/ui/card';
import CategoryIcon from '@/components/category-icon';
import { Capacitor } from '@capacitor/core';

export default function BlogContent() {
    const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | 'all'>('all');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const searchQuery = searchParams?.get('search')?.toLowerCase() || '';

    useEffect(() => {
        async function loadArticles() {
            try {
                const isMobile = Capacitor.isNativePlatform();
                const baseUrl = isMobile ? 'https://www.quioba.com' : '';
                const response = await fetch(`${baseUrl}/api/articles`);
                if (response.ok) {
                    const data = await response.json();
                    setArticles(data);
                }
            } catch (error) {
                console.error('❌ Error:', error);
            } finally {
                setLoading(false);
            }
        }
        loadArticles();

        const timer = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(timer);
    }, []);

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

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [slides.length]);

    const featuredArticles = useMemo(() => articles.filter((article) => article.featured), [articles]);

    const filteredArticles = useMemo(() => {
        let filtered = articles;
        if (searchQuery) {
            filtered = filtered.filter(article =>
                (article.title?.toLowerCase() || '').includes(searchQuery) ||
                (article.description?.toLowerCase() || '').includes(searchQuery) ||
                (article.category?.toLowerCase() || '').includes(searchQuery)
            );
        }
        if (selectedCategory === 'all') {
            return filtered.filter((article) => !article.featured);
        }
        const normalizedCategory = selectedCategory.toLowerCase().trim();
        return filtered.filter((article) => {
            const articleCategory = (article.category || '').toLowerCase().trim();
            return articleCategory === normalizedCategory && !article.featured;
        });
    }, [selectedCategory, articles, searchQuery]);

    if (loading && articles.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl font-medium text-slate-600">Cargando contenido...</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <section className="relative w-full h-[40vh] md:h-[50vh] text-white overflow-hidden">
                <div className="relative w-full h-full">
                    <div
                        className={`absolute inset-0 transition-all duration-1000 ease-in-out ${slides[currentSlide].gradient} flex flex-col items-center justify-center text-center p-4`}
                    >
                        <h1 className="font-headline text-3xl md:text-5xl font-bold tracking-tight drop-shadow-lg">
                            {slides[currentSlide].title}
                        </h1>
                        <p className="mt-4 max-w-2xl text-lg text-white/90 drop-shadow-md">
                            {slides[currentSlide].description}
                        </p>
                    </div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-white' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4 py-8">
                {featuredArticles.length > 0 && (
                    <section className="mb-12">
                        <h2 className="font-headline text-2xl font-bold mb-6 text-center">Artículos Destacados</h2>
                        <Carousel opts={{ align: 'start', loop: true }} className="w-full">
                            <CarouselContent>
                                {featuredArticles.map((article) => (
                                    <CarouselItem key={article.id} className="md:basis-1/2 lg:basis-1/3">
                                        <div className="p-1 h-full">
                                            <ArticleCard article={article} className="h-full" />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="hidden md:flex" />
                            <CarouselNext className="hidden md:flex" />
                        </Carousel>
                    </section>
                )}

                <section id="latest-articles">
                    <h2 className="font-headline text-2xl font-bold mb-6 text-center">Explorar Todo</h2>
                    <div className="flex justify-center flex-wrap gap-2 mb-8">
                        <Button
                            variant={selectedCategory === 'all' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory('all')}
                            className="rounded-full h-8 px-4 text-xs"
                        >
                            Todos
                        </Button>
                        {categories.map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(category)}
                                className="capitalize rounded-full h-8 px-4 text-xs"
                            >
                                <CategoryIcon category={category} className="mr-2 h-3 w-3" />
                                {category.replace('physical health', 'salud física').replace('mental health', 'salud mental').replace('family finance', 'finanzas familiares')}
                            </Button>
                        ))}
                    </div>

                    {filteredArticles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredArticles.map((article) => (
                                <ArticleCard key={article.id} article={article} />
                            ))}
                        </div>
                    ) : (
                        <Card className="text-center py-12">
                            <p className="text-muted-foreground text-sm">No se han encontrado artículos en esta categoría.</p>
                        </Card>
                    )}
                </section>
            </div>
        </div>
    );
}
