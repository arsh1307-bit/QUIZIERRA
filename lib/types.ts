

export type UserRole = 'student' | 'instructor' | 'admin';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  role: UserRole;
<<<<<<< HEAD
=======
  // Teacher-specific fields
  institution?: string;
  subjects?: string[];
  teacherId?: string;
  classes?: string[]; // Array of class IDs
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
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
<<<<<<< HEAD
=======

export type UploadedMaterial = {
    id: string;
    userId: string;
    fileName: string;
    fileType: string;
    subject?: string; // Auto-detected or user-editable
    uploadedAt: string;
    quizCompleted?: number; // Percentage of quiz completed
    quizId?: string; // Reference to generated quiz
    previewText?: string; // First 10k chars for UI display
    fullTextStorage?: string; // Full text (or reference to cloud storage)
    materialStatus?: 'uploaded' | 'answersReviewed' | 'quizGenerated' | 'quizCompleted';
    keyAnswers?: Array<{
        id: string;
        topic: string;
        explanation: string;
        status?: 'approved' | 'flagged'; // Student's review decision
        sourceSnippet?: string;
    }>;
    linkedQuizzes?: string[]; // Multiple quizzes from same material
};

export type UserPreferences = {
    userId: string;
    defaultDifficulty?: 'easy' | 'medium' | 'hard';
    defaultQuizLength?: number;
    class?: string;
    subject?: string;
    goal?: 'exam' | 'revision' | 'concept_clarity';
    onboardingCompleted?: boolean;
};

export type Class = {
    id: string;
    name: string;
    subject: string;
    academicYear?: string;
    section?: string;
    createdBy: string; // Teacher ID
    createdAt: string;
    classCode: string; // Auto-generated 6-8 char code
    enrolledStudentIds: string[];
    assignedQuizIds: string[];
    isArchived?: boolean;
};

export type QuizAssignment = {
    id: string;
    quizId: string;
    classId?: string; // If assigned to class
    studentIds?: string[]; // If assigned to specific students
    assignedBy: string; // Teacher ID
    assignedAt: string;
    startDate?: string;
    dueDate?: string;
    allowLateSubmission?: boolean;
    shuffleQuestions?: boolean;
    maxAttempts?: number;
    timeLimit?: number; // in minutes
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
};

export type TeacherMaterial = {
    id: string;
    teacherId: string;
    fileName: string;
    fileType: string;
    subject: string;
    topicTags?: string[];
    visibility: 'private' | 'class' | 'all';
    classIds?: string[]; // If visibility is 'class'
    uploadedAt: string;
    keyAnswers?: Array<{
        id: string;
        topic: string;
        explanation: string;
        sourceSnippet?: string;
        teacherEdited?: boolean; // If teacher modified AI explanation
    }>;
    linkedQuizzes?: string[];
};

export type ConceptInsight = {
    topic: string;
    accuracy: number;
    totalAttempts: number;
    correctAttempts: number;
    status: 'strong' | 'weak' | 'critical';
    studentIds: string[]; // Students struggling with this topic
};

export type QuizAnalytics = {
    quizId: string;
    quizTitle: string;
    averageScore: number;
    medianScore: number;
    completionRate: number;
    totalStudents: number;
    completedStudents: number;
    mostSkippedQuestion?: string;
    mostIncorrectQuestion?: string;
    conceptInsights: ConceptInsight[];
    studentPerformance: Array<{
        studentId: string;
        studentName: string;
        score: number;
        accuracy: number;
        timeTaken: number;
        weakTopics: string[];
    }>;
};

export type StudentProgress = {
    studentId: string;
    studentName: string;
    email: string;
    quizHistory: Array<{
        quizId: string;
        quizTitle: string;
        score: number;
        accuracy: number;
        completedAt: string;
        timeTaken: number;
    }>;
    accuracyTrend: Array<{ date: string; accuracy: number }>;
    weakTopics: string[];
    strongTopics: string[];
    avgTimePerQuestion: number;
    improvementRate: number; // Percentage improvement over time
};

export type Feedback = {
    id: string;
    fromUserId: string; // Teacher ID
    toUserId: string; // Student ID
    quizId?: string;
    attemptId?: string;
    type: 'comment' | 'encouragement' | 'correction' | 'announcement';
    content: string;
    createdAt: string;
    isRead?: boolean;
};
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
