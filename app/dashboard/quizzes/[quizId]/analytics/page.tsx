'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Quiz, Attempt, QuizAnalytics, ConceptInsight } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Download, TrendingDown, TrendingUp, Users, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function QuizAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const quizId = params.quizId as string;
    const { user } = useUser();
    const firestore = useFirestore();
    const [exporting, setExporting] = useState(false);

    const quizRef = useMemoFirebase(() => {
        if (!firestore || !quizId) return null;
        return doc(firestore, 'quizzes', quizId);
    }, [firestore, quizId]);

    const { data: quiz, isLoading: isLoadingQuiz } = useDoc<Quiz>(quizRef);

    // Get all attempts for this quiz
    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || !quizId) return null;
        return query(
            collection(firestore, 'attempts'),
            where('examId', '==', quizId)
        );
    }, [firestore, quizId]);

    const { data: attempts, isLoading: isLoadingAttempts } = useCollection<Attempt>(attemptsQuery);

    const analytics: QuizAnalytics | null = useMemo(() => {
        if (!attempts || attempts.length === 0 || !quiz) return null;

        const completedAttempts = attempts.filter(a => a.status === 'Completed' && a.gradedAnswers);
        if (completedAttempts.length === 0) return null;

        const scores = completedAttempts.map(a => {
            const totalPossible = a.totalQuestions * 10;
            return totalPossible > 0 ? (a.score / totalPossible) * 100 : 0;
        });

        const sortedScores = [...scores].sort((a, b) => a - b);
        const medianScore = sortedScores.length > 0
            ? sortedScores[Math.floor(sortedScores.length / 2)]
            : 0;

        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const completionRate = (completedAttempts.length / attempts.length) * 100;

        // Concept insights
        const conceptMap = new Map<string, { correct: number; total: number }>();
        completedAttempts.forEach(attempt => {
            attempt.gradedAnswers?.forEach((graded: any) => {
                const topic = extractTopic(graded.questionContent);
                if (!conceptMap.has(topic)) {
                    conceptMap.set(topic, { correct: 0, total: 0 });
                }
                const stats = conceptMap.get(topic)!;
                stats.total++;
                if (graded.isCorrect) stats.correct++;
            });
        });

        const conceptInsights: ConceptInsight[] = Array.from(conceptMap.entries())
            .map(([topic, stats]) => {
                const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
                return {
                    topic,
                    accuracy,
                    totalAttempts: stats.total,
                    correctAttempts: stats.correct,
                    status: accuracy >= 70 ? 'strong' : accuracy >= 50 ? 'weak' : 'critical',
                    studentIds: [], // Would be populated with actual student IDs
                };
            })
            .sort((a, b) => a.accuracy - b.accuracy);

        // Most skipped/incorrect questions
        const questionStats = new Map<string, { skipped: number; incorrect: number }>();
        completedAttempts.forEach(attempt => {
            attempt.gradedAnswers?.forEach((graded: any) => {
                if (!questionStats.has(graded.questionId)) {
                    questionStats.set(graded.questionId, { skipped: 0, incorrect: 0 });
                }
                const stats = questionStats.get(graded.questionId)!;
                if (!graded.answer || graded.answer === '') {
                    stats.skipped++;
                } else if (!graded.isCorrect) {
                    stats.incorrect++;
                }
            });
        });

        const mostSkipped = Array.from(questionStats.entries())
            .sort((a, b) => b[1].skipped - a[1].skipped)[0]?.[0];
        const mostIncorrect = Array.from(questionStats.entries())
            .sort((a, b) => b[1].incorrect - a[1].incorrect)[0]?.[0];

        return {
            quizId: quiz.id,
            quizTitle: quiz.title,
            averageScore,
            medianScore,
            completionRate,
            totalStudents: attempts.length,
            completedStudents: completedAttempts.length,
            mostSkippedQuestion: mostSkipped,
            mostIncorrectQuestion: mostIncorrect,
            conceptInsights,
            studentPerformance: [], // Would be populated with actual student data
        };
    }, [attempts, quiz]);

    const extractTopic = (content: string): string => {
        const words = content.toLowerCase().split(/\s+/);
        const topicKeywords = [
            'tcp', 'http', 'network', 'protocol',
            'algorithm', 'data structure', 'array', 'tree',
            'function', 'variable', 'class', 'object',
        ];
        for (const keyword of topicKeywords) {
            if (content.toLowerCase().includes(keyword)) {
                return keyword.charAt(0).toUpperCase() + keyword.slice(1);
            }
        }
        return words.slice(0, 4).join(' ').substring(0, 50) || 'General';
    };

    const handleExport = async () => {
        if (!analytics) return;
        setExporting(true);
        // Export logic would go here
        setTimeout(() => {
            toast({ title: 'Export Started', description: 'Your report is being generated...' });
            setExporting(false);
        }, 1000);
    };

    if (isLoadingQuiz || isLoadingAttempts) {
        return (
            <div className="p-8">
                <Skeleton className="h-10 w-48 mb-8" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Quiz not found.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="p-8">
                <div className="mb-6">
                    <Button variant="ghost" asChild>
                        <Link href="/dashboard/quizzes">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                </div>
                <Card>
                    <CardContent className="p-8 text-center">
                        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No analytics available yet. Students need to complete the quiz first.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const chartData = analytics.conceptInsights.slice(0, 5).map(insight => ({
        topic: insight.topic.substring(0, 20),
        accuracy: Math.round(insight.accuracy),
    }));

    const statusColors = {
        strong: '#22c55e',
        weak: '#f59e0b',
        critical: '#ef4444',
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="ghost" asChild>
                        <Link href="/dashboard/quizzes">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight mt-4">{quiz.title} - Analytics</h1>
                </div>
                <Button onClick={handleExport} disabled={exporting}>
                    <Download className="h-4 w-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export Report'}
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(analytics.averageScore)}%</div>
                        <p className="text-xs text-muted-foreground">Across all attempts</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Median Score</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(analytics.medianScore)}%</div>
                        <p className="text-xs text-muted-foreground">Middle value</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(analytics.completionRate)}%</div>
                        <p className="text-xs text-muted-foreground">{analytics.completedStudents} / {analytics.totalStudents} students</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalStudents}</div>
                        <p className="text-xs text-muted-foreground">Students attempted</p>
                    </CardContent>
                </Card>
            </div>

            {/* Concept Insights */}
            <Card>
                <CardHeader>
                    <CardTitle>Concept-Level Insights</CardTitle>
                    <CardDescription>Topic breakdown showing what students struggle with</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-4">
                            {analytics.conceptInsights.slice(0, 5).map((insight, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{insight.topic}</span>
                                        <Badge 
                                            variant={insight.status === 'strong' ? 'default' : insight.status === 'weak' ? 'secondary' : 'destructive'}
                                        >
                                            {insight.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Progress value={insight.accuracy} className="flex-1" />
                                        <span className="text-sm font-semibold w-16 text-right">
                                            {Math.round(insight.accuracy)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {insight.correctAttempts} / {insight.totalAttempts} correct
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="topic" angle={-45} textAnchor="end" height={80} />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Bar dataKey="accuracy" fill="hsl(var(--primary))" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Question Performance */}
            {(analytics.mostSkippedQuestion || analytics.mostIncorrectQuestion) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Question Performance</CardTitle>
                        <CardDescription>Questions that need attention</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {analytics.mostSkippedQuestion && (
                            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown className="h-5 w-5 text-amber-500" />
                                    <span className="font-semibold">Most Skipped Question</span>
                                </div>
                                <p className="text-sm text-muted-foreground">Question ID: {analytics.mostSkippedQuestion}</p>
                            </div>
                        )}
                        {analytics.mostIncorrectQuestion && (
                            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown className="h-5 w-5 text-red-500" />
                                    <span className="font-semibold">Most Incorrect Question</span>
                                </div>
                                <p className="text-sm text-muted-foreground">Question ID: {analytics.mostIncorrectQuestion}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

