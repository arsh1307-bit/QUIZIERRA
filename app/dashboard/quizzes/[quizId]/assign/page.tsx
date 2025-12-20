'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Quiz, Class, QuizAssignment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, ArrowLeft, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const assignmentSchema = z.object({
    assignTo: z.enum(['class', 'students', 'self']),
    classId: z.string().optional(),
    studentIds: z.array(z.string()).optional(),
    startDate: z.date().optional(),
    dueDate: z.date().optional(),
    allowLateSubmission: z.boolean().default(false),
    shuffleQuestions: z.boolean().default(true),
    maxAttempts: z.coerce.number().min(1).max(10).optional(),
    timeLimit: z.coerce.number().min(5).max(300).optional(),
});

export default function AssignQuizPage() {
    const params = useParams();
    const router = useRouter();
    const quizId = params.quizId as string;
    const { user } = useUser();
    const firestore = useFirestore();
    const [isAssigning, setIsAssigning] = useState(false);

    const quizRef = useMemoFirebase(() => {
        if (!firestore || !quizId) return null;
        return doc(firestore, 'quizzes', quizId);
    }, [firestore, quizId]);

    const { data: quiz, isLoading: isLoadingQuiz } = useDoc<Quiz>(quizRef);

    // Get teacher's classes
    const classesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'classes'), where('createdBy', '==', user.uid));
    }, [user, firestore]);

    const { data: classes } = useCollection<Class>(classesQuery);

    const form = useForm<z.infer<typeof assignmentSchema>>({
        resolver: zodResolver(assignmentSchema),
        defaultValues: {
            assignTo: 'class',
            allowLateSubmission: false,
            shuffleQuestions: true,
            maxAttempts: 1,
        },
    });

    const assignTo = form.watch('assignTo');

    const onSubmit = async (values: z.infer<typeof assignmentSchema>) => {
        if (!user || !firestore || !quiz) {
            toast({ variant: 'destructive', title: 'Error', description: 'Missing required information.' });
            return;
        }

        setIsAssigning(true);
        try {
            // Create quiz assignment
            const assignmentData: Omit<QuizAssignment, 'id'> = {
                quizId: quiz.id,
                assignedBy: user.uid,
                assignedAt: new Date().toISOString(),
                startDate: values.startDate?.toISOString(),
                dueDate: values.dueDate?.toISOString(),
                allowLateSubmission: values.allowLateSubmission || false,
                shuffleQuestions: values.shuffleQuestions ?? true,
                maxAttempts: values.maxAttempts || 1,
                timeLimit: values.timeLimit,
                status: values.startDate && new Date(values.startDate) > new Date() ? 'scheduled' : 'active',
            };

            if (values.assignTo === 'class' && values.classId) {
                assignmentData.classId = values.classId;
                // Update class with assigned quiz
                await updateDoc(doc(firestore, 'classes', values.classId), {
                    assignedQuizIds: arrayUnion(quiz.id),
                });
            } else if (values.assignTo === 'students' && values.studentIds) {
                assignmentData.studentIds = values.studentIds;
            }

            await addDoc(collection(firestore, 'quizAssignments'), assignmentData);

            // Create exam from quiz
            const examData = {
                quizId: quiz.id,
                quizTitle: quiz.title,
                scheduledTime: values.startDate?.toISOString() || new Date().toISOString(),
                status: 'Scheduled' as const,
                accessCode: generateAccessCode(),
                createdBy: user.uid,
                createdAt: new Date().toISOString(),
                enrolledStudentIds: values.assignTo === 'class' && values.classId
                    ? (classes?.find(c => c.id === values.classId)?.enrolledStudentIds || [])
                    : values.studentIds || [],
            };

            const examRef = await addDoc(collection(firestore, 'exams'), examData);

            toast({ 
                title: 'Quiz Assigned!', 
                description: `Quiz has been assigned successfully. Access code: ${examData.accessCode}` 
            });
            
            router.push(`/dashboard/quizzes/${quiz.id}/analytics`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to assign quiz.' });
        } finally {
            setIsAssigning(false);
        }
    };

    function generateAccessCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    if (isLoadingQuiz) {
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

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" asChild>
                    <Link href="/dashboard/quizzes">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Assign Quiz</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{quiz.title}</CardTitle>
                    <CardDescription>Configure assignment settings and assign to students or classes</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="assignTo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assign To</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="class">Entire Class</SelectItem>
                                                <SelectItem value="students">Selected Students</SelectItem>
                                                <SelectItem value="self">Self-Practice (No Grading)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {assignTo === 'class' && (
                                <FormField
                                    control={form.control}
                                    name="classId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Class</FormLabel>
                                            <Select onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choose a class" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {classes?.map((classItem) => (
                                                        <SelectItem key={classItem.id} value={classItem.id}>
                                                            {classItem.name} ({classItem.enrolledStudentIds.length} students)
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Date (Optional)</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="dueDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Due Date (Optional)</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="maxAttempts"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Attempts</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={1} max={10} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="timeLimit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Time Limit (minutes)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={5} max={300} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="shuffleQuestions"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Shuffle Questions</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="allowLateSubmission"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Allow Late Submission</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isAssigning}>
                                {isAssigning ? 'Assigning...' : 'Assign Quiz'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

