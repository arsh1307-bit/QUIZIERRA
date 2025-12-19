'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { UserProfile, Attempt, StudentProgress } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Mail, TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useMemo } from 'react';
import { calculateAnalytics } from '@/lib/analytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentProgressPage() {
    const params = useParams();
    const router = useRouter();
    const studentId = params.studentId as string;
    const { user } = useUser();
    const firestore = useFirestore();

    const studentRef = useMemoFirebase(() => {
        if (!firestore || !studentId) return null;
        return doc(firestore, 'users', studentId);
    }, [firestore, studentId]);

    const { data: student, isLoading: isLoadingStudent } = useDoc<UserProfile>(studentRef);

    // Get all attempts for this student
    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || !studentId) return null;
        return query(
            collection(firestore, 'attempts'),
            where('studentId', '==', studentId)
        );
    }, [firestore, studentId]);

    const { data: attempts, isLoading: isLoadingAttempts } = useCollection<Attempt>(attemptsQuery);

    const progress: StudentProgress | null = useMemo(() => {
        if (!attempts || attempts.length === 0 || !student) return null;

        const completedAttempts = attempts.filter(a => a.status === 'Completed' && a.gradedAnswers);
        
        const quizHistory = completedAttempts.map(attempt => {
            const accuracy = attempt.totalQuestions > 0
                ? (attempt.score / (attempt.totalQuestions * 10)) * 100
                : 0;
            const timeTaken = attempt.gradedAnswers?.reduce((sum: number, g: any) => sum + (g.timeTaken || 0), 0) || 0;
            
            return {
                quizId: attempt.examId,
                quizTitle: attempt.examTitle || 'Quiz',
                score: attempt.score,
                accuracy,
                completedAt: attempt.completedAt || attempt.startedAt,
                timeTaken,
            };
        });

        // Accuracy trend
        const accuracyTrend = quizHistory
            .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
            .map(item => ({
                date: new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                accuracy: Math.round(item.accuracy),
            }));

        // Weak/strong topics
        const analytics = calculateAnalytics(completedAttempts);
        const weakTopics = analytics.weakAreas.map(a => a.topic);
        const strongTopics = analytics.strongAreas;

        // Average time per question
        const allTimes: number[] = [];
        completedAttempts.forEach(attempt => {
            attempt.gradedAnswers?.forEach((graded: any) => {
                allTimes.push(graded.timeTaken || 0);
            });
        });
        const avgTimePerQuestion = allTimes.length > 0
            ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length
            : 0;

        // Improvement rate
        let improvementRate = 0;
        if (accuracyTrend.length >= 2) {
            const recent = accuracyTrend.slice(-3).map(a => a.accuracy);
            const earlier = accuracyTrend.slice(0, 3).map(a => a.accuracy);
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
            improvementRate = recentAvg - earlierAvg;
        }

        return {
            studentId: student.id,
            studentName: student.displayName,
            email: student.email || '',
            quizHistory,
            accuracyTrend,
            weakTopics,
            strongTopics,
            avgTimePerQuestion,
            improvementRate,
        };
    }, [attempts, student]);

    if (isLoadingStudent || isLoadingAttempts) {
        return (
            <div className="p-8">
                <Skeleton className="h-10 w-48 mb-8" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!student) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Student not found.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    if (!progress) {
        return (
            <div className="p-8">
                <div className="mb-6">
                    <Button variant="ghost" asChild>
                        <Link href="/dashboard/students">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                </div>
                <Card>
                    <CardContent className="p-8 text-center">
                        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No progress data available. Student hasn't completed any quizzes yet.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="ghost" asChild>
                        <Link href="/dashboard/students">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight mt-4">{progress.studentName}</h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4" />
                        {progress.email}
                    </p>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{progress.quizHistory.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Time/Question</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(progress.avgTimePerQuestion)}s</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Weak Topics</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{progress.weakTopics.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Improvement</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${progress.improvementRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {progress.improvementRate >= 0 ? '+' : ''}{Math.round(progress.improvementRate)}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Accuracy Trend */}
            {progress.accuracyTrend.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Accuracy Trend</CardTitle>
                        <CardDescription>Performance over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={progress.accuracyTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Quiz History */}
            <Card>
                <CardHeader>
                    <CardTitle>Quiz History</CardTitle>
                    <CardDescription>All completed quizzes</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {progress.quizHistory.map((quiz, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">{quiz.quizTitle}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Completed: {new Date(quiz.completedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="font-semibold">{Math.round(quiz.accuracy)}%</p>
                                        <p className="text-xs text-muted-foreground">Accuracy</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{Math.round(quiz.timeTaken)}s</p>
                                        <p className="text-xs text-muted-foreground">Time</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Weak Topics */}
            {progress.weakTopics.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Weak Topics</CardTitle>
                        <CardDescription>Areas needing practice</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {progress.weakTopics.map((topic, idx) => (
                                <Badge key={idx} variant="destructive">{topic}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Strong Topics */}
            {progress.strongTopics.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Strong Topics</CardTitle>
                        <CardDescription>Mastered concepts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {progress.strongTopics.map((topic, idx) => (
                                <Badge key={idx} variant="default">{topic}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

