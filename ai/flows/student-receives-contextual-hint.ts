'use server';
/**
 * @fileOverview Provides a relevant hint for a question to the student.
 *
 * - getHint - A function that retrieves a hint for a question.
 * - GetHintInput - The input type for the getHint function.
 * - GetHintOutput - The return type for the getHint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetHintInputSchema = z.object({
  questionText: z.string().describe('The text of the question.'),
  studentAnswer: z.string().optional().describe('The student\'s current answer, if any.'),
  topic: z.string().optional().describe('The topic of the question.'),
});
export type GetHintInput = z.infer<typeof GetHintInputSchema>;

const GetHintOutputSchema = z.object({
  hint: z.string().describe('A helpful hint for the question.'),
});
export type GetHintOutput = z.infer<typeof GetHintOutputSchema>;

export async function getHint(input: GetHintInput): Promise<GetHintOutput> {
  return getHintFlow(input);
}

const hintPrompt = ai.definePrompt({
  name: 'hintPrompt',
  input: {schema: GetHintInputSchema},
  output: {schema: GetHintOutputSchema},
  prompt: `You are an expert tutor helping a student with a quiz.

  The student is stuck on the following question:
  {{questionText}}

  Topic: {{topic}}

  {{#if studentAnswer}}The student has provided the following answer:
  {{studentAnswer}}{{/if}}

  Provide a hint to help the student understand the concept and arrive at the correct answer.
  The hint should not directly give away the answer, but rather guide the student
  towards it.  Focus on clarifying the underlying concepts involved in the question.
`,
});

const getHintFlow = ai.defineFlow(
  {
    name: 'getHintFlow',
    inputSchema: GetHintInputSchema,
    outputSchema: GetHintOutputSchema,
  },
  async input => {
    // Add input validation or transformation here if needed
    const {output} = await hintPrompt(input);
    return output!;
  }
);
