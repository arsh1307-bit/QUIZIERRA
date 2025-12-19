'use server';

/**
 * @fileOverview AI flow for generating a quiz based on a given topic, text, or document content.
 *
 * - generateQuiz - A function that generates a quiz.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { v4 as uuidv4 } from 'uuid';

const GenerateQuizInputSchema = z.object({
  context: z.string().describe('The topic, long-form text, or OCR content from which to generate the quiz.'),
  numMcq: z.coerce.number().min(0).max(20),
  numText: z.coerce.number().min(0).max(20),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const questionSchema = z.object({
  id: z.string().describe("A unique identifier for the question, which you MUST generate (e.g., using a UUID)."),
  type: z.enum(['mcq', 'text']),
  content: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional().describe("For MCQs, this is a suggestion for the human instructor to approve. For text questions, this is a reference answer."),
  maxScore: z.number().default(10),
});

const GenerateQuizOutputSchema = z.object({
  title: z.string().describe("A suitable title for the quiz based on the provided context."),
  questions: z.array(questionSchema).describe('The array of generated questions.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are an expert quiz author. Your task is to generate a quiz with a specific number of multiple-choice (MCQ) and text-based questions based *ONLY* on the context provided below. Do not use any external knowledge. The questions should be derived *from* the content, not *about* the content.

Generate exactly {{numMcq}} MCQ questions and {{numText}} text-based questions.

For each question, you must generate a unique 'id' field.

For each MCQ, provide 4 distinct options. Critically, you MUST suggest one of the options as the 'correctAnswer'. This is just a suggestion for the human instructor to approve.

For each text-based question, provide a concise reference answer for the 'correctAnswer' field that an instructor can use for grading.

Return the entire quiz as a single, valid JSON object that strictly follows the output schema.

### CONTEXT TO USE ###
{{{context}}}
### END CONTEXT ###
`,
});

// CORRECT ORDER: Define the flow before it is exported and used.
const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    // Ensure all questions have a unique ID, even if the model forgets.
    if (output) {
      output.questions = output.questions.map(q => ({
        ...q,
        id: q.id || uuidv4(),
      }));
    }

    return output!;
  }
);

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}
