'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Class, UserProfile, Exam, Attempt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Copy, QrCode, BookOpen, BarChart, UserPlus, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ClassPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    const { user } = useUser();
    const firestore = useFirestore();
    const [copied, setCopied] = useState(false);

    const classRef = useMemoFirebase(() => {
        if (!firestore || !classId) return null;
        return doc(firestore, 'classes', classId);
    }, [firestore, classId]);

    const { data: classData, isLoading: isLoadingClass } = useDoc<Class>(classRef);

    // Get enrolled students
    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || !classData?.enrolledStudentIds || classData.enrolledStudentIds.length === 0) return null;
        return query(
            collection(firestore, 'users'),
            where('id', 'in', classData.enrolledStudentIds.slice(0, 10)) // Firestore 'in' limit
        );
    }, [firestore, classData]);

    const { data: students } = useCollection<UserProfile>(studentsQuery);

    // Get assigned quizzes
    const quizzesQuery = useMemoFirebase(() => {
        if (!firestore || !classData?.assignedQuizIds || classData.assignedQuizIds.length === 0) return null;
        return query(
            collection(firestore, 'exams'),
            where('id', 'in', classData.assignedQuizIds.slice(0, 10))
        );
    }, [firestore, classData]);

    const { data: quizzes } = useCollection<Exam>(quizzesQuery);

    const copyClassCode = () => {
        if (classData?.classCode) {
            navigator.clipboard.writeText(classData.classCode);
            setCopied(true);
            toast({ title: 'Class Code Copied!', description: 'Share this code with your students.' });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isLoadingClass) {
        return (
            <div className="p-8">
                <Skeleton className="h-10 w-48 mb-8" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!classData) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Class not found.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="ghost" asChild>
                        <Link href="/dashboard/classes">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Classes
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight mt-4">{classData.name}</h1>
                    <p className="text-muted-foreground">{classData.subject}</p>
                </div>
            </div>

            {/* Class Code Card */}
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Class Code
                    </CardTitle>
                    <CardDescription>Share this code with students to join the class</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <Input
                                value={classData.classCode}
                                readOnly
                                className="text-2xl font-mono text-center font-bold"
                            />
                        </div>
                        <Button onClick={copyClassCode} variant="outline">
                            <Copy className="h-4 w-4 mr-2" />
                            {copied ? 'Copied!' : 'Copy'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="students" className="w-full">
                <TabsList>
                    <TabsTrigger value="students">Students ({classData.enrolledStudentIds.length})</TabsTrigger>
                    <TabsTrigger value="quizzes">Assigned Quizzes ({classData.assignedQuizIds.length})</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Enrolled Students</CardTitle>
                                <Button variant="outline" size="sm">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Invite Students
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!students || students.length === 0 ? (
                                <p className="text-muted-foreground text-center p-4">
                                    No students enrolled yet. Share the class code to invite students.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {students.map((student) => (
                                        <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <p className="font-medium">{student.displayName}</p>
                                                <p className="text-sm text-muted-foreground">{student.email}</p>
                                            </div>
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/students/${student.id}`}>
                                                    View Progress
                                                </Link>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="quizzes" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Assigned Quizzes</CardTitle>
                                <Button asChild>
                                    <Link href="/dashboard/quizzes/create">
                                        Assign New Quiz
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!quizzes || quizzes.length === 0 ? (
                                <p className="text-muted-foreground text-center p-4">
                                    No quizzes assigned yet. Create and assign a quiz to get started.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {quizzes.map((quiz) => (
                                        <Card key={quiz.id} className="bg-card">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-semibold">{quiz.quizTitle}</h3>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Badge variant={quiz.status === 'Live Now' ? 'default' : 'secondary'}>
                                                                {quiz.status}
                                                            </Badge>
                                                            <span className="text-sm text-muted-foreground">
                                                                Scheduled: {new Date(quiz.scheduledTime).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link href={`/dashboard/quizzes/${quiz.id}/analytics`}>
                                                                <BarChart className="h-4 w-4 mr-2" />
                                                                Analytics
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Class Analytics</CardTitle>
                            <CardDescription>Overall performance metrics for this class</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center p-8">
                                Analytics dashboard coming soon. View individual quiz analytics from the Quizzes tab.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

