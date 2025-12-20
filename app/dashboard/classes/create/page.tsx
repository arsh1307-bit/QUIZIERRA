'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Class } from '@/lib/types';

const formSchema = z.object({
    name: z.string().min(3, 'Class name must be at least 3 characters'),
    subject: z.string().min(2, 'Subject is required'),
    academicYear: z.string().optional(),
    section: z.string().optional(),
});

function generateClassCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export default function CreateClassPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            subject: '',
            academicYear: '',
            section: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a class.' });
            return;
        }

        setIsCreating(true);
        try {
            const classCode = generateClassCode();
            
            const classData: Omit<Class, 'id'> = {
                name: values.name,
                subject: values.subject,
                academicYear: values.academicYear,
                section: values.section,
                createdBy: user.uid,
                createdAt: new Date().toISOString(),
                classCode,
                enrolledStudentIds: [],
                assignedQuizIds: [],
                isArchived: false,
            };

            const classRef = await addDoc(collection(firestore, 'classes'), classData);
            
            // Update teacher's classes list
            await updateDoc(doc(firestore, 'users', user.uid), {
                classes: arrayUnion(classRef.id),
            });

            toast({ 
                title: 'Class Created!', 
                description: `Class code: ${classCode}. Share this with your students.` 
            });
            
            router.push(`/dashboard/classes/${classRef.id}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to create class.' });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <div className="mb-6">
                <Button variant="ghost" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create New Class</CardTitle>
                    <CardDescription>Set up a new class for your students to join</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Class Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., DSA - Sem 3" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Computer Science" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="academicYear"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Academic Year (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., 2024-25" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="section"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Section (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., A, B, C" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isCreating}>
                                {isCreating ? 'Creating...' : 'Create Class'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

