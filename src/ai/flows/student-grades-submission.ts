'use server';
/**
 * @fileOverview AI flow for grading a student's entire quiz submission.
 *
 * - gradeSubmission - A function that evaluates a submission and returns scores.
 * - GradeSubmissionInput - The input type for the gradeSubmission function.
 * - GradeSubmissionOutput - The return type for the gradeSubmission function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StudentAnswerSchema = z.object({
  questionId: z.string(),
  questionContent: z.string(),
  answer: z.string().or(z.array(z.string())),
  correctAnswer: z.string().optional(),
  timeTaken: z.number().describe('Time in seconds to answer the question.'),
});

const GradeSubmissionInputSchema = z.object({
  answers: z.array(StudentAnswerSchema),
});
export type GradeSubmissionInput = z.infer<typeof GradeSubmissionInputSchema>;

const GradedAnswerSchema = StudentAnswerSchema.extend({
    isCorrect: z.boolean(),
    score: z.number().min(0).max(10).describe("Final score for the question out of 10, considering accuracy and time."),
    justification: z.string().describe("A brief explanation for the score given.")
});

const GradeSubmissionOutputSchema = z.object({
  gradedAnswers: z.array(GradedAnswerSchema),
  finalScore: z.number().describe("The total score for the entire submission."),
});
export type GradeSubmissionOutput = z.infer<typeof GradeSubmissionOutputSchema>;

export async function gradeSubmission(input: GradeSubmissionInput): Promise<GradeSubmissionOutput> {
  return gradeSubmissionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gradeSubmissionPrompt',
  input: { schema: GradeSubmissionInputSchema },
  output: { schema: GradeSubmissionOutputSchema },
  prompt: `You are an expert AI grading assistant. Your task is to evaluate a student's quiz submission and provide a score for each question.

The scoring for each question is out of 10 and must factor in both accuracy and time taken.
- A perfect, quick answer should receive 10.
- A correct but very slow answer should receive a slightly lower score (e.g., 8 or 9).
- An incorrect answer must receive 0.
- For text questions, award partial credit based on how well the student's answer matches the reference 'correctAnswer'.

For each question in the input, you MUST evaluate it and return a corresponding object in the 'gradedAnswers' array with 'isCorrect', 'score', and a 'justification'.

Finally, calculate the 'finalScore' by summing up the scores of all individual questions.

### STUDENT SUBMISSION ###
{{#each answers}}
---
Question: {{{questionContent}}}
Student Answer: {{{answer}}}
Reference Answer: {{{correctAnswer}}}
Time Taken: {{{timeTaken}}} seconds
---
{{/each}}
### END SUBMISSION ###

Provide the entire output as a single, valid JSON object that strictly follows the output schema.
`,
});

const gradeSubmissionFlow = ai.defineFlow(
  {
    name: 'gradeSubmissionFlow',
    inputSchema: GradeSubmissionInputSchema,
    outputSchema: GradeSubmissionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
