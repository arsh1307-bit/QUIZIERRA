import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DifficultySchema = z.object({
  label: z.enum(['easy', 'medium', 'hard']),
  confidence: z.number().min(0).max(1),
});

export type DifficultyResult = z.infer<typeof DifficultySchema>;

export const predictDifficulty = ai.definePrompt(
  {
    name: 'predictDifficulty',
    model: 'googleai/gemini-1.5-flash',
    output: {
      schema: DifficultySchema,
    },
    config: {
      temperature: 0,
    },
  },
  `
You are an expert educational assessment system.

Classify the difficulty of the following question:

Difficulty levels:
- easy: factual recall, definitions, single-step
- medium: multi-step reasoning, multiple concepts
- hard: abstract reasoning, algorithms, proofs, advanced math or CS

Return a confidence score between 0 and 1.

Question:
{{text}}
`
);
