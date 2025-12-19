'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Lightbulb, Clock } from 'lucide-react';
import { calculateAnalytics, type WeakArea } from '@/lib/analytics';
import type { Attempt } from '@/lib/types';
import { GenerateFromFile } from '@/components/quiz/generate-from-file';
import type { GenerateQuizOutput } from '@/ai/flows/instructor-generates-quiz-from-topic';
import { QuizReview } from '@/components/quiz/quiz-review';

export default function PracticeModePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [generatedQuiz, setGeneratedQuiz] = useState<GenerateQuizOutput | null>(null);
    const [showQuiz, setShowQuiz] = useState(false);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    useEffect(() => {
        const loadWeakAreas = async () => {
            if (!user || !firestore) return;

            setIsLoading(true);
            try {
                const attemptsQuery = query(
                    collection(firestore, 'attempts'),
                    where('studentId', '==', user.uid)
                );
                const attemptsSnapshot = await getDocs(attemptsQuery);
                const attempts = attemptsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Attempt[];

                if (attempts.length > 0) {
                    const analytics = calculateAnalytics(attempts);
                    setWeakAreas(analytics.weakAreas);
                }
            } catch (error) {
                console.error('Failed to load weak areas:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user && firestore) {
            loadWeakAreas();
        }
    }, [user, firestore]);

    const handleGeneratePracticeQuiz = async (weakArea: WeakArea) => {
        // Generate a practice quiz focused on the weak area
        // For now, redirect to practice page with topic hint
        router.push(`/dashboard/practice?topic=${encodeURIComponent(weakArea.topic)}`);
    };

    const handleQuizGenerated = (quiz: GenerateQuizOutput) => {
        setGeneratedQuiz(quiz);
        setShowQuiz(true);
    };

    if (isUserLoading || isLoading) {
        return (
            <div className="p-8">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (showQuiz && generatedQuiz) {
        return (
            <QuizReview
                quizData={generatedQuiz}
                onBack={() => setShowQuiz(false)}
                onReset={() => {
                    setShowQuiz(false);
                    setGeneratedQuiz(null);
                }}
            />
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Practice Mode</h1>
                <p className="text-muted-foreground">
                    Focus on your weak areas with personalized practice quizzes. No timer, hints allowed.
                </p>
            </div>

            {weakAreas.length > 0 ? (
                <>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Your Weak Areas
                            </CardTitle>
                            <CardDescription>
                                Practice these topics to improve your performance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {weakAreas.slice(0, 5).map((area, idx) => (
                                    <Card key={idx} className="bg-card">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg">{area.topic}</h3>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Target className="h-3 w-3" />
                                                            {Math.round(area.accuracy)}% accuracy
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {Math.round(area.avgTimeTaken)}s avg
                                                        </span>
                                                        <span>{area.totalAttempts} attempts</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => handleGeneratePracticeQuiz(area)}
                                                    className="ml-4"
                                                >
                                                    Practice This Topic
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightbulb className="h-5 w-5" />
                                Generate Custom Practice Quiz
                            </CardTitle>
                            <CardDescription>
                                Upload new material or create a quiz from text to practice any topic
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <GenerateFromFile onQuizGenerated={handleQuizGenerated} showAnswerReview={false} />
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card className="bg-muted/50">
                    <CardContent className="p-8 text-center">
                        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Weak Areas Detected Yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Complete some quizzes to identify areas that need practice.
                        </p>
                        <Button onClick={() => router.push('/dashboard/practice')}>
                            Start Practicing
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

