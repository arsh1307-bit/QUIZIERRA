'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase';
import type { Attempt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

// Helper to get max possible score for an attempt
function getMaxPossibleScore(attempt: Attempt): number {
    if (attempt.isAdaptive && (attempt as any).maxPossibleScore) {
        return (attempt as any).maxPossibleScore;
    }
    return attempt.totalQuestions * 10;
}

function StudentResults() {
    const { user } = useUser();
    const firestore = useFirestore();

    const attemptsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'attempts'), where('studentId', '==', user.uid));
    }, [user, firestore]);

    const { data: attempts, isLoading } = useCollection<Attempt>(attemptsQuery);
    
    if (isLoading) {
        return <Skeleton className="h-64 w-full" />
    }

    if (!attempts || attempts.length === 0) {
        return <p className="text-muted-foreground mt-4">No results found.</p>
    }

    const computeAccuracy = (attempt: Attempt) => {
        if (!attempt.gradedAnswers || attempt.gradedAnswers.length === 0) return '-';
        const correct = attempt.gradedAnswers.filter(a => a.isCorrect).length;
        const total = attempt.gradedAnswers.length;
        return `${Math.round((correct / total) * 100)}%`;
    };

    const computeAvgTime = (attempt: Attempt) => {
        if (!attempt.answers || attempt.answers.length === 0) return '-';
        const totalSeconds = attempt.answers.reduce((sum, a) => sum + (a.timeTaken || 0), 0);
        const avg = totalSeconds / attempt.answers.length;
        return `${avg.toFixed(1)}s`;
    };

    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Exam</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Avg Time / Q</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {attempts.map(attempt => {
                        const maxScore = getMaxPossibleScore(attempt);
                        const percentage = maxScore > 0 ? Math.round((attempt.score / maxScore) * 100) : 0;
                        return (
                            <TableRow key={attempt.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {attempt.examTitle || 'N/A'}
                                        {attempt.isAdaptive && (
                                            <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-300">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Adaptive
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{attempt.score}/{maxScore}</TableCell>
                                <TableCell className="font-bold">{percentage}%</TableCell>
                                <TableCell>{computeAccuracy(attempt)}</TableCell>
                                <TableCell>{computeAvgTime(attempt)}</TableCell>
                                <TableCell><Badge variant={attempt.status === 'Completed' ? 'default' : 'secondary'}>{attempt.status}</Badge></TableCell>
                                <TableCell>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : 'In Progress'}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Card>
    )
}

function InstructorResults() {
    const firestore = useFirestore();
    // In a real app, you'd filter by instructor's exams
    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'attempts'));
    }, [firestore]);

    const { data: attempts, isLoading } = useCollection<Attempt>(attemptsQuery);
    
    if (isLoading) {
        return <Skeleton className="h-64 w-full" />
    }

    if (!attempts || attempts.length === 0) {
        return <p className="text-muted-foreground mt-4">No results found.</p>
    }
    
    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Exam</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {attempts.map(attempt => {
                        const maxScore = getMaxPossibleScore(attempt);
                        const percentage = maxScore > 0 ? Math.round((attempt.score / maxScore) * 100) : 0;
                        return (
                            <TableRow key={attempt.id}>
                                <TableCell className="font-mono text-xs">{attempt.studentId.substring(0,10)}...</TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {attempt.examTitle || 'N/A'}
                                        {attempt.isAdaptive && (
                                            <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-300">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Adaptive
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{attempt.score}/{maxScore}</TableCell>
                                <TableCell className="font-bold">{percentage}%</TableCell>
                                <TableCell><Badge variant={attempt.status === 'Completed' ? 'default' : 'secondary'}>{attempt.status}</Badge></TableCell>
                                <TableCell>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : 'In Progress'}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Card>
    )
}

export default function ResultsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  if (isUserLoading || isProfileLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }
  
  const renderResultsByRole = () => {
    switch (userProfile?.role) {
      case 'student':
        return <StudentResults />;
      case 'instructor':
        return <InstructorResults />;
      default:
        return <div>You do not have permission to view results.</div>;
    }
  }

  return (
    <div className="p-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Results</h1>
        {renderResultsByRole()}
    </div>
  )
}
