'use server';

/**
 * @fileOverview This file defines a Genkit flow for categorizing articles into 'physical health', 'mental health', or 'family finance'.
 *
 * - categorizeArticle - A function that takes article content as input and returns the determined category.
 * - CategorizeArticleInput - The input type for the categorizeArticle function.
 * - CategorizeArticleOutput - The return type for the categorizeArticle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeArticleInputSchema = z.object({
  articleContent: z
    .string()
    .describe('The content of the article to be categorized.'),
});
export type CategorizeArticleInput = z.infer<typeof CategorizeArticleInputSchema>;

const CategorizeArticleOutputSchema = z.object({
  category: z
    .enum(['physical health', 'mental health', 'family finance'])
    .describe('The category the article belongs to.'),
});
export type CategorizeArticleOutput = z.infer<typeof CategorizeArticleOutputSchema>;

export async function categorizeArticle(input: CategorizeArticleInput): Promise<CategorizeArticleOutput> {
  return categorizeArticleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeArticlePrompt',
  input: {schema: CategorizeArticleInputSchema},
  output: {schema: CategorizeArticleOutputSchema},
  prompt: `You are an expert content categorizer. Given the following article content, determine whether it falls into the category of 'physical health', 'mental health', or 'family finance'.

Article Content: {{{articleContent}}}

Category:`,
});

const categorizeArticleFlow = ai.defineFlow(
  {
    name: 'categorizeArticleFlow',
    inputSchema: CategorizeArticleInputSchema,
    outputSchema: CategorizeArticleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
