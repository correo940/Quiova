"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import AdminPostItManager from "@/components/admin/post-it-manager";

// ... imports

export default function AdminPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = (slug: string) => {
    console.log("Delete", slug);
  };

  // ... existing state

  // ... existing useEffect

  // ... existing handleDelete

  // ... existing loading check

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/articles/new">Nuevo Artículo</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => signOut()} title="Cerrar sesión">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
      {/* ... rest of the component */}
      <div className="grid gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Artículos</h2>
          <div className="divide-y">
            {articles.map((article) => (
              <div key={article.id} className="py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{article.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {/* Formatea la fecha para que sea legible */}
                    {new Date(article.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    {/* El link "Ver" debe ir al artículo público */}
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

        {/* Post-it Manager */}
        <div className="bg-card rounded-lg shadow-sm">
          <AdminPostItManager />
        </div>

      </div>
    </div>
  );
}
