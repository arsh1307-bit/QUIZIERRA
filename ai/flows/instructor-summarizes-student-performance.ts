'use server';
/**
 * @fileOverview A flow to summarize student performance for instructors.
 *
 * - summarizeStudentPerformance - A function that takes student data and returns a summary of their performance.
 * - SummarizeStudentPerformanceInput - The input type for the summarizeStudentPerformance function.
 * - SummarizeStudentPerformanceOutput - The return type for the summarizeStudentPerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeStudentPerformanceInputSchema = z.object({
  studentId: z.string().describe('The ID of the student.'),
  examId: z.string().describe('The ID of the exam.'),
  answers: z.array(z.object({
    questionId: z.string(),
    isCorrect: z.boolean(),
  })).describe('The student answers for the exam.'),
});
export type SummarizeStudentPerformanceInput = z.infer<typeof SummarizeStudentPerformanceInputSchema>;

const SummarizeStudentPerformanceOutputSchema = z.object({
  summary: z.string().describe('A summary of the student performance.'),
});
export type SummarizeStudentPerformanceOutput = z.infer<typeof SummarizeStudentPerformanceOutputSchema>;

export async function summarizeStudentPerformance(input: SummarizeStudentPerformanceInput): Promise<SummarizeStudentPerformanceOutput> {
  return summarizeStudentPerformanceFlow(input);
}

const summarizeStudentPerformancePrompt = ai.definePrompt({
  name: 'summarizeStudentPerformancePrompt',
  input: {schema: SummarizeStudentPerformanceInputSchema},
  output: {schema: SummarizeStudentPerformanceOutputSchema},
  prompt: `You are an expert instructor summarizing student performance on an exam.

  Student ID: {{{studentId}}}
  Exam ID: {{{examId}}}

  Based on the following answers, provide a summary of the student's strengths and weaknesses:

  {{#each answers}}
  Question ID: {{{questionId}}}, Is Correct: {{{isCorrect}}}
  {{/each}}
  `,
});

const summarizeStudentPerformanceFlow = ai.defineFlow(
  {
    name: 'summarizeStudentPerformanceFlow',
    inputSchema: SummarizeStudentPerformanceInputSchema,
    outputSchema: SummarizeStudentPerformanceOutputSchema,
  },
  async input => {
    const {output} = await summarizeStudentPerformancePrompt(input);
    return output!;
  }
);
