'use client';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, BookText, Pencil, RotateCcw } from 'lucide-react';
import { GenerateFromFile } from '@/components/quiz/generate-from-file';
import { GenerateFromText } from '@/components/quiz/generate-from-text';
import { GenerateManual } from '@/components/quiz/generate-manual';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { UploadedMaterial } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
// QuizReview removed from student flow - students go directly to quiz
// QuizReview is now teacher-only feature

type GenerationStep = 'configure' | 'resuming';

export default function PracticePage() {
    const [step, setStep] = useState<GenerationStep>('configure');
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [resumeMaterial, setResumeMaterial] = useState<UploadedMaterial | null>(null);
    const [isCheckingResume, setIsCheckingResume] = useState(true);

    // Check for materials that need resuming
    useEffect(() => {
        const checkResumeStatus = async () => {
            if (!user || !firestore) {
                setIsCheckingResume(false);
                return;
            }

            try {
                // Get all user materials and filter client-side (Firestore 'in' has limit of 10)
                const materialsQuery = query(
                    collection(firestore, 'uploadedMaterials'),
                    where('userId', '==', user.uid)
                );
                const snapshot = await getDocs(materialsQuery);
                
                if (!snapshot.empty) {
                    // Get the most recent incomplete material
                    const allMaterials = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as UploadedMaterial[];
                    
                    const incompleteMaterials = allMaterials.filter(m => 
                        m.materialStatus && 
                        ['uploaded', 'answersReviewed', 'quizGenerated'].includes(m.materialStatus)
                    );
                    
                    if (incompleteMaterials.length > 0) {
                        const mostRecent = incompleteMaterials.sort((a, b) => 
                            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
                        )[0];
                        
                        setResumeMaterial(mostRecent);
                    }
                }
            } catch (error) {
                console.error('Failed to check resume status:', error);
            } finally {
                setIsCheckingResume(false);
            }
        };

        checkResumeStatus();
    }, [user, firestore]);

    const handleResume = () => {
        if (!resumeMaterial) return;

        switch (resumeMaterial.materialStatus) {
            case 'uploaded':
                // Resume at answer review
                router.push(`/dashboard/practice?resume=${resumeMaterial.id}&step=review`);
                break;
            case 'answersReviewed':
                // Resume at quiz generation
                router.push(`/dashboard/practice?resume=${resumeMaterial.id}&step=generate`);
                break;
            case 'quizGenerated':
                // Redirect to exam if quiz exists
                if (resumeMaterial.quizId) {
                    router.push(`/exam/${resumeMaterial.quizId}/page`);
                }
                break;
        }
    };

    const handleDismissResume = () => {
        setResumeMaterial(null);
    };

    if (isCheckingResume) {
        return (
            <div className="p-4 sm:p-8">
                <Card className="max-w-4xl mx-auto">
                    <CardContent className="p-8">
                        <Skeleton className="h-8 w-48 mb-4" />
                        <Skeleton className="h-4 w-96 mb-8" />
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8">
            {resumeMaterial && (
                <Card className="max-w-4xl mx-auto mb-4 bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold">Continue where you left off?</p>
                                <p className="text-sm text-muted-foreground">
                                    {resumeMaterial.fileName} - Status: {resumeMaterial.materialStatus}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleDismissResume}>
                                    Dismiss
                                </Button>
                                <Button size="sm" onClick={handleResume}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Resume
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            
             <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="max-w-4xl mx-auto">
                        <CardHeader>
                            <CardTitle className="text-2xl">Practice Quiz</CardTitle>
                            <CardDescription>Generate a quiz for practice using any of the methods below. You'll review key concepts first, then take the quiz.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="file" className="w-full">
                                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
                                    <TabsTrigger value="file" className="flex items-center gap-2"><FileUp className="h-4 w-4" /> From File</TabsTrigger>
                                    <TabsTrigger value="text" className="flex items-center gap-2"><BookText className="h-4 w-4" /> From Text</TabsTrigger>
                                    <TabsTrigger value="manual" className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Manual</TabsTrigger>
                                </TabsList>
                                <TabsContent value="file" className="pt-6">
                                    <GenerateFromFile onQuizGenerated={() => {}} />
                                </TabsContent>
                                <TabsContent value="text" className="pt-6">
                                    <GenerateFromText onQuizGenerated={() => {}} />
                                </TabsContent>
                                <TabsContent value="manual" className="pt-6">
                                    <GenerateManual onQuizGenerated={() => {}} />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
