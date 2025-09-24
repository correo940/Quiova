'use server';

/**
 * @fileOverview Este archivo define un flujo de Genkit para categorizar artículos en 'salud física', 'salud mental' o 'finanzas familiares'.
 *
 * - categorizeArticle - Una función que toma el contenido de un artículo como entrada y devuelve la categoría determinada.
 * - CategorizeArticleInput - El tipo de entrada para la función categorizeArticle.
 * - CategorizeArticleOutput - El tipo de retorno para la función categorizeArticle.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeArticleInputSchema = z.object({
  articleContent: z
    .string()
    .describe('El contenido del artículo a categorizar.'),
});
export type CategorizeArticleInput = z.infer<typeof CategorizeArticleInputSchema>;

const CategorizeArticleOutputSchema = z.object({
  category: z
    .enum(['salud física', 'salud mental', 'finanzas familiares'])
    .describe('La categoría a la que pertenece el artículo.'),
});
export type CategorizeArticleOutput = z.infer<typeof CategorizeArticleOutputSchema>;

export async function categorizeArticle(input: CategorizeArticleInput): Promise<CategorizeArticleOutput> {
  return categorizeArticleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeArticlePrompt',
  input: {schema: CategorizeArticleInputSchema},
  output: {schema: CategorizeArticleOutputSchema},
  prompt: `Eres un experto en categorización de contenido. Dado el siguiente contenido del artículo, determina si pertenece a la categoría de 'salud física', 'salud mental' o 'finanzas familiares'.

Contenido del Artículo: {{{articleContent}}}

Categoría:`,
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
