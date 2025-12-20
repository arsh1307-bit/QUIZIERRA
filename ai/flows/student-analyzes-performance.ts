'use server';
/**
 * @fileOverview A flow to analyze student performance and identify strengths/weaknesses.
 *
 * - analyzeStudentPerformance - A function that takes student attempt data and returns AI-analyzed insights.
 * - AnalyzeStudentPerformanceInput - The input type for the function.
 * - AnalyzeStudentPerformanceOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QuestionAttemptSchema = z.object({
  questionContent: z.string().describe('The full text of the question'),
  isCorrect: z.boolean().describe('Whether the student answered correctly'),
  studentAnswer: z.string().describe('The answer the student provided'),
  correctAnswer: z.string().optional().describe('The correct answer if available'),
  timeTaken: z.number().describe('Time taken to answer in seconds'),
});

const AnalyzeStudentPerformanceInputSchema = z.object({
  totalAttempts: z.number().describe('Total number of quiz attempts'),
  totalQuestions: z.number().describe('Total questions answered'),
  overallAccuracy: z.number().describe('Overall accuracy percentage'),
  avgTimePerQuestion: z.number().describe('Average time per question in seconds'),
  questionAttempts: z.array(QuestionAttemptSchema).describe('Individual question attempts with details'),
});
export type AnalyzeStudentPerformanceInput = z.infer<typeof AnalyzeStudentPerformanceInputSchema>;

const StrengthWeaknessSchema = z.object({
  topic: z.string().describe('The topic or concept area'),
  description: z.string().describe('Detailed explanation of why this is a strength or weakness'),
  relatedQuestions: z.array(z.string()).describe('Example questions related to this area'),
});

const AnalyzeStudentPerformanceOutputSchema = z.object({
  strengths: z.array(StrengthWeaknessSchema).describe('List of student strengths with detailed analysis'),
  weaknesses: z.array(StrengthWeaknessSchema).describe('List of areas needing improvement with detailed analysis'),
  overallAssessment: z.string().describe('A brief overall assessment of the student performance'),
  recommendations: z.array(z.string()).describe('Specific recommendations for improvement'),
});
export type AnalyzeStudentPerformanceOutput = z.infer<typeof AnalyzeStudentPerformanceOutputSchema>;

export async function analyzeStudentPerformance(input: AnalyzeStudentPerformanceInput): Promise<AnalyzeStudentPerformanceOutput> {
  return analyzeStudentPerformanceFlow(input);
}

const analyzeStudentPerformancePrompt = ai.definePrompt({
  name: 'analyzeStudentPerformancePrompt',
  input: {schema: AnalyzeStudentPerformanceInputSchema},
  output: {schema: AnalyzeStudentPerformanceOutputSchema},
  prompt: `You are an expert educational analyst helping students understand their learning progress.

Analyze the following student performance data and identify their strengths and weaknesses.

## Performance Overview:
- Total Quiz Attempts: {{{totalAttempts}}}
- Total Questions Answered: {{{totalQuestions}}}
- Overall Accuracy: {{{overallAccuracy}}}%
- Average Time per Question: {{{avgTimePerQuestion}}} seconds

## Question-by-Question Analysis:
{{#each questionAttempts}}
---
Question: "{{{questionContent}}}"
Student Answer: "{{{studentAnswer}}}"
{{#if correctAnswer}}Correct Answer: "{{{correctAnswer}}}"{{/if}}
Result: {{#if isCorrect}}✓ Correct{{else}}✗ Incorrect{{/if}}
Time Taken: {{{timeTaken}}} seconds
{{/each}}

Based on this data, provide:

1. **Strengths**: Identify 2-5 topic areas or concepts where the student performs well. Group similar correct answers into conceptual themes. For each strength, explain WHY it's a strength and list related questions.

2. **Weaknesses**: Identify 2-5 topic areas or concepts where the student needs improvement. Group similar incorrect answers into conceptual themes. For each weakness, explain WHY it's a weakness and what misconceptions might be present, along with related questions.

3. **Overall Assessment**: A 2-3 sentence summary of the student's overall performance.

4. **Recommendations**: 3-5 specific, actionable recommendations for how the student can improve.

Be specific and reference actual question content. Don't just say "needs more practice" - explain what concepts need work and why.`,
});

const analyzeStudentPerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeStudentPerformanceFlow',
    inputSchema: AnalyzeStudentPerformanceInputSchema,
    outputSchema: AnalyzeStudentPerformanceOutputSchema,
  },
  async input => {
    const {output} = await analyzeStudentPerformancePrompt(input);
    return output!;
  }
);
