'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Quiz } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ScheduleExamDialog } from '@/components/quiz/schedule-exam-dialog';
import { useState } from 'react';

function QuizList() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [schedulingQuiz, setSchedulingQuiz] = useState<Quiz | null>(null);

    const quizzesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'quizzes'), where('createdBy', '==', user.uid));
    }, [user, firestore]);

    const { data: quizzes, isLoading } = useCollection<Quiz>(quizzesQuery);

    if (isLoading) {
        return (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3 mt-2" /></CardContent>
                        <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                    </Card>
                ))}
            </div>
        );
    }

    if (!quizzes || quizzes.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Quizzes Found</h3>
                <p className="text-muted-foreground mt-2 mb-4">Get started by creating your first quiz.</p>
                <Button asChild>
                    <Link href="/dashboard/quizzes/create">
                        <Plus className="mr-2 h-4 w-4" /> Create Quiz
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {quizzes.map(quiz => (
                    <Card key={quiz.id}>
                        <CardHeader>
                            <CardTitle>{quiz.title}</CardTitle>
                            <CardDescription>{quiz.description || 'No description available.'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                {quiz.questionIds?.length || 0} questions
                            </p>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={() => setSchedulingQuiz(quiz)}>Schedule</Button>
                            <Button asChild>
                                <Link href={`/dashboard/quizzes/${quiz.id}/results`}>View</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
             {schedulingQuiz && (
                <ScheduleExamDialog 
                    quiz={schedulingQuiz}
                    isOpen={!!schedulingQuiz}
                    onClose={() => setSchedulingQuiz(null)}
                />
            )}
        </>
    )
}


export default function QuizzesPage() {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight">My Quizzes</h1>
                <Button asChild>
                    <Link href="/dashboard/quizzes/create">
                        <Plus className="mr-2 h-4 w-4" /> Create New Quiz
                    </Link>
                </Button>
            </div>
            <QuizList />
        </div>
    )
}
