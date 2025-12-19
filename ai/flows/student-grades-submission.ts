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

const EducationalLevelSchema = z.enum([
  'middle_school',
  'high_school', 
  'junior_college',
  'diploma',
  'graduation',
  'post_graduation'
]).optional();

const StudentAnswerSchema = z.object({
  questionId: z.string(),
  questionContent: z.string(),
  answer: z.string().or(z.array(z.string())),
  correctAnswer: z.string().optional(),
  timeTaken: z.number().describe('Time in seconds to answer the question.'),
});

const GradeSubmissionInputSchema = z.object({
  answers: z.array(StudentAnswerSchema),
  educationalLevel: EducationalLevelSchema.describe('The educational level of the student being graded.'),
  educationalYear: z.string().optional().describe('The specific grade or year of the student.'),
});
export type GradeSubmissionInput = z.infer<typeof GradeSubmissionInputSchema>;

const GradedAnswerSchema = StudentAnswerSchema.extend({
    isCorrect: z.boolean(),
    score: z.number().min(0).max(10).describe("Final score for the question out of 10, considering accuracy and time."),
    justification: z.string().describe("A brief explanation for the score given, appropriate for the student's educational level.")
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

{{#if educationalLevel}}
### IMPORTANT: EDUCATIONAL LEVEL CONTEXT ###
The student is at the following educational level: {{educationalLevel}}{{#if educationalYear}} (Year/Grade: {{educationalYear}}){{/if}}

You MUST adjust your grading expectations based on this level:

**For MIDDLE SCHOOL students:**
- Be lenient with vocabulary and phrasing
- Accept simpler explanations that show basic understanding
- Focus on whether the core concept is understood
- Don't penalize for lack of technical terminology
- Partial credit for showing effort and basic comprehension

**For HIGH SCHOOL students:**
- Expect moderate use of subject terminology
- Require clearer explanations with some depth
- Partial credit for demonstrating understanding even if answer is incomplete
- Balance between accuracy and age-appropriate expectations

**For JUNIOR COLLEGE students:**
- Expect application of concepts
- Require proper use of terminology
- Look for logical reasoning in answers
- Moderate expectations for analytical depth

**For DIPLOMA students:**
- Expect practical, real-world understanding
- Focus on applied knowledge
- Look for industry-relevant explanations
- Value technical accuracy

**For GRADUATION (Undergraduate) students:**
- Expect comprehensive understanding
- Require proper academic terminology
- Look for critical thinking and analysis
- Higher standards for completeness and accuracy

**For POST GRADUATION students:**
- Expect expert-level responses
- Require sophisticated analysis and synthesis
- Look for research-level thinking
- Highest standards for depth, accuracy, and nuance
- Minimal tolerance for superficial answers

### END EDUCATIONAL CONTEXT ###
{{/if}}

The scoring for each question is out of 10 and must factor in accuracy, time taken, AND educational level expectations:
- A perfect answer (appropriate for the student's level) with quick response should receive 10.
- A correct but very slow answer should receive a slightly lower score (e.g., 8 or 9).
- An incorrect answer must receive 0.
- For text questions, award partial credit based on:
  1. How well the student's answer matches the reference 'correctAnswer'
  2. Whether the depth and quality of answer is appropriate for their educational level
  3. Demonstration of understanding at their level (not above or below expectations)

For justifications:
- Use language appropriate for the student's educational level
- Be encouraging for younger students while still being accurate
- Be more direct and academic for advanced students

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
