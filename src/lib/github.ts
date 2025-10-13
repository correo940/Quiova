import { Octokit } from 'octokit';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'correo940';
const REPO_NAME = 'Quiova';
const CONTENT_PATH = 'content/articles';

export const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

export async function getArticleContent(path: string) {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `${CONTENT_PATH}/${path}`,
    });

    if ('content' in response.data) {
      const content = Buffer.from(response.data.content, 'base64').toString();
      return content;
    }
    throw new Error('No content found');
  } catch (error) {
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

export async function listArticles() {
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