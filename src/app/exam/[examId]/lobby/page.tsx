'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Exam } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

function CountdownTimer({ targetDate, examId }: { targetDate: string, examId: string }) {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        };

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            if (Object.values(newTimeLeft).every(val => val === 0)) {
                router.push(`/exam/${examId}`);
            }
        }, 1000);

        return () => clearTimeout(timer);
    });

    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
        if (value === 0 && interval !== 'seconds' && timeLeft.days === 0 && (interval !== 'minutes' || timeLeft.hours === 0)) return null;
        return (
            <div key={interval} className="flex flex-col items-center">
                <span className="text-4xl font-bold">{value.toString().padStart(2, '0')}</span>
                <span className="text-xs text-muted-foreground uppercase">{interval}</span>
            </div>
        );
    });

    return (
        <div className="flex justify-center gap-4 sm:gap-8 my-8">
            {timerComponents.filter(c => c).length > 0 ? timerComponents : <span>Starting...</span>}
        </div>
    );
}

export default function ExamLobbyPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const examId = params.examId as string;

    const examRef = useMemoFirebase(() => {
        if (!firestore || !examId) return null;
        return doc(firestore, 'exams', examId);
    }, [firestore, examId]);

    const { data: exam, isLoading: isExamLoading } = useDoc<Exam>(examRef);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);
    
     useEffect(() => {
        if (!isExamLoading && exam && user) {
            if (!exam.enrolledStudentIds?.includes(user.uid)) {
                toast({
                    title: "Not Enrolled",
                    description: "You are not enrolled in this exam.",
                    variant: "destructive",
                });
                router.push('/dashboard');
            }
        }
    }, [exam, isExamLoading, user, router]);

    if (isUserLoading || isExamLoading || !exam) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent className="text-center">
                         <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-32 mx-auto mt-6" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    const isExamReady = new Date(exam.scheduledTime) <= new Date();

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">{exam.quizTitle}</CardTitle>
                    <CardDescription>You are in the waiting room. The exam will begin shortly.</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <Clock className="mx-auto h-12 w-12 text-primary" />
                    <h2 className="text-lg font-semibold mt-6 mb-2">Exam Starts In</h2>
                    <CountdownTimer targetDate={exam.scheduledTime} examId={examId} />

                    <Button 
                        disabled={!isExamReady} 
                        onClick={() => router.push(`/exam/${examId}`)}
                        size="lg"
                        className="w-full"
                    >
                        {isExamReady ? 'Enter Exam' : (
                            <>
                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Please wait...
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}