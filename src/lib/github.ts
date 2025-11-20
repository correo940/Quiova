import matter from 'gray-matter';

const GITHUB_API = 'https://api.github.com';
const owner = process.env.GITHUB_OWNER || 'correo940';
const repo = process.env.GITHUB_REPO || 'quiova';
const branch = process.env.GITHUB_BRANCH || 'main';

export interface Article {
  title: string;
  description: string;
  category: string;
  date: string;
  author: string;
  slug: string;
  content: string;
  image?: string;
}

// Obtener todos los artículos desde GitHub
export async function getArticlesFromGitHub(): Promise<Article[]> {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/content/articles?ref=${branch}`,
      {
        headers: {
          Authorization: process.env.GITHUB_TOKEN ? `Bearer ${process.env.GITHUB_TOKEN}` : '',
          Accept: 'application/vnd.github.v3+json',
        },
        // Si usas Next.js 13+ y quieres revalidar en ISR, puedes mantener esta opción
        // next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      console.error('Error al obtener artículos de GitHub', response.status, await response.text());
      return [];
    }

    const files = await response.json();
    const articles: Article[] = [];

    // Leer cada archivo .md
    for (const file of files) {
      if (file.name && file.name.endsWith('.md')) {
        // Usamos download_url si está disponible (contenido raw)
        const contentUrl = file.download_url || file.url;
        if (!contentUrl) continue;

        const contentResponse = await fetch(contentUrl);
        if (!contentResponse.ok) {
          console.warn('No se pudo descargar el archivo', file.name);
          continue;
        }
        const raw = await contentResponse.text();

        // Parsear frontmatter
        const { data, content: articleContent } = matter(raw);

        articles.push({
          title: data.title || '',
          description: data.description || '',
          category: data.category || '',
          date: data.date || '',
          author: data.author || 'Anónimo',
          slug: data.slug || file.name.replace('.md', ''),
          content: articleContent,
          image: data.image,
        });
      }
    }

    return articles;
  } catch (error) {
    console.error('Error leyendo artículos desde GitHub:', error);
    return [];
  }
}

// Obtener artículos por categoría
export async function getArticlesByCategory(category: string): Promise<Article[]> {
  const articles = await getArticlesFromGitHub();
  return articles.filter((article) => article.category === category);
}

// Obtener un artículo por slug
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await getArticlesFromGitHub();
  return articles.find((article) => article.slug === slug) || null;
}
import { Octokit } from 'octokit';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'correo940';
const REPO_NAME = 'Quiova';
const CONTENT_PATH = 'content/articles';

// Solo inicializar Octokit si hay token para evitar errores en build time
export const octokit = GITHUB_TOKEN ? new Octokit({
  auth: GITHUB_TOKEN,
}) : null;

export async function getArticleContent(path: string) {
  if (!GITHUB_TOKEN || !octokit) {
    console.warn('GITHUB_TOKEN no está configurado. No se puede cargar desde GitHub.');
    throw new Error('GITHUB_TOKEN_NOT_CONFIGURED');
  }

  try {
    const response = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `${CONTENT_PATH}/${path}`,
    });

    if ('content' in response.data) {
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return content;
    }
    throw new Error('No content found');
  } catch (error: any) {
    // Si es un error 404, lanzarlo para que se maneje arriba
    if (error.status === 404 || error.message === 'Not Found') {
      throw new Error('Article not found');
    }
    // Si es un error de autenticación o token
    if (error.status === 401 || error.status === 403) {
      console.error('Error de autenticación con GitHub:', error.message);
      throw new Error('GITHUB_AUTH_ERROR');
    }
    console.error('Error fetching article content:', error);
    throw error;
  }
}

export async function createOrUpdateArticle(
  path: string,
  content: string,
  message: string,
  sha?: string
) {
  if (!GITHUB_TOKEN || !octokit) {
    throw new Error('GITHUB_TOKEN no está configurado');
  }

  try {
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `${CONTENT_PATH}/${path}`,
      message,
      content: Buffer.from(content).toString('base64'),
      sha: sha,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating/updating article:', error);
    throw error;
  }
}

export async function deleteArticle(path: string, message: string, sha: string) {
  if (!GITHUB_TOKEN || !octokit) {
    throw new Error('GITHUB_TOKEN no está configurado');
  }

  try {
    const response = await octokit.rest.repos.deleteFile({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `${CONTENT_PATH}/${path}`,
      message,
      sha,
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting article:', error);
    throw error;
  }
}

export async function listArticles() {
  if (!GITHUB_TOKEN || !octokit) {
    return [];
  }

  try {
    const response = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: CONTENT_PATH,
    });

    if (Array.isArray(response.data)) {
      return response.data
        .filter((file) => file.name.endsWith('.md'))
        .map((file) => ({
          name: file.name,
          path: file.path,
          sha: file.sha,
        }));
    }
    return [];
  } catch (error) {
    console.error('Error listing articles:', error);
    return [];
  }
}
