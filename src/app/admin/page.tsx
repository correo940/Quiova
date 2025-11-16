"use client";
// Import 'useEffect' para cargar datos
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
// ELIMINA esta importación:
// import { allArticles as initialArticles } from "@/lib/data";

// Define un tipo básico para tus artículos, ya que no los estamos importando
// (Probablemente tengas un tipo mejor en '@/types/article' que puedas usar)
type Article = {
  id: string;
  slug: string;
  title: string;
  date: string;
};

export default function AdminPage() {
  // Inicializa 'articles' como un array vacío
  const [articles, setArticles] = useState<Article[]>([]);
  // Añade un estado de carga
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Usa useEffect para cargar los artículos del lado del cliente
  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch('/api/articles');
        if (!res.ok) throw new Error("Error al cargar artículos");
        const data = await res.json();
        setArticles(data);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar los artículos");
      } finally {
        setLoading(false);
      }
    }
    // Llama a la función
    loadArticles();
  }, []); // El array vacío [] asegura que esto solo se ejecute una vez

  const handleDelete = async (slug: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este artículo?")) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/articles/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setArticles((prev) => prev.filter((a) => a.slug !== slug));
    } catch (e) {
      alert("No se pudo eliminar el artículo");
    } finally {
      setDeleting(null);
    }
  };

  // Muestra un mensaje de carga mientras se obtienen los datos
  if (loading) {
    return <div className="container mx-auto p-6">Cargando artículos...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <Button asChild>
          <Link href="/admin/articles/new">Nuevo Artículo</Link>
        </Button>
      </div>
      <div className="grid gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Artículos</h2>
          <div className="divide-y">
            {articles.map((article) => (
              <div key={article.id} className="py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{article.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {/* Formatea la fecha si es necesario, ya que puede venir como string */}
                    {new Date(article.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/articles/${article.slug}`}>Ver</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/admin/articles/${article.slug}/edit`}>Editar</Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting === article.slug}
                    onClick={() => handleDelete(article.slug)}
                  >
                    {deleting === article.slug ? "Eliminando..." : "Eliminar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
