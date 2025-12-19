'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Class } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, BookOpen, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ClassesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const classesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'classes'), where('createdBy', '==', user.uid));
    }, [user, firestore]);

    const { data: classes, isLoading } = useCollection<Class>(classesQuery);

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-10 w-48 mb-8" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
                <Button asChild>
                    <Link href="/dashboard/classes/create">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Class
                    </Link>
                </Button>
            </div>

            {!classes || classes.length === 0 ? (
                <Card className="bg-muted/50">
                    <CardContent className="p-8 text-center">
                        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">You haven't created any classes yet.</p>
                        <Button asChild>
                            <Link href="/dashboard/classes/create">
                                Create Your First Class
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.filter(c => !c.isArchived).map((classItem) => (
                        <Card key={classItem.id} className="bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    {classItem.name}
                                    {classItem.isArchived && (
                                        <Badge variant="secondary">Archived</Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>{classItem.subject}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        {classItem.enrolledStudentIds.length} students
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <BookOpen className="h-4 w-4" />
                                        {classItem.assignedQuizIds.length} quizzes
                                    </span>
                                </div>
                                
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Class Code</p>
                                    <p className="font-mono font-bold text-lg">{classItem.classCode}</p>
                                </div>

                                <Button className="w-full" asChild>
                                    <Link href={`/dashboard/classes/${classItem.id}`}>
                                        View Class
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

