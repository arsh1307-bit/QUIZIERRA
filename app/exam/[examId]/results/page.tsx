'use client';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import type { Attempt, GradeSubmissionOutput } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
// Grade submissions via Python backend proxy
import { CAR_PARTS } from '@/lib/car-parts';
<<<<<<< HEAD
import { Loader2, CheckCircle, XCircle, Award, Car } from 'lucide-react';
=======
import { Loader2, CheckCircle, XCircle, Award, Car, FileText, BookOpen } from 'lucide-react';
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
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
                    // Normalize answers to the shape expected by the grading flow.
                    const normalizedAnswers = (attempt.answers || []).map((answer: any) => ({
                        questionId: answer.questionId,
                        questionContent: answer.questionContent,
                        // Support both legacy `studentAnswer` and current `answer` fields.
                        answer: answer.answer ?? answer.studentAnswer ?? '',
                        correctAnswer: answer.correctAnswer,
                        timeTaken: typeof answer.timeTaken === 'number' ? answer.timeTaken : Number(answer.timeTaken ?? 0),
                    }));

                    const r = await fetch('/api/grade', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ answers: normalizedAnswers }),
                    });
                    if (!r.ok) throw new Error('Grading service failed.');
                    const result = await r.json();
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
                        const updateData: any = {
                            status: 'Completed',
                            score: result.finalScore,
                            gradedAnswers: result.gradedAnswers,
                            completedAt: new Date().toISOString(),
                        };
                        // Only add partEarned if it has a value (avoid undefined)
                        if (partEarned) {
                            updateData.partEarned = partEarned;
                        }
                        await updateDoc(attemptRef, updateData);
                    }
<<<<<<< HEAD
=======

                    // Update quizCompleted percentage in UploadedMaterial
                    // Find material linked to this quiz
                    if (examId && firestore) {
                        try {
                            const materialsQuery = query(
                                collection(firestore, 'uploadedMaterials'),
                                where('quizId', '==', examId)
                            );
                            const materialsSnapshot = await getDocs(materialsQuery);
                            
                            if (!materialsSnapshot.empty) {
                                const materialDoc = materialsSnapshot.docs[0];
                                const correctCount = result.gradedAnswers.filter((g: any) => g.isCorrect).length;
                                const totalQuestions = result.gradedAnswers.length;
                                const quizCompleted = totalQuestions > 0 
                                    ? Math.round((correctCount / totalQuestions) * 100) 
                                    : 0;
                                
                                await updateDoc(doc(firestore, 'uploadedMaterials', materialDoc.id), {
                                    quizCompleted,
                                    materialStatus: 'quizCompleted',
                                });
                            }
                        } catch (error) {
                            console.error('Failed to update material progress:', error);
                            // Non-critical error, don't block user
                        }
                    }
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
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
    
    const totalPossibleScore = attempt.totalQuestions * 10;
    const percentage = totalPossibleScore > 0 ? Math.round((gradingResult.finalScore / totalPossibleScore) * 100) : 0;

    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto">
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Exam Results</CardTitle>
                    <CardDescription>{attempt.examTitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center p-6 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Your Score</p>
                        <p className="text-6xl font-bold text-primary">{percentage}%</p>
                        <p className="text-muted-foreground">{gradingResult.finalScore.toFixed(1)} / {totalPossibleScore} points</p>
                    </div>

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
                        {gradingResult.gradedAnswers.map((gradedAnswer, index) => (
<<<<<<< HEAD
                             <Card key={gradedAnswer.questionId} className="p-4">
=======
                             <Card key={gradedAnswer.questionId} className={`p-4 ${!gradedAnswer.isCorrect ? 'border-destructive/50 bg-destructive/5' : ''}`}>
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
                                <div className="flex justify-between items-start">
                                    <p className="font-medium flex-1 pr-4">{index + 1}. {gradedAnswer.questionContent}</p>
                                    <div className="flex items-center gap-2">
                                        {gradedAnswer.isCorrect ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                                        <span className={`font-bold ${gradedAnswer.isCorrect ? 'text-green-500' : 'text-destructive'}`}>{gradedAnswer.score.toFixed(1)}/10</span>
                                    </div>
                                </div>
<<<<<<< HEAD
                                <p className="text-sm text-muted-foreground mt-2">Your answer: <span className="text-foreground">{Array.isArray(gradedAnswer.answer) ? gradedAnswer.answer.join(', ') : gradedAnswer.answer}</span></p>
                                <p className="text-xs text-blue-500 bg-blue-500/10 rounded-full px-2 py-0.5 mt-2 inline-block">Justification: {gradedAnswer.justification}</p>
=======
                                
                                {!gradedAnswer.isCorrect && (
                                    <div className="mt-4 space-y-3 p-3 bg-muted/50 rounded-lg border border-destructive/20">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">❌ Your answer:</p>
                                            <p className="text-sm text-foreground">{Array.isArray(gradedAnswer.answer) ? gradedAnswer.answer.join(', ') : gradedAnswer.answer || 'No answer provided'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">✅ Correct answer:</p>
                                            <p className="text-sm text-green-600 font-medium">{gradedAnswer.correctAnswer || 'Not available'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">💡 Explanation:</p>
                                            <p className="text-sm text-foreground">{gradedAnswer.justification}</p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground">Reference from uploaded content</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full mt-2"
                                            onClick={() => router.push(`/dashboard/practice-mode?topic=${encodeURIComponent(gradedAnswer.questionContent.substring(0, 50))}`)}
                                        >
                                            <BookOpen className="h-4 w-4 mr-2" />
                                            Practice Similar Question
                                        </Button>
                                    </div>
                                )}
                                
                                {gradedAnswer.isCorrect && (
                                    <div className="mt-2">
                                        <p className="text-sm text-muted-foreground">Your answer: <span className="text-foreground">{Array.isArray(gradedAnswer.answer) ? gradedAnswer.answer.join(', ') : gradedAnswer.answer}</span></p>
                                        <p className="text-xs text-blue-500 bg-blue-500/10 rounded-full px-2 py-0.5 mt-2 inline-block">Justification: {gradedAnswer.justification}</p>
                                    </div>
                                )}
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
                           </Card>
                        ))}
                    </div>

                    <Button className="w-full" size="lg" onClick={() => router.push('/dashboard')}>
                        Back to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
