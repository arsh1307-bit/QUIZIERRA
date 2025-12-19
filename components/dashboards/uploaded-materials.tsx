'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, BookOpen, Trash2, Play, Eye } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, deleteDoc, doc } from 'firebase/firestore';
import type { UploadedMaterial } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

export function UploadedMaterials() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const materialsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'uploadedMaterials'), where('userId', '==', user.uid));
    }, [user, firestore]);

    const { data: materials, isLoading } = useCollection<UploadedMaterial>(materialsQuery);

    const handleDelete = async (materialId: string) => {
        if (!firestore || !user) return;
        
        setDeletingId(materialId);
        try {
            await deleteDoc(doc(firestore, 'uploadedMaterials', materialId));
            toast({ title: 'Material Deleted', description: 'The uploaded material has been removed.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete material.' });
        } finally {
            setDeletingId(null);
        }
    };

    const handleStartQuiz = (material: UploadedMaterial) => {
        if (material.quizId) {
            router.push(`/dashboard/practice?materialId=${material.id}`);
        } else {
            // Generate quiz from material
            router.push(`/dashboard/practice?materialId=${material.id}&generate=true`);
        }
    };

    const handleReviewAnswers = (material: UploadedMaterial) => {
        if (material.keyAnswers && material.keyAnswers.length > 0) {
            router.push(`/dashboard/materials/${material.id}/review`);
        } else {
            toast({ variant: 'destructive', title: 'No Answers Available', description: 'Key answers have not been generated for this material yet.' });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-10 w-full mt-4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!materials || materials.length === 0) {
        return (
            <Card className="bg-muted/50">
                <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No uploaded materials yet.</p>
                    <Button className="mt-4" onClick={() => router.push('/dashboard/practice')}>
                        Upload Your First Material
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight">Uploaded Materials</h2>
                <Button onClick={() => router.push('/dashboard/practice')}>
                    Upload New Material
                </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {materials.map((material) => (
                    <Card key={material.id} className="bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        {material.fileName}
                                    </CardTitle>
                                    <CardDescription className="mt-2 flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(material.uploadedAt).toLocaleDateString()}
                                        </span>
                                        {material.subject && (
                                            <Badge variant="secondary">{material.subject}</Badge>
                                        )}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {material.quizCompleted !== undefined && (
                                <div>
                                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                        <span>Quiz Progress</span>
                                        <span>{material.quizCompleted}%</span>
                                    </div>
                                    <Progress value={material.quizCompleted} className="h-2" />
                                </div>
                            )}
                            
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReviewAnswers(material)}
                                    className="flex-1"
                                >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Review Answers
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleStartQuiz(material)}
                                    className="flex-1"
                                >
                                    <Play className="h-4 w-4 mr-1" />
                                    Start Quiz
                                </Button>
                            </div>
                            
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(material.id)}
                                disabled={deletingId === material.id}
                                className="w-full text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {deletingId === material.id ? 'Deleting...' : 'Delete'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

