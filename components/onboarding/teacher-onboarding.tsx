'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Building, BookOpen, CheckCircle2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

type OnboardingStep = 'welcome' | 'institution' | 'subjects' | 'complete';

export function TeacherOnboarding({ onComplete }: { onComplete: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [profile, setProfile] = useState<Partial<UserProfile>>({
        institution: '',
        subjects: [],
        teacherId: '',
    });

    const handleSave = async () => {
        if (!user || !firestore) return;

        try {
            await updateDoc(doc(firestore, 'users', user.uid), {
                institution: profile.institution,
                subjects: profile.subjects || [],
                teacherId: profile.teacherId,
            });
            setStep('complete');
        } catch (error) {
            console.error('Failed to save profile:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save profile information.' });
        }
    };

    const addSubject = (subject: string) => {
        if (subject.trim() && !profile.subjects?.includes(subject.trim())) {
            setProfile({
                ...profile,
                subjects: [...(profile.subjects || []), subject.trim()],
            });
        }
    };

    const removeSubject = (subject: string) => {
        setProfile({
            ...profile,
            subjects: profile.subjects?.filter(s => s !== subject),
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-2xl w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">Teacher Profile Setup</CardTitle>
                    <CardDescription>Let's set up your teaching profile</CardDescription>
                </CardHeader>
                <CardContent>
                    <AnimatePresence mode="wait">
                        {step === 'welcome' && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4"
                            >
                                <p className="text-muted-foreground">
                                    Welcome! As a teacher, you can create quizzes, manage classes, and track student progress.
                                </p>
                                <Button onClick={() => setStep('institution')} className="w-full">
                                    Get Started
                                </Button>
                            </motion.div>
                        )}

                        {step === 'institution' && (
                            <motion.div
                                key="institution"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 text-primary mb-4">
                                    <Building className="h-5 w-5" />
                                    <h3 className="text-lg font-semibold">Institution Information</h3>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="institution">Institution Name</Label>
                                    <Input
                                        id="institution"
                                        placeholder="e.g., Stanford University"
                                        value={profile.institution}
                                        onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="teacherId">Teacher ID (Optional)</Label>
                                    <Input
                                        id="teacherId"
                                        placeholder="e.g., T-12345"
                                        value={profile.teacherId}
                                        onChange={(e) => setProfile({ ...profile, teacherId: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep('welcome')}>
                                        Back
                                    </Button>
                                    <Button onClick={() => setStep('subjects')} className="flex-1" disabled={!profile.institution}>
                                        Continue
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'subjects' && (
                            <motion.div
                                key="subjects"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 text-primary mb-4">
                                    <BookOpen className="h-5 w-5" />
                                    <h3 className="text-lg font-semibold">Subjects You Teach</h3>
                                </div>

                                <div className="space-y-2">
                                    <Label>Add Subjects</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g., Computer Science"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addSubject(e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={(e) => {
                                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                if (input) {
                                                    addSubject(input.value);
                                                    input.value = '';
                                                }
                                            }}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>

                                {profile.subjects && profile.subjects.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {profile.subjects.map((subject, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                                            >
                                                {subject}
                                                <button
                                                    onClick={() => removeSubject(subject)}
                                                    className="text-primary hover:text-primary/70"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep('institution')}>
                                        Back
                                    </Button>
                                    <Button onClick={handleSave} className="flex-1">
                                        Complete Setup
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'complete' && (
                            <motion.div
                                key="complete"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-4"
                            >
                                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                                <h3 className="text-xl font-semibold">Profile Complete!</h3>
                                <p className="text-muted-foreground">
                                    Your teacher profile has been set up. You can start creating classes and quizzes.
                                </p>
                                <Button onClick={onComplete} className="w-full">
                                    Go to Dashboard
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
}

