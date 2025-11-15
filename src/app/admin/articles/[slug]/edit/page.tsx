import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getArticleContent } from "@/lib/github";
import { parseMarkdown } from "@/lib/markdown";
import ArticleEditor from "@/components/article-editor";
import { allArticles } from "@/lib/data";

export default async function EditArticlePage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/admin/login");
  }

  // Resolver params si es una Promise (Next.js 15)
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;

  try {
    // Intentar cargar el artículo desde GitHub primero
    let article;
    try {
      const markdownContent = await getArticleContent(`${slug}.md`);
      article = await parseMarkdown(markdownContent);
    } catch (githubError: any) {
      // Si no existe en GitHub, intentar cargar desde allArticles como fallback
      console.warn('Artículo no encontrado en GitHub, usando datos locales:', githubError?.message || githubError);
      const localArticle = allArticles.find((a) => a.slug === slug);
      
      if (!localArticle) {
        notFound();
      }

      // Convertir HTML a markdown básico (remover tags y mantener estructura)
      let markdownContent = localArticle.content
        .replace(/<h3>/g, '### ')
        .replace(/<\/h3>/g, '\n\n')
        .replace(/<h2>/g, '## ')
        .replace(/<\/h2>/g, '\n\n')
        .replace(/<h1>/g, '# ')
        .replace(/<\/h1>/g, '\n\n')
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '\n\n')
        .replace(/<ul>/g, '')
        .replace(/<\/ul>/g, '\n')
        .replace(/<ol>/g, '')
        .replace(/<\/ol>/g, '\n')
        .replace(/<li>/g, '- ')
        .replace(/<\/li>/g, '\n')
        .replace(/<strong>/g, '**')
        .replace(/<\/strong>/g, '**')
        .replace(/<[^>]*>/g, '') // Remover cualquier otro tag HTML
        .replace(/\n{3,}/g, '\n\n') // Limpiar múltiples saltos de línea
        .trim();

      // Convertir el artículo local al formato esperado
      article = {
        title: localArticle.title,
        description: localArticle.excerpt,
        category: localArticle.category,
        date: localArticle.date,
        slug: localArticle.slug,
        image: localArticle.imageUrl,
        content: markdownContent,
        contentHtml: localArticle.content
      };
    }

    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Editar Artículo</h1>
        <ArticleEditor 
          initialData={{
            title: article.title,
            description: article.description,
            category: article.category,
            date: article.date,
            slug: article.slug,
            image: article.image
          }}
          content={article.content}
          isEditing={true}
        />
      </div>
    );
  } catch (error) {
    console.error('Error cargando artículo:', error);
    notFound();
  }
}