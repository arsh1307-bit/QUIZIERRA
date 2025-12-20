'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import type { Question, Exam, StudentAnswer, Attempt, DifficultyLevel } from '@/lib/types';
import { ADAPTIVE_SCORE_MULTIPLIERS, NORMALIZED_GROUP_MAX_SCORE } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, Minus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Difficulty badge colors and labels
const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  beginner: { 
    label: 'Beginner', 
    color: 'text-green-700 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    icon: <Minus className="h-3 w-3" />
  },
  intermediate: { 
    label: 'Intermediate', 
    color: 'text-yellow-700 dark:text-yellow-400', 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    icon: <TrendingUp className="h-3 w-3" />
  },
  hard: { 
    label: 'Hard', 
    color: 'text-red-700 dark:text-red-400', 
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
    icon: <TrendingUp className="h-3 w-3" />
  },
};

function ExamSkeleton() {
    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

// Group questions by groupId for adaptive quizzes
function groupQuestions(questions: Question[]): Map<string, Question[]> {
  const groups = new Map<string, Question[]>();
  for (const q of questions) {
    const groupId = q.groupId || q.id;
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(q);
  }
  const difficultyOrder: Record<DifficultyLevel, number> = { beginner: 0, intermediate: 1, hard: 2 };
  for (const [key, group] of groups) {
    group.sort((a, b) => {
      const aOrder = difficultyOrder[a.difficulty || 'intermediate'];
      const bOrder = difficultyOrder[b.difficulty || 'intermediate'];
      return aOrder - bOrder;
    });
  }
  return groups;
}

// Get the next difficulty based on whether answer was correct
function getNextDifficulty(currentDifficulty: DifficultyLevel, wasCorrect: boolean): DifficultyLevel {
  if (wasCorrect) {
    if (currentDifficulty === 'beginner') return 'intermediate';
    if (currentDifficulty === 'intermediate') return 'hard';
    return 'hard';
  } else {
    if (currentDifficulty === 'hard') return 'intermediate';
    if (currentDifficulty === 'intermediate') return 'beginner';
    return 'beginner';
  }
}

// Simple check if MCQ answer is correct
function checkMCQAnswer(answer: string, correctAnswer?: string): boolean {
  if (!correctAnswer) return false;
  return answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

export default function ExamPage() {
    const params = useParams();
    const examId = params.examId as string;
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    // Standard state
    const [answers, setAnswers] = useState<StudentAnswer[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState<string>('');
    const [startTime, setStartTime] = useState(Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Adaptive quiz state
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>('beginner');
    const [adaptivePath, setAdaptivePath] = useState<DifficultyLevel[]>([]);

    const questionsQuery = useMemoFirebase(() => {
        if (!firestore || !examId) return null;
        return collection(firestore, 'exams', examId, 'questions');
    }, [firestore, examId]);

    const examRef = useMemoFirebase(() => {
        if (!firestore || !examId) return null;
        return doc(firestore, 'exams', examId);
    }, [firestore, examId]);

    const { data: questions, isLoading: isLoadingQuestions } = useCollection<Question>(questionsQuery);
    const { data: exam, isLoading: isLoadingExam } = useDoc<Exam>(examRef);

    // Determine if this is an adaptive quiz
    const isAdaptiveQuiz = useMemo(() => {
      if (!questions || questions.length === 0) return false;
      return questions.some(q => q.groupId && q.difficulty);
    }, [questions]);

    // Group questions for adaptive mode
    const questionGroups = useMemo(() => {
      if (!questions || !isAdaptiveQuiz) return null;
      return groupQuestions(questions);
    }, [questions, isAdaptiveQuiz]);

    // Get ordered group IDs
    const groupIds = useMemo(() => {
      if (!questionGroups) return [];
      return Array.from(questionGroups.keys()).sort((a, b) => {
        const aGroup = questionGroups.get(a)?.[0];
        const bGroup = questionGroups.get(b)?.[0];
        return (aGroup?.groupIndex ?? 0) - (bGroup?.groupIndex ?? 0);
      });
    }, [questionGroups]);

    // Number of actual questions to answer (groups for adaptive, total for standard)
    const totalQuestionsToAnswer = isAdaptiveQuiz ? groupIds.length : (questions?.length || 0);

    // Get current question based on mode
    const currentQuestion = useMemo(() => {
      if (!questions || questions.length === 0) return null;
      
      if (isAdaptiveQuiz && questionGroups) {
        const currentGroupId = groupIds[currentGroupIndex];
        const group = questionGroups.get(currentGroupId);
        if (!group) return null;
        
        const question = group.find(q => q.difficulty === currentDifficulty);
        return question || group[0];
      }
      
      return questions[currentGroupIndex];
    }, [questions, isAdaptiveQuiz, questionGroups, groupIds, currentGroupIndex, currentDifficulty]);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    // Calculate normalized max score for display
    const displayMaxScore = useMemo(() => {
      if (!currentQuestion) return 10;
      if (!isAdaptiveQuiz) return currentQuestion.maxScore;
      
      const multiplier = ADAPTIVE_SCORE_MULTIPLIERS[currentDifficulty];
      return Math.round(NORMALIZED_GROUP_MAX_SCORE * multiplier);
    }, [currentQuestion, isAdaptiveQuiz, currentDifficulty]);

    const currentQuestionForEffect = useMemo(() => currentQuestion, [currentQuestion]);
    
    useEffect(() => {
        setStartTime(Date.now());
        setCurrentAnswer(''); 
    }, [currentGroupIndex, currentDifficulty]);
    
    const recordAnswer = useCallback(() => {
        if (!currentQuestion) return answers;
        const timeTaken = (Date.now() - startTime) / 1000;
        const newAnswer: StudentAnswer = {
            questionId: currentQuestion.id,
            questionContent: currentQuestion.content,
            answer: currentAnswer,
            correctAnswer: currentQuestion.correctAnswer,
            timeTaken: timeTaken,
            difficulty: currentQuestion.difficulty,
            groupIndex: currentGroupIndex,
        };
        const newAnswers = [...answers, newAnswer];
        setAnswers(newAnswers);
        return newAnswers;
    }, [currentQuestion, startTime, currentAnswer, answers, currentGroupIndex]);

    const handleNext = async () => {
        const finalAnswers = recordAnswer();
        
        if (isAdaptiveQuiz && currentQuestion?.type === 'mcq') {
            const wasCorrect = checkMCQAnswer(currentAnswer, currentQuestion.correctAnswer);
            const nextDifficulty = getNextDifficulty(currentDifficulty, wasCorrect);
            
            setAdaptivePath(prev => [...prev, currentDifficulty]);
            
            if (wasCorrect) {
                toast({
                    title: '✓ Correct!',
                    description: nextDifficulty !== currentDifficulty 
                        ? `Leveling up to ${DIFFICULTY_CONFIG[nextDifficulty].label}!`
                        : 'Great job! Staying at maximum difficulty.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: '✗ Incorrect',
                    description: nextDifficulty !== currentDifficulty
                        ? `Moving to ${DIFFICULTY_CONFIG[nextDifficulty].label} level.`
                        : 'Already at beginner level.',
                });
            }
            
            if (currentGroupIndex < totalQuestionsToAnswer - 1) {
                setCurrentDifficulty(nextDifficulty);
                setCurrentGroupIndex(prev => prev + 1);
            } else {
                await handleSubmit(finalAnswers);
            }
        } else if (isAdaptiveQuiz && currentQuestion?.type === 'text') {
            setAdaptivePath(prev => [...prev, currentDifficulty]);
            
            if (currentGroupIndex < totalQuestionsToAnswer - 1) {
                setCurrentGroupIndex(prev => prev + 1);
            } else {
                await handleSubmit(finalAnswers);
            }
        } else {
            if (currentGroupIndex < totalQuestionsToAnswer - 1) {
                setCurrentGroupIndex(prev => prev + 1);
            } else {
                await handleSubmit(finalAnswers);
            }
        }
    };
    
    const handleSubmit = async (finalAnswers?: StudentAnswer[]) => {
        setIsSubmitting(true);
        const answersToSubmit = finalAnswers || recordAnswer();

        if (!firestore || !user || !exam || !answersToSubmit) {
            toast({ variant: 'destructive', title: 'Error', description: "Submission failed: missing required context."});
            setIsSubmitting(false);
            return;
        }

        try {
            const attemptId = uuidv4();
            const attemptRef = doc(firestore, 'attempts', attemptId);
            
            const attemptData: Attempt = {
                id: attemptId,
                examId: examId,
                studentId: user.uid,
                answers: answersToSubmit,
                status: 'Pending Grading',
                startedAt: new Date(Date.now() - (answersToSubmit.reduce((acc, a) => acc + a.timeTaken, 0) * 1000)).toISOString(),
                examTitle: exam.quizTitle,
                score: 0,
                totalQuestions: totalQuestionsToAnswer,
                isAdaptive: isAdaptiveQuiz,
                adaptivePath: isAdaptiveQuiz ? [...adaptivePath, currentDifficulty] : undefined,
            };
            
            await setDoc(attemptRef, attemptData);
            
            router.push(`/exam/${examId}/results?attemptId=${attemptId}`);

        } catch (error: any) {
            console.error("Failed to submit exam:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
            setIsSubmitting(false);
        }
    };

    const progress = totalQuestionsToAnswer > 0 ? ((currentGroupIndex + 1) / totalQuestionsToAnswer) * 100 : 0;

    if (isLoadingExam || isLoadingQuestions || !exam || !questions || !currentQuestion) {
        return <ExamSkeleton />;
    }

    const difficultyConfig = currentQuestion.difficulty ? DIFFICULTY_CONFIG[currentQuestion.difficulty] : null;

    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto">
            <Card className="shadow-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{exam.quizTitle}</CardTitle>
                        {isAdaptiveQuiz && (
                            <Badge variant="outline" className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-300">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Adaptive
                            </Badge>
                        )}
                    </div>
                    <CardDescription>Answer each question to the best of your ability.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-primary">
                                    Question {currentGroupIndex + 1} of {totalQuestionsToAnswer}
                                </p>
                                {isAdaptiveQuiz && difficultyConfig && (
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "text-xs font-medium border",
                                            difficultyConfig.bgColor,
                                            difficultyConfig.color
                                        )}
                                    >
                                        {difficultyConfig.icon}
                                        <span className="ml-1">{difficultyConfig.label}</span>
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {isAdaptiveQuiz ? `Worth: ${displayMaxScore} pts` : `Score: ${displayMaxScore} pts`}
                            </p>
                        </div>
                        <Progress value={progress} className="h-2" />
                        
                        {/* Adaptive path visualization */}
                        {isAdaptiveQuiz && adaptivePath.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                                <span className="text-xs text-muted-foreground mr-1">Path:</span>
                                {adaptivePath.map((diff, idx) => (
                                    <Badge 
                                        key={idx} 
                                        variant="outline" 
                                        className={cn(
                                            "text-[10px] px-1.5 py-0",
                                            DIFFICULTY_CONFIG[diff].bgColor,
                                            DIFFICULTY_CONFIG[diff].color
                                        )}
                                    >
                                        {diff.charAt(0).toUpperCase()}
                                    </Badge>
                                ))}
                                <Badge 
                                    variant="outline" 
                                    className={cn(
                                        "text-[10px] px-1.5 py-0 animate-pulse",
                                        difficultyConfig?.bgColor,
                                        difficultyConfig?.color
                                    )}
                                >
                                    {currentDifficulty.charAt(0).toUpperCase()}
                                </Badge>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <p className="text-lg font-semibold">{currentQuestion.content}</p>
                        {currentQuestion.type === 'mcq' && currentQuestion.options && (
                            <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                                {currentQuestion.options.map((option, index) => (
                                    <Label key={index} className="flex items-center space-x-3 p-4 border rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors cursor-pointer">
                                        <RadioGroupItem value={option} id={`option-${index}`} />
                                        <span>{option}</span>
                                    </Label>
                                ))}
                            </RadioGroup>
                        )}
                        {currentQuestion.type === 'text' && (
                            <Textarea
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                placeholder="Type your answer here..."
                                className="min-h-[120px]"
                            />
                        )}
                    </div>
                    
                    <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={handleNext}
                        disabled={!currentAnswer || isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting 
                            ? 'Submitting...' 
                            : currentGroupIndex < totalQuestionsToAnswer - 1 
                                ? 'Next Question' 
                                : 'Finish & Submit Exam'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
