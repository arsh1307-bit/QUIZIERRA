'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShieldAlert } from 'lucide-react';

function StudentList() {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'users'), where('role', '==', 'student'));
    }, [firestore, user]);

    const { data: students, isLoading: isLoadingStudents, error } = useCollection<UserProfile>(studentsQuery);
    
    const getInitials = (name: string) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0][0] + names[1][0];
        }
        return names[0]?.[0] || 'U';
    }

    if (isLoadingStudents) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <Card key={i} className="p-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        )
    }

    if (error) {
         return (
             <Card className="mt-8 text-center py-16">
                 <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
                   <ShieldAlert className="h-10 w-10 text-destructive" />
                </div>
                <CardHeader>
                    <CardTitle>Permission Denied</CardTitle>
                    <CardDescription className="max-w-md mx-auto">
                        Your account does not have the required permissions to view the student list. In the demo, the 'instructor' role lacks the necessary custom claims. An administrator must grant this permission.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    if (!students || students.length === 0) {
        return (
            <Card className="mt-8 text-center py-16">
                 <div className="mx-auto bg-muted/50 p-4 rounded-full w-fit">
                   <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <CardHeader>
                    <CardTitle>No Students Found</CardTitle>
                    <CardDescription>
                        There are currently no students enrolled in the system.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {students.map(student => (
                <Card key={student.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={undefined} alt={student.displayName} />
                            <AvatarFallback>{getInitials(student.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{student.displayName}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}


export default function StudentsPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold tracking-tight mb-8">Students</h1>
            <StudentList />
        </div>
    )
}
