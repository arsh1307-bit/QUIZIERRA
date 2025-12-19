'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, getDoc, getDocs } from 'firebase/firestore';
import type { UserProfile, Quiz, Question } from '@/lib/types';
import { QuizReview } from '@/components/quiz/quiz-review';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import type { GenerateQuizOutput } from '@/ai/flows/instructor-generates-quiz-from-topic';

export default function TeacherQuizReviewPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const quizId = searchParams.get('quizId');
    
    const [quizData, setQuizData] = useState<GenerateQuizOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    // Role guard - only teachers can access
    useEffect(() => {
        if (!isUserLoading && !isProfileLoading && userProfile) {
            if (userProfile.role !== 'instructor' && userProfile.role !== 'admin') {
                router.push('/dashboard');
            }
        }
    }, [userProfile, isUserLoading, isProfileLoading, router]);

    // Load quiz data if quizId provided
    useEffect(() => {
        const loadQuiz = async () => {
            if (!quizId || !firestore) {
                setIsLoading(false);
                return;
            }

            try {
                const quizDocRef = doc(firestore, 'quizzes', quizId);
                const quizDoc = await getDoc(quizDocRef);

                if (!quizDoc.exists()) {
                    setError('Quiz not found');
                    setIsLoading(false);
                    return;
                }

                const quiz = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
                
                // Load questions
                const questionsSnapshot = await getDocs(
                    collection(firestore, 'quizzes', quizId, 'questions')
                );
                
                const questions = questionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Question[];

                // Convert to GenerateQuizOutput format
                const output: GenerateQuizOutput = {
                    title: quiz.title,
                    questions: questions.map(q => ({
                        id: q.id,
                        type: q.type,
                        content: q.content,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        maxScore: q.maxScore,
                    })),
                };

                setQuizData(output);
            } catch (error: any) {
                setError(error.message || 'Failed to load quiz');
            } finally {
                setIsLoading(false);
            }
        };

        if (userProfile?.role === 'instructor' || userProfile?.role === 'admin') {
            loadQuiz();
        }
    }, [quizId, firestore, userProfile]);

    if (isUserLoading || isProfileLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-10 w-48 mb-8" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!userProfile || (userProfile.role !== 'instructor' && userProfile.role !== 'admin')) {
        return (
            <div className="p-8">
                <Card className="max-w-2xl mx-auto">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                        <p className="text-muted-foreground mb-4">
                            Only teachers and administrators can review quizzes.
                        </p>
                        <Button onClick={() => router.push('/dashboard')}>
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-10 w-48 mb-8" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <Card className="max-w-2xl mx-auto">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Error</h2>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={() => router.push('/dashboard')}>
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!quizId || !quizData) {
        return (
            <div className="p-8">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Quiz Review</CardTitle>
                        <CardDescription>
                            Select a quiz to review from your dashboard, or provide a quizId in the URL.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/dashboard')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8">
            <div className="mb-4">
                <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Button>
            </div>
            <QuizReview
                quizData={quizData}
                onBack={() => router.push('/dashboard')}
                onReset={() => {
                    setQuizData(null);
                    router.push('/dashboard');
                }}
            />
        </div>
    );
}

