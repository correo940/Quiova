"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { allArticles as initialArticles } from "@/lib/data";

export default function AdminPage() {
  const [articles, setArticles] = useState(initialArticles);
  const [deleting, setDeleting] = useState<string | null>(null);

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
                  <p className="text-sm text-muted-foreground mt-1">{article.date}</p>
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