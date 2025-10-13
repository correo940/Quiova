'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { categories } from '@/lib/data';
import type { ArticleMetadata } from '@/types/article';
import { slugify } from '@/lib/utils';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <div>Cargando editor...</div>
});

interface ArticleEditorProps {
  initialData?: ArticleMetadata;
  content?: string;
  isEditing?: boolean;
}

export default function ArticleEditor({ initialData, content: initialContent, isEditing }: ArticleEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState<string>(initialData?.category || 'salud física');
  const [content, setContent] = useState(initialContent || '');
  const [image, setImage] = useState(initialData?.image || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const date = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const response = await fetch(`/api/articles${isEditing ? `/${initialData?.slug}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            title,
            description,
            category,
            date: initialData?.date || date,
            slug: initialData?.slug || slugify(title),
            image: image || undefined
          },
          content
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el artículo');
      }

      router.push('/admin');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar el artículo');
    } finally {
      setSaving(false);
    }
  }, [title, description, category, content, image, router, isEditing, initialData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Ingresa el título del artículo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Ingresa una breve descripción del artículo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <Select value={category} onValueChange={(value) => setCategory(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">URL de la imagen (opcional)</Label>
          <Input
            id="image"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
          />
        </div>
      </Card>

      <div className="min-h-[500px]" data-color-mode="light">
        <MDEditor
          value={content}
          onChange={(value) => setContent(value || '')}
          height={500}
          preview="live"
        />
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Artículo'}
        </Button>
      </div>
    </form>
  );
}
