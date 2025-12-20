'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Target, BookOpen, CheckCircle2 } from 'lucide-react';
import type { UserPreferences } from '@/lib/types';

type OnboardingStep = 'welcome' | 'class' | 'goal' | 'complete';

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
        class: '',
        subject: '',
        goal: undefined,
        defaultDifficulty: 'medium',
        defaultQuizLength: 10,
    });

    const handleSave = async () => {
        if (!user || !firestore) return;

        try {
            await setDoc(doc(firestore, 'userPreferences', user.uid), {
                ...preferences,
                userId: user.uid,
                onboardingCompleted: true,
            }, { merge: true });
            setStep('complete');
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-2xl w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">Welcome to Quizierra!</CardTitle>
                    <CardDescription>Let's personalize your learning experience</CardDescription>
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
                                    We'll ask you a few quick questions to customize your quiz experience.
                                </p>
                                <Button onClick={() => setStep('class')} className="w-full">
                                    Get Started
                                </Button>
                            </motion.div>
                        )}

                        {step === 'class' && (
                            <motion.div
                                key="class"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 text-primary mb-4">
                                    <GraduationCap className="h-5 w-5" />
                                    <h3 className="text-lg font-semibold">Class & Subject (Optional)</h3>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="class">Class / Course</Label>
                                    <Input
                                        id="class"
                                        placeholder="e.g., CS101, Math 201"
                                        value={preferences.class}
                                        onChange={(e) => setPreferences({ ...preferences, class: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input
                                        id="subject"
                                        placeholder="e.g., Computer Science, Mathematics"
                                        value={preferences.subject}
                                        onChange={(e) => setPreferences({ ...preferences, subject: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep('welcome')}>
                                        Back
                                    </Button>
                                    <Button onClick={() => setStep('goal')} className="flex-1">
                                        Continue
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'goal' && (
                            <motion.div
                                key="goal"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 text-primary mb-4">
                                    <Target className="h-5 w-5" />
                                    <h3 className="text-lg font-semibold">What's your goal?</h3>
                                </div>

                                <RadioGroup
                                    value={preferences.goal}
                                    onValueChange={(value) => setPreferences({ ...preferences, goal: value as any })}
                                >
                                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50">
                                        <RadioGroupItem value="exam" id="exam" />
                                        <Label htmlFor="exam" className="flex-1 cursor-pointer">
                                            <div className="font-medium">Exam Preparation</div>
                                            <div className="text-sm text-muted-foreground">Preparing for an upcoming test</div>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50">
                                        <RadioGroupItem value="revision" id="revision" />
                                        <Label htmlFor="revision" className="flex-1 cursor-pointer">
                                            <div className="font-medium">Revision</div>
                                            <div className="text-sm text-muted-foreground">Reviewing previously learned material</div>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50">
                                        <RadioGroupItem value="concept_clarity" id="concept_clarity" />
                                        <Label htmlFor="concept_clarity" className="flex-1 cursor-pointer">
                                            <div className="font-medium">Concept Clarity</div>
                                            <div className="text-sm text-muted-foreground">Understanding new concepts better</div>
                                        </Label>
                                    </div>
                                </RadioGroup>

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep('class')}>
                                        Back
                                    </Button>
                                    <Button onClick={handleSave} className="flex-1" disabled={!preferences.goal}>
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
                                <h3 className="text-xl font-semibold">All Set!</h3>
                                <p className="text-muted-foreground">
                                    Your preferences have been saved. You can change them anytime in settings.
                                </p>
                                <Button onClick={onComplete} className="w-full">
                                    Start Learning
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
}

