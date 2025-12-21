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

const DifficultyLevelSchema = z.enum(['beginner', 'intermediate', 'hard']).optional();

const StudentAnswerSchema = z.object({
  questionId: z.string(),
  questionContent: z.string(),
  answer: z.string().or(z.array(z.string())),
  correctAnswer: z.string().optional(),
  timeTaken: z.number().describe('Time in seconds to answer the question.'),
  difficulty: DifficultyLevelSchema.describe('The difficulty level of the question (for adaptive quizzes).'),
  groupIndex: z.number().optional().describe('The question group index (for adaptive quizzes).'),
});

const GradeSubmissionInputSchema = z.object({
  answers: z.array(StudentAnswerSchema),
  educationalLevel: EducationalLevelSchema.describe('The educational level of the student being graded.'),
  educationalYear: z.string().optional().describe('The specific grade or year of the student.'),
  isAdaptive: z.boolean().optional().default(false).describe('Whether this is an adaptive quiz submission.'),
});
export type GradeSubmissionInput = z.infer<typeof GradeSubmissionInputSchema>;

const GradedAnswerSchema = StudentAnswerSchema.extend({
    isCorrect: z.boolean(),
    score: z.number().min(0).describe("Final score/coins for the question. BINARY SCORING: Correct = full points (beginner=10, intermediate=15, hard=20), Wrong = 0. No partial credit for MCQs."),
    justification: z.string().describe("A brief explanation for the score given, appropriate for the student's educational level."),
    normalizedScore: z.number().optional().describe("For adaptive quizzes: the normalized score contribution (all questions contribute equally to final score)."),
    coinsEarned: z.number().optional().describe("Universal coins earned (same as score for correct answers, 0 for wrong)."),
});

const GradeSubmissionOutputSchema = z.object({
  gradedAnswers: z.array(GradedAnswerSchema),
  finalScore: z.number().describe("The total score for the entire submission."),
  maxPossibleScore: z.number().optional().describe("For adaptive quizzes: the maximum possible score based on the path taken."),
  normalizedFinalScore: z.number().optional().describe("For adaptive quizzes: the normalized final score (percentage-based)."),
  totalCoinsEarned: z.number().optional().describe("Total universal coins earned from this quiz."),
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

### BINARY SCORING RULES (IMPORTANT) ###
For MCQ questions, scoring is STRICTLY BINARY:
- CORRECT answer = FULL points (10 for standard, or difficulty-based: beginner=10, intermediate=15, hard=20)
- WRONG answer = 0 points (NO partial credit, NO middle ground)

For text questions ONLY (not MCQ), you may award partial credit based on:
1. How well the student's answer matches the reference 'correctAnswer'
2. Whether the depth and quality is appropriate for their educational level
3. Demonstration of understanding at their level

MCQ evaluation must be EXACT MATCH or WRONG. There is nothing in between.

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

// Universal coins per difficulty level (same as score)
const DIFFICULTY_COINS: Record<string, number> = {
  beginner: 10,      // Beginner badge = 10 coins
  intermediate: 15,  // Intermediate badge = 15 coins
  hard: 20,          // Hard badge = 20 coins
};

// Score multipliers for adaptive quiz difficulties
const ADAPTIVE_SCORE_MULTIPLIERS: Record<string, number> = {
  beginner: 1,      // Base score (10 points max)
  intermediate: 1.5, // 50% bonus (15 points max)
  hard: 2,          // 100% bonus (20 points max)
};

// Each question group contributes equally to final normalized score
const NORMALIZED_GROUP_MAX_SCORE = 10;

const gradeSubmissionFlow = ai.defineFlow(
  {
    name: 'gradeSubmissionFlow',
    inputSchema: GradeSubmissionInputSchema,
    outputSchema: GradeSubmissionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    if (!output) return output!;
    
    // Apply adaptive scoring with binary grading and universal coins
    if (input.isAdaptive) {
      const numQuestions = output.gradedAnswers.length;
      let totalScore = 0;
      let maxPossibleScore = 0;
      let totalCoinsEarned = 0;
      
      output.gradedAnswers = output.gradedAnswers.map((answer, idx) => {
        const difficulty = input.answers[idx]?.difficulty || 'intermediate';
        const coinsForDifficulty = DIFFICULTY_COINS[difficulty] || 10;
        
        // BINARY SCORING: Correct = full coins, Wrong = 0
        const isCorrect = answer.isCorrect === true;
        const earnedCoins = isCorrect ? coinsForDifficulty : 0;
        
        // Calculate normalized score (each question contributes equally when normalized)
        const normalizedScore = isCorrect ? NORMALIZED_GROUP_MAX_SCORE : 0;
        
        totalScore += earnedCoins;
        maxPossibleScore += coinsForDifficulty;
        totalCoinsEarned += earnedCoins;
        
        return {
          ...answer,
          isCorrect,
          score: earnedCoins,
          coinsEarned: earnedCoins,
          normalizedScore: Math.round(normalizedScore * 10) / 10,
        };
      });
      
      // Calculate normalized final score (percentage-based for consistent comparison)
      const normalizedFinalScore = numQuestions > 0 
        ? Math.round((totalScore / maxPossibleScore) * 100)
        : 0;
      
      return {
        ...output,
        finalScore: totalScore,
        maxPossibleScore,
        normalizedFinalScore,
        totalCoinsEarned,
      };
    }
    
    // Standard quiz scoring
    let totalCoinsEarned = 0;
    output.gradedAnswers = output.gradedAnswers.map((answer) => {
      const earnedCoins = answer.isCorrect ? answer.score : 0;
      totalCoinsEarned += earnedCoins;
      return {
        ...answer,
        coinsEarned: earnedCoins,
      };
    });
    
    return {
      ...output,
      totalCoinsEarned,
    };
  }
);
