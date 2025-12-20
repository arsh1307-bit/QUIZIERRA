

export type UserRole = 'student' | 'instructor' | 'admin';

export type EducationalLevel = 
  | 'middle_school' 
  | 'high_school' 
  | 'junior_college' 
  | 'diploma' 
  | 'graduation' 
  | 'post_graduation';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  role: UserRole;
  // Educational preferences (for students)
  educationalLevel?: EducationalLevel;
  educationalYear?: string; // Grade for school, Year for college/diploma
};

export type Quiz = {
  id:string;
  title: string;
  description: string;
  // This is no longer the primary source of truth for an exam's questions,
  // but can be used for reference or for managing the canonical quiz.
  questionIds?: string[];
  createdBy: string;
  createdAt: string;
  isAdaptive?: boolean; // Whether this quiz uses adaptive question flow
};

export type DifficultyLevel = 'beginner' | 'intermediate' | 'hard';

export type Question = {
  id: string;
  type: 'mcq' | 'text';
  content: string;
  options?: string[];
  correctAnswer?: string;
  maxScore: number;
  quizId: string;
  // Adaptive quiz fields
  difficulty?: DifficultyLevel;
  groupId?: string; // Groups questions together (Q1_a, Q1_b, Q1_c share same groupId)
  groupIndex?: number; // Which question group this belongs to (0, 1, 2...)
};


export type Exam = {
    id: string;
    quizId: string;
    quizTitle: string;
    scheduledTime: string;
    status: 'Scheduled' | 'Live Now' | 'Completed' | 'Cancelled';
    enrolledStudentIds: string[];
    accessCode: string;
    createdBy: string;
    createdAt: string;
};

export type StudentAnswer = {
    questionId: string;
    questionContent: string;
    answer: string | string[];
    correctAnswer?: string;
    timeTaken: number; // in seconds
    difficulty?: DifficultyLevel; // Track what difficulty was answered
    groupIndex?: number; // Track which group this answer belongs to
};

export type GradedAnswer = StudentAnswer & {
    isCorrect: boolean;
    score: number;
    justification: string;
};

export type GradeSubmissionOutput = {
  gradedAnswers: GradedAnswer[];
  finalScore: number;
  maxPossibleScore?: number;
  normalizedFinalScore?: number;
};

// Adaptive quiz scoring configuration
export const ADAPTIVE_SCORE_MULTIPLIERS: Record<DifficultyLevel, number> = {
  beginner: 1,      // Base score
  intermediate: 1.5, // 50% bonus
  hard: 2,          // 100% bonus (double)
};

// For normalized scoring - each question group contributes equal max score
export const NORMALIZED_GROUP_MAX_SCORE = 10;


export type Attempt = {
    id: string;
    examId: string;
    studentId: string;
    answers: StudentAnswer[];
    gradedAnswers?: GradedAnswer[];
    score: number;
    totalQuestions: number;
    status: 'In Progress' | 'Completed' | 'Pending Grading';
    startedAt: string;
    completedAt?: string;
    examTitle?: string; // Denormalized for easy display
    partEarned?: string; // For gamification (old system)
    isAdaptive?: boolean; // Whether this was an adaptive quiz attempt
    adaptivePath?: DifficultyLevel[]; // Track the difficulty path taken
    racingReward?: { partType: string; coins: number }; // Racing game coins reward
};
