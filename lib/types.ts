

export type UserRole = 'student' | 'instructor' | 'admin';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  role: UserRole;
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
};

export type Question = {
  id: string;
  type: 'mcq' | 'text';
  content: string;
  options?: string[];
  correctAnswer?: string;
  maxScore: number;
  quizId: string;
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
};

export type GradedAnswer = StudentAnswer & {
    isCorrect: boolean;
    score: number;
    justification: string;
};

export type GradeSubmissionOutput = {
  gradedAnswers: GradedAnswer[];
  finalScore: number;
};


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
    partEarned?: string; // For gamification
};
