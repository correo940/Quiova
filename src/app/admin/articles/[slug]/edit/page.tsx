import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { allArticles } from "@/lib/data";
import ArticleEditor from "@/components/article-editor";

export default async function EditArticlePage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/admin/login");
  }

  const article = allArticles.find((a) => a.slug === params.slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Editar Artículo</h1>
      <ArticleEditor 
        initialData={{
          title: article.title,
          description: article.excerpt,
          category: article.category,
          date: article.date,
          slug: article.slug,
          image: article.imageUrl
        }}
        content={article.content}
        isEditing={true}
      />
    </div>
  );
}