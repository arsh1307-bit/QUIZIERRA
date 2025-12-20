'use client';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, collection, getDocs, query, where, getDoc } from 'firebase/firestore';
import type { Attempt, GradeSubmissionOutput, UserProfile, DifficultyLevel } from '@/lib/types';
import { ADAPTIVE_SCORE_MULTIPLIERS, NORMALIZED_GROUP_MAX_SCORE } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { gradeSubmission } from '@/ai/flows/student-grades-submission';
import { CAR_PARTS } from '@/lib/car-parts';
import { Loader2, CheckCircle, XCircle, Award, Car, Sparkles, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Difficulty badge config
const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; color: string; bgColor: string }> = {
  beginner: { label: 'Beginner', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  intermediate: { label: 'Intermediate', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  hard: { label: 'Hard', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};
import { Button } from '@/components/ui/button';

function ResultSkeleton() {
    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto text-center">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                    <p className="text-muted-foreground">Your exam is being graded by our AI assistant...</p>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function ExamResultsPage() {
    const searchParams = useSearchParams();
    const attemptId = searchParams.get('attemptId');
    const params = useParams();
    const examId = params.examId as string;
    const firestore = useFirestore();
    const router = useRouter();

    const attemptRef = useMemoFirebase(() => {
        if (!firestore || !attemptId) return null;
        return doc(firestore, 'attempts', attemptId);
    }, [firestore, attemptId]);
    
    const { data: attempt, isLoading: isLoadingAttempt } = useDoc<Attempt>(attemptRef);
    const [gradingResult, setGradingResult] = useState<GradeSubmissionOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (attempt && attempt.status === 'Pending Grading' && firestore) {
            const performGrading = async () => {
                try {
                    // Fetch the student's educational level from their profile
                    let educationalLevel: string | undefined;
                    let educationalYear: string | undefined;
                    
                    try {
                        const userDocRef = doc(firestore, 'users', attempt.studentId);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data() as UserProfile;
                            educationalLevel = userData.educationalLevel;
                            educationalYear = userData.educationalYear;
                        }
                    } catch (e) {
                        console.warn('Could not fetch student educational level:', e);
                    }

                    // Normalize answers to the shape expected by the grading flow.
                    const normalizedAnswers = (attempt.answers || []).map((answer: any) => ({
                        questionId: answer.questionId,
                        questionContent: answer.questionContent,
                        answer: answer.answer ?? answer.studentAnswer ?? '',
                        correctAnswer: answer.correctAnswer,
                        timeTaken: typeof answer.timeTaken === 'number' ? answer.timeTaken : Number(answer.timeTaken ?? 0),
                        difficulty: answer.difficulty,
                        groupIndex: answer.groupIndex,
                    }));

                    const result = await gradeSubmission({ 
                        answers: normalizedAnswers,
                        educationalLevel: educationalLevel as any,
                        educationalYear: educationalYear,
                        isAdaptive: attempt.isAdaptive ?? false,
                    });
                    setGradingResult(result);
                    
                    const attemptsCollection = collection(firestore, 'attempts');
                    // Query only by studentId to avoid requiring a composite index; filter partEarned client-side.
                    const userAttemptsQuery = query(attemptsCollection, where('studentId', '==', attempt.studentId));
                    const earnedPartsSnapshot = await getDocs(userAttemptsQuery);
                    const earnedPartsCount = earnedPartsSnapshot.docs.filter(doc => {
                        const data = doc.data() as any;
                        return data.partEarned != null;
                    }).length;

                    const nextPart = CAR_PARTS[earnedPartsCount % CAR_PARTS.length];
                    const partEarned = result.finalScore > (attempt.totalQuestions * 10 * 0.7) ? nextPart : null;

                    if (attemptRef) {
                        const updateData: Record<string, any> = {
                            status: 'Completed',
                            score: result.finalScore,
                            gradedAnswers: result.gradedAnswers,
                            completedAt: new Date().toISOString(),
                        };
                        if (result.maxPossibleScore) {
                            updateData.maxPossibleScore = result.maxPossibleScore;
                        }
                        if (result.normalizedFinalScore !== undefined) {
                            updateData.normalizedFinalScore = result.normalizedFinalScore;
                        }
                        if (partEarned) {
                            updateData.partEarned = partEarned;
                        }
                        await updateDoc(attemptRef, updateData);
                    }
                } catch (e: any) {
                    setError('Failed to grade submission. Please contact your instructor.');
                    console.error(e);
                }
            };
            performGrading();
        } else if (attempt && attempt.status === 'Completed') {
            setGradingResult({
                gradedAnswers: attempt.gradedAnswers as any,
                finalScore: attempt.score,
            });
        }

    }, [attempt, attemptRef, firestore]);

    if (!attemptId) {
        return (
            <div className="text-center p-8">
                <p className="text-destructive">No attempt ID found. Please go back to the dashboard.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Back to Dashboard</Button>
            </div>
        );
    }
    
    if (isLoadingAttempt || (attempt?.status === 'Pending Grading' && !gradingResult && !error)) {
        return <ResultSkeleton />;
    }

    if (error) {
        return <div className="text-center p-8 text-destructive">{error}</div>;
    }
    
    if (!attempt || !gradingResult) {
        return <div className="text-center p-8">Could not load exam results.</div>;
    }
    
    // Calculate scores - handle both adaptive and standard quizzes
    const isAdaptive = attempt.isAdaptive;
    const totalPossibleScore = isAdaptive && gradingResult.maxPossibleScore 
        ? gradingResult.maxPossibleScore 
        : attempt.totalQuestions * 10;
    const percentage = isAdaptive && gradingResult.normalizedFinalScore !== undefined
        ? gradingResult.normalizedFinalScore
        : (totalPossibleScore > 0 ? Math.round((gradingResult.finalScore / totalPossibleScore) * 100) : 0);

    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto">
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <CardTitle className="text-3xl">Exam Results</CardTitle>
                        {isAdaptive && (
                            <Badge variant="outline" className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-300">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Adaptive
                            </Badge>
                        )}
                    </div>
                    <CardDescription>{attempt.examTitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Your Score</p>
                        <p className="text-6xl font-bold text-primary">{percentage}%</p>
                        <p className="text-muted-foreground">
                            {gradingResult.finalScore.toFixed(1)} / {totalPossibleScore} points
                            {isAdaptive && ' (difficulty-adjusted)'}
                        </p>
                    </div>

                    {/* Adaptive path visualization */}
                    {isAdaptive && attempt.adaptivePath && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Your Difficulty Path
                            </h4>
                            <div className="flex items-center gap-1 flex-wrap">
                                {attempt.adaptivePath.map((diff: DifficultyLevel, idx: number) => {
                                    const config = DIFFICULTY_CONFIG[diff];
                                    return (
                                        <Badge 
                                            key={idx} 
                                            variant="outline" 
                                            className={cn("text-xs", config.bgColor, config.color)}
                                        >
                                            Q{idx + 1}: {config.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {attempt.partEarned && (
                        <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <h3 className="font-semibold flex items-center justify-center gap-2">
                                <Award className="h-5 w-5 text-amber-500" />
                                New Part Unlocked!
                            </h3>
                             <p className="text-sm text-muted-foreground">You earned the <span className="font-bold text-primary">{attempt.partEarned}</span> for your car!</p>
                             <Car className="h-8 w-8 mx-auto mt-2 text-primary" />
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Detailed Breakdown</h3>
                        {gradingResult.gradedAnswers.map((gradedAnswer: any, index: number) => {
                             const difficulty = gradedAnswer.difficulty as DifficultyLevel | undefined;
                             const diffConfig = difficulty ? DIFFICULTY_CONFIG[difficulty] : null;
                             const maxScoreForQuestion = isAdaptive && difficulty 
                                 ? NORMALIZED_GROUP_MAX_SCORE * (ADAPTIVE_SCORE_MULTIPLIERS[difficulty] || 1)
                                 : 10;
                             
                             return (
                                 <Card key={gradedAnswer.questionId} className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium">{index + 1}.</span>
                                                {diffConfig && (
                                                    <Badge 
                                                        variant="outline" 
                                                        className={cn("text-xs", diffConfig.bgColor, diffConfig.color)}
                                                    >
                                                        {diffConfig.label}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="font-medium">{gradedAnswer.questionContent}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {gradedAnswer.isCorrect ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                                            <span className={`font-bold ${gradedAnswer.isCorrect ? 'text-green-500' : 'text-destructive'}`}>
                                                {gradedAnswer.score.toFixed(1)}/{maxScoreForQuestion}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">Your answer: <span className="text-foreground">{Array.isArray(gradedAnswer.answer) ? gradedAnswer.answer.join(', ') : gradedAnswer.answer}</span></p>
                                    <p className="text-xs text-blue-500 bg-blue-500/10 rounded-full px-2 py-0.5 mt-2 inline-block">Justification: {gradedAnswer.justification}</p>
                               </Card>
                             );
                        })}
                    </div>

                    <Button className="w-full" size="lg" onClick={() => router.push('/dashboard')}>
                        Back to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
