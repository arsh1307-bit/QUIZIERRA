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

const EducationalLevelSchema = z.enum([
  'middle_school',
  'high_school', 
  'junior_college',
  'diploma',
  'graduation',
  'post_graduation'
]).optional();

const GenerateQuizInputSchema = z.object({
  context: z.string().describe('The topic, long-form text, or OCR content from which to generate the quiz.'),
  numMcq: z.coerce.number().min(0).max(20),
  numText: z.coerce.number().min(0).max(20),
  educationalLevel: EducationalLevelSchema.describe('The educational level of the target students (e.g., middle_school, high_school, graduation).'),
  educationalYear: z.string().optional().describe('The specific grade or year (e.g., "9" for Grade 9, "2" for 2nd Year).'),
  isAdaptive: z.boolean().optional().default(false).describe('Whether to generate adaptive questions (3x questions with different difficulties for each requested question).'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const questionSchema = z.object({
  id: z.string().describe("A unique identifier for the question, which you MUST generate (e.g., using a UUID)."),
  type: z.enum(['mcq', 'text']),
  content: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional().describe("For MCQs, this is a suggestion for the human instructor to approve. For text questions, this is a reference answer."),
  maxScore: z.number().default(10),
  difficulty: z.enum(['beginner', 'intermediate', 'hard']).describe('The difficulty level of the question - REQUIRED for adaptive quizzes.'),
  groupId: z.string().optional().describe('For adaptive quizzes: groups questions together (all difficulty variants of same question share this ID).'),
  groupIndex: z.number().optional().describe('For adaptive quizzes: which question group this belongs to (0, 1, 2...).'),
});

const GenerateQuizOutputSchema = z.object({
  title: z.string().describe("A suitable title for the quiz based on the provided context."),
  questions: z.array(questionSchema).describe('The array of generated questions.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

// Helper to get educational level description for prompt
function getEducationalLevelDescription(level?: string, year?: string): string {
  if (!level) return '';
  
  const levelDescriptions: Record<string, string> = {
    'middle_school': `Middle School students (Grades 6-8). Questions should use simple vocabulary, focus on basic concepts, and avoid complex terminology. Keep questions straightforward and concise.`,
    'high_school': `High School students (Grades 9-12). Questions can include moderate complexity, introduce subject-specific terminology, and require some analytical thinking. ${year ? `Specifically for Grade ${year}.` : ''}`,
    'junior_college': `Junior College students (11th-12th Standard). Questions should bridge high school and college-level thinking, include application-based problems, and moderate depth of analysis.`,
    'diploma': `Diploma students. Questions should be practical and application-oriented, focusing on real-world scenarios and technical concepts. ${year ? `Specifically for ${year === '1' ? '1st' : year === '2' ? '2nd' : '3rd'} Year.` : ''}`,
    'graduation': `Undergraduate/Graduation students. Questions should require critical thinking, deeper conceptual understanding, and may include complex analysis or synthesis of ideas. ${year ? `Specifically for ${year === '1' ? '1st' : year === '2' ? '2nd' : year === '3' ? '3rd' : '4th'} Year.` : ''}`,
    'post_graduation': `Post-Graduate students (Master's/PhD level). Questions should be at an advanced academic level, requiring sophisticated analysis, research-level thinking, and expert-level understanding. ${year === 'phd' ? 'Specifically for PhD-level depth.' : year ? `Specifically for ${year === '1' ? '1st' : '2nd'} Year Master's.` : ''}`,
  };
  
  return levelDescriptions[level] || '';
}

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are an expert quiz author. Your task is to generate a quiz based *ONLY* on the context provided below. Do not use any external knowledge. The questions should be derived *from* the content, not *about* the content.

{{#if isAdaptive}}
### ADAPTIVE QUIZ MODE ###
Generate questions in GROUPS. For each requested question, you must create 3 variants at different difficulty levels:
- BEGINNER: Easy, straightforward question testing basic recall
- INTERMEDIATE: Moderate complexity, requires understanding
- HARD: Challenging, requires analysis or synthesis

For {{numMcq}} MCQ questions requested, generate {{numMcq}} GROUPS (total {{numMcq}} x 3 = MCQ questions).
For {{numText}} text questions requested, generate {{numText}} GROUPS (total {{numText}} x 3 = text questions).

IMPORTANT: Each group MUST have:
1. Same 'groupId' for all 3 variants (e.g., "group-1" for Q1_beginner, Q1_intermediate, Q1_hard)
2. Same 'groupIndex' number (0 for first group, 1 for second, etc.)
3. Different 'difficulty' values: 'beginner', 'intermediate', 'hard'
4. Questions should test the SAME concept but at different depths

Example structure for 2 MCQ groups:
- Group 0 (groupId: "mcq-group-0", groupIndex: 0): 3 MCQs (beginner, intermediate, hard) about Topic A
- Group 1 (groupId: "mcq-group-1", groupIndex: 1): 3 MCQs (beginner, intermediate, hard) about Topic B

Scoring for adaptive mode:
- Beginner questions: maxScore = 10
- Intermediate questions: maxScore = 15
- Hard questions: maxScore = 20

### END ADAPTIVE MODE ###
{{else}}
Generate exactly {{numMcq}} MCQ questions and {{numText}} text-based questions.
For each question, set 'difficulty' to 'intermediate' as default.
{{/if}}

{{#if educationalLevel}}
### IMPORTANT: EDUCATIONAL LEVEL GUIDELINES ###
You MUST tailor the quiz difficulty, vocabulary, and depth to the target educational level:

Target Audience: {{educationalLevel}}{{#if educationalYear}} (Year/Grade: {{educationalYear}}){{/if}}

Guidelines:
- For MIDDLE SCHOOL: Use simple language, basic concepts, short questions. Avoid jargon. Focus on recall and basic understanding.
- For HIGH SCHOOL: Moderate complexity, introduce terminology, include some application questions. Mix of easy and medium difficulty.
- For JUNIOR COLLEGE: Bridge to advanced concepts, application-based questions, moderate analytical depth.
- For DIPLOMA: Practical, real-world focused, technical but accessible. Industry-relevant questions.
- For GRADUATION: Critical thinking, conceptual depth, analysis and synthesis required. Include challenging questions.
- For POST GRADUATION: Advanced academic level, research-oriented, sophisticated analysis, expert-level expectations.

Adjust:
1. VOCABULARY: Match the reading level of the target audience
2. QUESTION DEPTH: Simpler recall for younger students, deeper analysis for advanced levels
3. ANSWER COMPLEXITY: Shorter, simpler answers for lower levels; detailed, nuanced answers for higher levels
4. CONCEPTS: Focus on foundational concepts for lower levels; advanced/specialized concepts for higher levels
### END EDUCATIONAL GUIDELINES ###
{{/if}}

For each question, you must generate a unique 'id' field and include a 'difficulty' field (beginner/intermediate/hard).

For each MCQ, provide 4 distinct options. Critically, you MUST suggest one of the options as the 'correctAnswer'. This is just a suggestion for the human instructor to approve.

For each text-based question, provide a concise reference answer for the 'correctAnswer' field that an instructor can use for grading. The reference answer depth should match the educational level.

Return the entire quiz as a single, valid JSON object that strictly follows the output schema.

### CONTEXT TO USE ###
{{{context}}}
### END CONTEXT ###
`,
});

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
        // Ensure groupId is set for adaptive questions
        groupId: q.groupId || (input.isAdaptive ? `group-${q.groupIndex ?? 0}` : undefined),
      }));
    }

    return output!;
  }
);
