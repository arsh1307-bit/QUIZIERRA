'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Clock, Target, BookOpen } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Attempt } from '@/lib/types';
import { calculateAnalytics, type PerformanceAnalytics } from '@/lib/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function AnalyticsDashboard() {
    const { user } = useUser();
    const firestore = useFirestore();

    const attemptsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'attempts'), where('studentId', '==', user.uid));
    }, [user, firestore]);

    const { data: attempts, isLoading } = useCollection<Attempt>(attemptsQuery);

    const analytics: PerformanceAnalytics | null = useMemo(() => {
        if (!attempts || attempts.length === 0) return null;
        return calculateAnalytics(attempts);
    }, [attempts]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!analytics || attempts?.length === 0) {
        return (
            <Card className="bg-muted/50">
                <CardContent className="p-8 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Complete some quizzes to see your analytics.</p>
                </CardContent>
            </Card>
        );
    }

    const chartData = analytics.accuracyOverTime.map(a => ({
        date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        accuracy: Math.round(a.accuracy),
    }));

    const weakAreasChartData = analytics.weakAreas.slice(0, 5).map(area => ({
        topic: area.topic.substring(0, 20),
        accuracy: Math.round(area.accuracy),
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight">Performance Analytics</h2>
                <Badge variant={analytics.improvementTrend === 'improving' ? 'default' : analytics.improvementTrend === 'declining' ? 'destructive' : 'secondary'}>
                    {analytics.improvementTrend === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {analytics.improvementTrend === 'declining' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {analytics.improvementTrend === 'stable' && <Minus className="h-3 w-3 mr-1" />}
                    {analytics.improvementTrend.charAt(0).toUpperCase() + analytics.improvementTrend.slice(1)}
                </Badge>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalQuestionsAnswered}</div>
                        <p className="text-xs text-muted-foreground">Questions answered</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Time/Question</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(analytics.avgTimePerQuestion)}s</div>
                        <p className="text-xs text-muted-foreground">Average response time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Weak Areas</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.weakAreas.length}</div>
                        <p className="text-xs text-muted-foreground">Topics needing practice</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Strong Areas</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.strongAreas.length}</div>
                        <p className="text-xs text-muted-foreground">Mastered topics</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Accuracy Over Time</CardTitle>
                        <CardDescription>Your performance trend</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Weak Areas Breakdown</CardTitle>
                        <CardDescription>Topics with lowest accuracy</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={weakAreasChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="topic" angle={-45} textAnchor="end" height={80} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Bar dataKey="accuracy" fill="hsl(var(--destructive))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Weak Areas List */}
            {analytics.weakAreas.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Weak Areas - Practice Recommended</CardTitle>
                        <CardDescription>Focus on these topics to improve your performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.weakAreas.slice(0, 5).map((area, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium">{area.topic}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {area.totalAttempts} attempts • Avg time: {Math.round(area.avgTimeTaken)}s
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-destructive">
                                                {Math.round(area.accuracy)}%
                                            </p>
                                            <Progress value={area.accuracy} className="w-24 h-2 mt-1" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Strong Areas */}
            {analytics.strongAreas.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Strong Areas</CardTitle>
                        <CardDescription>Topics you've mastered</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {analytics.strongAreas.map((topic, idx) => (
                                <Badge key={idx} variant="default" className="text-sm">
                                    {topic}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

