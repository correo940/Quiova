'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Search, Filter, Calendar, Tag, ArrowUpRight, BookOpen, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useJournal } from '@/context/JournalContext';

export default function JournalLibraryPage() {
    const router = useRouter();
    const { setIsOpen, setSelectedDate } = useJournal(); // Assuming these exist in context to open panel
    const [entries, setEntries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [allTags, setAllTags] = useState<string[]>([]);

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login'); // Or handle auth check differently
            return;
        }

        const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching entries:', error);
        } else {
            setEntries(data || []);
            // Extract unique tags
            const tags = Array.from(new Set((data || []).flatMap((e: any) => e.tags || [])));
            setAllTags(tags as string[]);
        }
        setIsLoading(false);
    };

    const filteredEntries = entries.filter(entry => {
        const matchesSearch = searchTerm === '' ||
            JSON.stringify(entry.content).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = selectedTag === null || (entry.tags && entry.tags.includes(selectedTag));
        return matchesSearch && matchesTag;
    });

    // Helper to strip HTML for preview
    const getPreview = (jsonContent: any) => {
        try {
            if (!jsonContent) return 'Sin contenido...';
            // Very naive TipTap JSON to text. 
            // In reality, better to use editor.getText() but we don't have editor instance here easily.
            // Let's just try to grab some text nodes.
            // For now, let's look for known structure or just JSON stringify content if complex.
            // Actually, let's just show "Nota del [fecha]" if we can't parse easily without TipTap.
            // Or a simple recursive text extractor:
            const extractText = (node: any): string => {
                if (node.text) return node.text;
                if (node.content) return node.content.map(extractText).join(' ');
                return '';
            };
            const text = extractText(jsonContent);
            return text.slice(0, 150) + (text.length > 150 ? '...' : '');
        } catch (e) {
            return 'Contenido no disponible en vista previa';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 p-4 md:p-8 pt-20">
            {/* Header */}
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold font-headline text-gray-900 dark:text-gray-100 flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-blue-500" />
                            Biblioteca de Apuntes
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Explora tu colección de pensamientos e ideas.
                        </p>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar en mis notas..."
                                className="pl-9 w-full sm:w-[300px] bg-white dark:bg-zinc-900"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Tags Filter */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-4 border-b border-border">
                        <Filter className="w-4 h-4 text-muted-foreground mr-2 self-center" />
                        <Badge
                            variant={selectedTag === null ? "default" : "outline"}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedTag(null)}
                        >
                            Todos
                        </Badge>
                        {allTags.map(tag => (
                            <Badge
                                key={tag}
                                variant={selectedTag === tag ? "default" : "outline"}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                            >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Grid */}
                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
                        <AnimatePresence mode="popLayout">
                            {filteredEntries.map((entry) => (
                                <motion.div
                                    key={entry.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="group relative bg-white dark:bg-zinc-900 border border-border rounded-xl p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1"
                                    onClick={() => {
                                        // Open Journal Panel context
                                        // We might need to handle this navigation properly
                                        // For now, if we are in the app, we can just navigate to the context URL if strictly bound,
                                        // OR we just show the content.
                                        // Since we can't easily "open the global panel" from a Next.js page transition easily without Context persistence or URL query params.
                                        // A simple hack: Pass a query param ?journal_open=true&entry_id=...
                                        // But wait, the JournalPanel IS global.
                                        // If we click here, we want to open that note.
                                        // The JournalPanel hook `setIsOpen` might work if this page is within the Layout that provides Context.
                                        setSelectedDate(new Date(entry.updated_at));
                                        setIsOpen(true);
                                    }}
                                >
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(entry.updated_at), "d 'de' MMMM, yyyy", { locale: es })}
                                    </div>

                                    <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight">
                                        {/* Try to get a title? or just date? */}
                                        {entry.tags && entry.tags.length > 0 ? entry.tags[0] : 'Nota sin título'}
                                    </h3>

                                    <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                                        {getPreview(entry.content)}
                                    </p>

                                    {entry.tags && entry.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-4">
                                            {entry.tags.slice(0, 3).map((tag: string) => (
                                                <span key={tag} className="text-[10px] bg-secondary px-2 py-1 rounded-full text-secondary-foreground">
                                                    #{tag}
                                                </span>
                                            ))}
                                            {entry.tags.length > 3 && (
                                                <span className="text-[10px] text-muted-foreground px-1 self-center">
                                                    +{entry.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {!isLoading && filteredEntries.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No se encontraron apuntes.</p>
                        {searchTerm && <p className="text-sm">Prueba con otra búsqueda.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
