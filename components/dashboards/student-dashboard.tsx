'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Clock, Award, Car, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import type { Attempt, Exam } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { CAR_PARTS } from '@/lib/car-parts';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

function UpcomingExams() {
    const { user } = useUser();
    const firestore = useFirestore();

    const examsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'exams'), where('enrolledStudentIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: exams, isLoading } = useCollection<Exam>(examsQuery);
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
                ))}
            </div>
        )
    }

    if (!exams || exams.length === 0) {
        return <p className="text-muted-foreground">No upcoming exams found. Join one with an access code!</p>
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
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

  const attemptsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'attempts'), where('studentId', '==', user.uid));
  }, [user, firestore]);

  const { data: attempts, isLoading: areAttemptsLoading } = useCollection<Attempt>(attemptsQuery);
    
  return (
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
        <UpcomingExams />
      </motion.div>
      
      {/* Recent Performance */}
      <motion.div className="col-span-12" variants={itemVariants}>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Recent Performance</h2>
        <RecentPerformance attempts={attempts} isLoading={areAttemptsLoading} />
      </motion.div>
    </motion.div>
  );
}
