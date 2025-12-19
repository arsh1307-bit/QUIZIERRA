'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Clock, Award, Car, Loader2, Plus, Target, TrendingDown, TrendingUp, Brain, Sparkles, Calendar, History, RotateCcw, CheckCircle, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import type { Attempt, Exam, GradedAnswer } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { CAR_PARTS } from '@/lib/car-parts';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { analyzeStudentPerformance, type AnalyzeStudentPerformanceOutput } from '@/ai/flows/student-analyzes-performance';
import { EducationalLevelDialog, useEducationalLevelCheck } from './educational-level-dialog';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

function MyGarage({ attempts, isLoading }: { attempts: Attempt[] | null, isLoading: boolean }) {
    const earnedParts = useMemo(() => {
        if (!attempts) return [];
        return attempts.map(attempt => attempt.partEarned).filter(Boolean) as string[];
    }, [attempts]);

    const progressPercentage = useMemo(() => {
        if (earnedParts.length === 0) return 0;
        return Math.round((earnedParts.length / CAR_PARTS.length) * 100);
    }, [earnedParts]);

    const nextPartToEarn = useMemo(() => {
        return CAR_PARTS.find(part => !earnedParts.includes(part));
    }, [earnedParts]);

    if (isLoading) {
        return (
            <Card className="h-full bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-4 w-full mt-4" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-4 w-2/3" />
                </CardFooter>
            </Card>
        )
    }


    return (
        <Card className="h-full bg-card/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>My Garage</CardTitle>
                <CardDescription>Your car assembly progress.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg">
                    <Car className="h-20 w-20 text-muted-foreground" />
                </div>
                <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                </div>
            </CardContent>
            <CardFooter>
                 {nextPartToEarn ? (
                     <p className="text-sm text-muted-foreground">Continue quizzing to earn the <span className="font-semibold text-primary">{nextPartToEarn}!</span></p>
                 ) : (
                    <p className="text-sm font-semibold text-green-500">Congratulations! You've collected all parts!</p>
                 )}
            </CardFooter>
        </Card>
    );
}

function UpcomingExams({ attempts }: { attempts: Attempt[] | null }) {
    const { user } = useUser();
    const firestore = useFirestore();

    const examsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'exams'), where('enrolledStudentIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: exams, isLoading } = useCollection<Exam>(examsQuery);
    const router = useRouter();

    // Get exam IDs that the student has already completed
    const completedExamIds = useMemo(() => {
        if (!attempts) return new Set<string>();
        return new Set(attempts.map(a => a.examId));
    }, [attempts]);

    // Filter out completed exams from upcoming
    const upcomingExams = useMemo(() => {
        if (!exams) return [];
        return exams.filter(exam => !completedExamIds.has(exam.id));
    }, [exams, completedExamIds]);

    if (isLoading) {
        return (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
                ))}
            </div>
        )
    }

    if (upcomingExams.length === 0) {
        return <p className="text-muted-foreground">No upcoming exams found. Join one with an access code!</p>
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingExams.map((exam) => (
            <Card key={exam.id} className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {exam.quizTitle}
                  <Badge variant={exam.status === 'Live Now' ? 'default' : 'secondary'}
                    className={exam.status === 'Live Now' ? 'animate-pulse' : ''}
                  >
                    {exam.status}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-2 pt-2">
                    <Clock className="h-4 w-4"/>
                    <span>{new Date(exam.scheduledTime).toLocaleString()}</span>
                </CardDescription>
              </CardHeader>
              <CardFooter>
                 <Button className="w-full" onClick={() => router.push(`/exam/${exam.id}/lobby`)}>
                  Enter Waiting Room
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
    );
}

function ExamHistory({ attempts }: { attempts: Attempt[] | null }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const examsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'exams'), where('enrolledStudentIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: exams, isLoading } = useCollection<Exam>(examsQuery);

    // Get completed attempts grouped by exam
    const completedAttemptsByExam = useMemo(() => {
        if (!attempts) return new Map<string, Attempt[]>();
        const map = new Map<string, Attempt[]>();
        attempts
            .filter(a => a.status === 'Completed' || a.status === 'Pending Grading')
            .forEach(attempt => {
                const existing = map.get(attempt.examId) || [];
                existing.push(attempt);
                map.set(attempt.examId, existing);
            });
        return map;
    }, [attempts]);

    // Get exams that have been completed
    const completedExams = useMemo(() => {
        if (!exams) return [];
        return exams.filter(exam => completedAttemptsByExam.has(exam.id));
    }, [exams, completedAttemptsByExam]);

    if (isLoading) {
        return (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(2)].map((_, i) => (
                    <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
                ))}
            </div>
        )
    }

    if (completedExams.length === 0) {
        return <p className="text-muted-foreground">No exam history yet. Complete an exam to see it here!</p>
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {completedExams.map((exam) => {
                const examAttempts = completedAttemptsByExam.get(exam.id) || [];
                const latestAttempt = examAttempts.sort((a, b) => 
                    new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
                )[0];
                const bestScore = Math.max(...examAttempts.map(a => a.score || 0));
                const totalPossible = latestAttempt?.totalQuestions ? latestAttempt.totalQuestions * 10 : 0;
                const bestPercentage = totalPossible > 0 ? Math.round((bestScore / totalPossible) * 100) : 0;

                return (
                    <Card key={exam.id} className="bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                {exam.quizTitle}
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <History className="h-3 w-3" />
                                    Completed
                                </Badge>
                            </CardTitle>
                            <CardDescription className="space-y-1 pt-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4"/>
                                    <span>Taken: {new Date(latestAttempt?.completedAt || latestAttempt?.startedAt || '').toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Award className="h-4 w-4 text-amber-500"/>
                                    <span>Best Score: {bestPercentage}% ({examAttempts.length} attempt{examAttempts.length > 1 ? 's' : ''})</span>
                                </div>
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex gap-2">
                            <Button 
                                variant="outline" 
                                className="flex-1" 
                                onClick={() => router.push(`/exam/${exam.id}/results`)}
                            >
                                View Results
                            </Button>
                            <Button 
                                className="flex-1" 
                                onClick={() => router.push(`/exam/${exam.id}/lobby`)}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Re-attempt
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}

function RecentPerformance({ attempts, isLoading }: { attempts: Attempt[] | null, isLoading: boolean }) {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!attempts || attempts.length === 0) {
        return <p className="text-muted-foreground mt-4">No recent performance data available.</p>
    }

    return (
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-0">
                <ul className="divide-y divide-border">
                    {attempts.map(result => (
                        <li key={result.id} className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <BookOpen className="h-6 w-6 text-primary"/>
                                <div>
                                    <p className="font-medium">{result.examTitle || 'Quiz Attempt'}</p>
                                    <p className="text-sm text-muted-foreground">Score: {result.score}/{result.totalQuestions}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {result.partEarned && (
                                    <>
                                        <Award className="h-4 w-4 text-amber-500" />
                                        <span>Part Earned: <span className="font-semibold text-foreground">{result.partEarned}</span></span>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}

// Performance Analytics types
interface QuestionPerformance {
    question: string;
    fullQuestion: string;
    attempts: number;
    correctCount: number;
    accuracy: number;
    avgTime: number;
}

interface PerformanceData {
    date: string;
    accuracy: number;
}

type TimeFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';

function getFilterDate(filter: TimeFilter): Date {
    const now = new Date();
    switch (filter) {
        case 'week':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month':
            return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case 'quarter':
            return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        case 'year':
            return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        case 'all':
        default:
            return new Date(0);
    }
}

function PerformanceAnalytics({ attempts, isLoading }: { attempts: Attempt[] | null, isLoading: boolean }) {
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [aiAnalysis, setAiAnalysis] = useState<AnalyzeStudentPerformanceOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // Filter attempts based on time filter
    const filteredAttempts = useMemo(() => {
        if (!attempts) return [];
        const filterDate = getFilterDate(timeFilter);
        return attempts.filter(a => {
            const attemptDate = new Date(a.completedAt || a.startedAt);
            return attemptDate >= filterDate;
        });
    }, [attempts, timeFilter]);

    const analytics = useMemo(() => {
        if (!filteredAttempts || filteredAttempts.length === 0) {
            return {
                totalQuestions: 0,
                avgTimePerQuestion: 0,
                overallAccuracy: 0,
                weakAreas: [] as QuestionPerformance[],
                strongAreas: [] as QuestionPerformance[],
                performanceTrend: [] as PerformanceData[],
                trendDirection: 'stable' as 'improving' | 'declining' | 'stable',
            };
        }

        // Filter only completed attempts with graded answers
        const completedAttempts = filteredAttempts.filter(a => a.status === 'Completed' && a.gradedAnswers);

        // Calculate total questions answered
        const totalQuestions = completedAttempts.reduce((sum, a) => sum + (a.gradedAnswers?.length || 0), 0);

        // Calculate overall accuracy
        let totalCorrect = 0;
        completedAttempts.forEach(a => {
            a.gradedAnswers?.forEach((ga: GradedAnswer) => {
                if (ga.isCorrect) totalCorrect++;
            });
        });
        const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        // Calculate average time per question
        let totalTime = 0;
        let timeCount = 0;
        completedAttempts.forEach(a => {
            a.gradedAnswers?.forEach((ga: GradedAnswer) => {
                if (ga.timeTaken && ga.timeTaken > 0) {
                    totalTime += ga.timeTaken;
                    timeCount++;
                }
            });
        });
        const avgTimePerQuestion = timeCount > 0 ? totalTime / timeCount : 0;

        // Aggregate question performance
        const questionMap = new Map<string, { fullQuestion: string; attempts: number; correct: number; totalTime: number; timeCount: number }>();
        
        completedAttempts.forEach(a => {
            a.gradedAnswers?.forEach((ga: GradedAnswer) => {
                const questionKey = ga.questionContent?.toLowerCase().slice(0, 50) || ga.questionId;
                const existing = questionMap.get(questionKey) || { fullQuestion: ga.questionContent || '', attempts: 0, correct: 0, totalTime: 0, timeCount: 0 };
                existing.attempts++;
                if (!existing.fullQuestion) existing.fullQuestion = ga.questionContent || '';
                if (ga.isCorrect) existing.correct++;
                if (ga.timeTaken && ga.timeTaken > 0) {
                    existing.totalTime += ga.timeTaken;
                    existing.timeCount++;
                }
                questionMap.set(questionKey, existing);
            });
        });

        // Convert to array and calculate accuracy
        const questionPerformances: QuestionPerformance[] = Array.from(questionMap.entries()).map(([question, data]) => ({
            question: question.length > 30 ? question.slice(0, 30) + '...' : question,
            fullQuestion: data.fullQuestion,
            attempts: data.attempts,
            correctCount: data.correct,
            accuracy: Math.round((data.correct / data.attempts) * 100),
            avgTime: data.timeCount > 0 ? data.totalTime / data.timeCount : 0,
        }));

        // Sort by accuracy to get weak and strong areas
        const sortedByAccuracy = [...questionPerformances].sort((a, b) => a.accuracy - b.accuracy);
        const weakAreas = sortedByAccuracy.filter(q => q.accuracy < 70).slice(0, 5);
        const strongAreas = sortedByAccuracy.filter(q => q.accuracy >= 70).reverse().slice(0, 5);

        // Calculate performance trend over time
        const attemptsByDate = new Map<string, { total: number; correct: number }>();
        completedAttempts.forEach(a => {
            const dateKey = new Date(a.completedAt || a.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const existing = attemptsByDate.get(dateKey) || { total: 0, correct: 0 };
            a.gradedAnswers?.forEach((ga: GradedAnswer) => {
                existing.total++;
                if (ga.isCorrect) existing.correct++;
            });
            attemptsByDate.set(dateKey, existing);
        });

        const performanceTrend: PerformanceData[] = Array.from(attemptsByDate.entries())
            .map(([date, data]) => ({
                date,
                accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
            }))
            .slice(-10); // Last 10 data points

        // Determine trend direction
        let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
        if (performanceTrend.length >= 2) {
            const recentAvg = performanceTrend.slice(-3).reduce((sum, p) => sum + p.accuracy, 0) / Math.min(3, performanceTrend.length);
            const olderAvg = performanceTrend.slice(0, Math.max(1, performanceTrend.length - 3)).reduce((sum, p) => sum + p.accuracy, 0) / Math.max(1, performanceTrend.length - 3);
            if (recentAvg > olderAvg + 5) trendDirection = 'improving';
            else if (recentAvg < olderAvg - 5) trendDirection = 'declining';
        }

        return {
            totalQuestions,
            avgTimePerQuestion,
            overallAccuracy,
            weakAreas,
            strongAreas,
            performanceTrend,
            trendDirection,
        };
    }, [filteredAttempts]);

    // Function to analyze with AI
    const runAIAnalysis = useCallback(async () => {
        if (!filteredAttempts || filteredAttempts.length === 0) return;
        
        setIsAnalyzing(true);
        setAnalysisError(null);
        
        try {
            // Collect all question attempts for AI analysis
            const completedAttempts = filteredAttempts.filter(a => a.status === 'Completed' && a.gradedAnswers);
            const questionAttempts = completedAttempts.flatMap(a => 
                (a.gradedAnswers || []).map((ga: GradedAnswer) => ({
                    questionContent: ga.questionContent || '',
                    isCorrect: ga.isCorrect,
                    studentAnswer: Array.isArray(ga.answer) ? ga.answer.join(', ') : String(ga.answer || ''),
                    correctAnswer: ga.correctAnswer || undefined,
                    timeTaken: ga.timeTaken || 0,
                }))
            ).slice(0, 50); // Limit to 50 questions for API limits

            if (questionAttempts.length === 0) {
                setAnalysisError('No completed attempts to analyze');
                return;
            }

            const result = await analyzeStudentPerformance({
                totalAttempts: completedAttempts.length,
                totalQuestions: analytics.totalQuestions,
                overallAccuracy: analytics.overallAccuracy,
                avgTimePerQuestion: analytics.avgTimePerQuestion,
                questionAttempts,
            });

            setAiAnalysis(result);
        } catch (error: any) {
            console.error('AI Analysis error:', error);
            setAnalysisError(error.message || 'Failed to analyze performance');
        } finally {
            setIsAnalyzing(false);
        }
    }, [filteredAttempts, analytics]);

    // Reset AI analysis when filter changes
    useEffect(() => {
        setAiAnalysis(null);
        setAnalysisError(null);
    }, [timeFilter]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-1/3" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!attempts || attempts.length === 0) {
        return (
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Complete some quizzes to see your performance analytics!</p>
                </CardContent>
            </Card>
        );
    }

    const formatTime = (seconds: number) => {
        if (seconds === 0 || isNaN(seconds)) return 'N/A';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-semibold tracking-tight">Performance Analytics</h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Time period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Last Week</SelectItem>
                                <SelectItem value="month">Last Month</SelectItem>
                                <SelectItem value="quarter">Last 3 Months</SelectItem>
                                <SelectItem value="year">Last Year</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Badge variant={analytics.trendDirection === 'improving' ? 'default' : analytics.trendDirection === 'declining' ? 'destructive' : 'secondary'}>
                        {analytics.trendDirection === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
                        {analytics.trendDirection === 'declining' && <TrendingDown className="h-3 w-3 mr-1" />}
                        {analytics.trendDirection.charAt(0).toUpperCase() + analytics.trendDirection.slice(1)}
                    </Badge>
                </div>
            </div>

            {filteredAttempts.length === 0 ? (
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No data available for the selected time period. Try selecting a different filter.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="tracking-tight text-sm font-medium">Total Questions</div>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-2xl font-bold">{analytics.totalQuestions}</div>
                                <p className="text-xs text-muted-foreground">Questions answered</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="tracking-tight text-sm font-medium">Avg Time/Question</div>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-2xl font-bold">{formatTime(analytics.avgTimePerQuestion)}</div>
                                <p className="text-xs text-muted-foreground">Average response time</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="tracking-tight text-sm font-medium">Overall Accuracy</div>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-2xl font-bold">{analytics.overallAccuracy}%</div>
                                <p className="text-xs text-muted-foreground">Correct answers</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="tracking-tight text-sm font-medium">Attempts</div>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-2xl font-bold">{filteredAttempts.filter(a => a.status === 'Completed').length}</div>
                                <p className="text-xs text-muted-foreground">Completed quizzes</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Accuracy Over Time Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Accuracy Over Time</CardTitle>
                                <CardDescription>Your performance trend</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analytics.performanceTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={analytics.performanceTrend}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
                                            <Line 
                                                type="monotone" 
                                                dataKey="accuracy" 
                                                stroke="hsl(var(--primary))" 
                                                strokeWidth={2}
                                                dot={{ fill: '#fff', strokeWidth: 2 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-muted-foreground text-center py-12">No performance data yet</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Question Performance Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Question Performance</CardTitle>
                                <CardDescription>Accuracy by question type</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analytics.weakAreas.length > 0 || analytics.strongAreas.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={[...analytics.weakAreas, ...analytics.strongAreas].slice(0, 8)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" domain={[0, 100]} />
                                            <YAxis dataKey="question" type="category" width={120} tick={{ fontSize: 11 }} />
                                            <Tooltip 
                                                formatter={(value) => [`${value}%`, 'Accuracy']}
                                                labelFormatter={(label) => {
                                                    const item = [...analytics.weakAreas, ...analytics.strongAreas].find(a => a.question === label);
                                                    return item?.fullQuestion || label;
                                                }}
                                            />
                                            <Bar dataKey="accuracy" fill="hsl(var(--primary))" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-muted-foreground text-center py-12">Not enough data yet</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* AI Analysis Section */}
                    <Card className="border-2 border-primary/20">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-primary" />
                                    <CardTitle>AI-Powered Analysis</CardTitle>
                                </div>
                                <Button 
                                    onClick={runAIAnalysis} 
                                    disabled={isAnalyzing || filteredAttempts.length === 0}
                                    variant={aiAnalysis ? "outline" : "default"}
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            {aiAnalysis ? 'Re-analyze' : 'Analyze with AI'}
                                        </>
                                    )}
                                </Button>
                            </div>
                            <CardDescription>
                                Get personalized insights about your strengths, weaknesses, and recommendations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analysisError && (
                                <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
                                    {analysisError}
                                </div>
                            )}

                            {!aiAnalysis && !isAnalyzing && !analysisError && (
                                <p className="text-muted-foreground text-center py-8">
                                    Click "Analyze with AI" to get detailed insights about your performance
                                </p>
                            )}

                            {isAnalyzing && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-muted-foreground">Analyzing your performance data...</p>
                                </div>
                            )}

                            {aiAnalysis && !isAnalyzing && (
                                <div className="space-y-6">
                                    {/* Overall Assessment */}
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                        <h4 className="font-semibold mb-2">Overall Assessment</h4>
                                        <p className="text-sm text-muted-foreground">{aiAnalysis.overallAssessment}</p>
                                    </div>

                                    {/* Strengths */}
                                    {aiAnalysis.strengths.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-500" />
                                                Your Strengths
                                            </h4>
                                            <div className="space-y-3">
                                                {aiAnalysis.strengths.map((strength, index) => (
                                                    <div key={index} className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                        <h5 className="font-medium text-green-600 dark:text-green-400">{strength.topic}</h5>
                                                        <p className="text-sm text-muted-foreground mt-1">{strength.description}</p>
                                                        {strength.relatedQuestions.length > 0 && (
                                                            <div className="mt-2">
                                                                <p className="text-xs font-medium text-muted-foreground">Related Questions:</p>
                                                                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                                                                    {strength.relatedQuestions.map((q, i) => (
                                                                        <li key={i} className="truncate">• {q}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Weaknesses */}
                                    {aiAnalysis.weaknesses.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-destructive" />
                                                Areas for Improvement
                                            </h4>
                                            <div className="space-y-3">
                                                {aiAnalysis.weaknesses.map((weakness, index) => (
                                                    <div key={index} className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                                        <h5 className="font-medium text-destructive">{weakness.topic}</h5>
                                                        <p className="text-sm text-muted-foreground mt-1">{weakness.description}</p>
                                                        {weakness.relatedQuestions.length > 0 && (
                                                            <div className="mt-2">
                                                                <p className="text-xs font-medium text-muted-foreground">Related Questions:</p>
                                                                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                                                                    {weakness.relatedQuestions.map((q, i) => (
                                                                        <li key={i} className="truncate">• {q}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recommendations */}
                                    {aiAnalysis.recommendations.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-primary" />
                                                Recommendations
                                            </h4>
                                            <ul className="space-y-2">
                                                {aiAnalysis.recommendations.map((rec, index) => (
                                                    <li key={index} className="flex items-start gap-2 text-sm">
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                                                            {index + 1}
                                                        </span>
                                                        <span className="text-muted-foreground">{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Basic Weak Areas List (fallback when AI not used) */}
                    {!aiAnalysis && analytics.weakAreas.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Questions Needing Practice</CardTitle>
                                <CardDescription>Focus on these questions to improve your performance</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {analytics.weakAreas.map((area, index) => (
                                        <div key={index} className="p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm">{area.fullQuestion}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {area.attempts} attempts • Avg time: {formatTime(area.avgTime)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <div className="text-right">
                                                        <p className={`text-sm font-semibold ${area.accuracy < 50 ? 'text-destructive' : 'text-amber-500'}`}>
                                                            {area.accuracy}%
                                                        </p>
                                                        <Progress value={area.accuracy} className="w-20 h-2 mt-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Basic Strong Areas (fallback when AI not used) */}
                    {!aiAnalysis && analytics.strongAreas.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Strong Areas</CardTitle>
                                <CardDescription>Questions you've mastered</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analytics.strongAreas.map((area, index) => (
                                        <div key={index} className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                            <div className="flex items-start justify-between gap-4">
                                                <p className="text-sm flex-1">{area.fullQuestion}</p>
                                                <Badge variant="default" className="bg-green-500 flex-shrink-0">
                                                    {area.accuracy}%
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

const joinExamSchema = z.object({
  accessCode: z.string().min(6, 'Access code must be 6 characters.').max(6, 'Access code must be 6 characters.'),
});

function JoinExam() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    
    const form = useForm<z.infer<typeof joinExamSchema>>({
        resolver: zodResolver(joinExamSchema),
        defaultValues: { accessCode: '' },
    });

    const handleJoinExam = async (values: z.infer<typeof joinExamSchema>) => {
        if (!firestore || !user) return;
        setIsJoining(true);
        try {
            const examsRef = collection(firestore, 'exams');
            const q = query(examsRef, where('accessCode', '==', values.accessCode));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Invalid Code', description: 'No exam found with that access code.' });
                return;
            }

            const examDoc = querySnapshot.docs[0];
            const exam = examDoc.data() as Exam;
            
            if (exam.enrolledStudentIds?.includes(user.uid)) {
                toast({ title: 'Already Enrolled', description: `You are already enrolled in "${exam.quizTitle}".` });
                 router.push(`/exam/${exam.id}/lobby`);
                return;
            }

            await updateDoc(doc(firestore, 'exams', exam.id), {
                enrolledStudentIds: arrayUnion(user.uid),
            });
            
            toast({ title: 'Successfully Enrolled!', description: `You have joined the exam: "${exam.quizTitle}".` });
            router.push(`/exam/${exam.id}/lobby`);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Joining Exam', description: error.message });
        } finally {
            setIsJoining(false);
        }
    }

    return (
        <Card className="h-full flex flex-col justify-center bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Join an Exam</CardTitle>
            <CardDescription>Enter the access code provided by your instructor.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center">
            <form onSubmit={form.handleSubmit(handleJoinExam)} className="w-full">
              <div className="flex w-full max-w-sm items-start space-x-2">
                <div className="flex-1">
                  <Input 
                    {...form.register('accessCode')}
                    placeholder="Enter Access Code" 
                    className="h-12 text-lg uppercase" 
                    maxLength={6} 
                  />
                  {form.formState.errors.accessCode && <p className="text-destructive text-xs mt-1">{form.formState.errors.accessCode.message}</p>}
                </div>
                <Button type="submit" size="lg" className="h-12" disabled={isJoining}>
                   {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    );
}

export function StudentDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  // Educational level check
  const { needsEducationalLevel, educationalLevel, educationalYear, isLoading: isProfileLoading } = useEducationalLevelCheck();
  const [showEducationalDialog, setShowEducationalDialog] = useState(false);

  // Show dialog if user needs to set educational level
  useEffect(() => {
    if (needsEducationalLevel && !isProfileLoading) {
      setShowEducationalDialog(true);
    }
  }, [needsEducationalLevel, isProfileLoading]);

  const attemptsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'attempts'), where('studentId', '==', user.uid));
  }, [user, firestore]);

  const { data: attempts, isLoading: areAttemptsLoading } = useCollection<Attempt>(attemptsQuery);
    
  return (
    <>
      {/* Educational Level Dialog */}
      <EducationalLevelDialog
        open={showEducationalDialog}
        onOpenChange={setShowEducationalDialog}
        initialValues={{
          educationalLevel,
          educationalYear,
        }}
      />
      
      <motion.div 
          className="grid grid-cols-12 gap-8 p-4 md:p-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
      >
          <motion.div className="col-span-12" variants={itemVariants}>
              <div className="flex justify-between items-center mb-4">
                  <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
                  <Button asChild>
                      <Link href="/dashboard/quizzes/create">
                          <Plus className="mr-2 h-4 w-4" /> Create Quiz
                      </Link>
                  </Button>
              </div>
          </motion.div>


      {/* My Garage */}
      <motion.div className="col-span-12 lg:col-span-4" variants={itemVariants}>
        <MyGarage attempts={attempts} isLoading={areAttemptsLoading} />
      </motion.div>

      {/* Join Exam */}
      <motion.div className="col-span-12 lg:col-span-8" variants={itemVariants}>
        <JoinExam />
      </motion.div>

      {/* Upcoming Exams */}
      <motion.div className="col-span-12" variants={itemVariants}>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Upcoming Exams</h2>
        <UpcomingExams attempts={attempts} />
      </motion.div>

      {/* Exam History */}
      <motion.div className="col-span-12" variants={itemVariants}>
        <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2">
          <History className="h-6 w-6" />
          Exam History
        </h2>
        <ExamHistory attempts={attempts} />
      </motion.div>
      
      {/* Recent Performance */}
      <motion.div className="col-span-12" variants={itemVariants}>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Recent Performance</h2>
        <RecentPerformance attempts={attempts} isLoading={areAttemptsLoading} />
      </motion.div>

      {/* Performance Analytics */}
      <motion.div className="col-span-12" variants={itemVariants}>
        <PerformanceAnalytics attempts={attempts} isLoading={areAttemptsLoading} />
      </motion.div>
    </motion.div>
    </>
  );
}
