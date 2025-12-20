'use client';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, BookText, Pencil } from 'lucide-react';
import { GenerateFromFile } from '@/components/quiz/generate-from-file';
import { GenerateFromText } from '@/components/quiz/generate-from-text';
import { GenerateManual } from '@/components/quiz/generate-manual';
import { AnimatePresence, motion } from 'framer-motion';
import type { GenerateQuizOutput } from '@/ai/flows/instructor-generates-quiz-from-topic';
import { QuizReview } from '@/components/quiz/quiz-review';

type GenerationStep = 'configure' | 'review';

export default function CreateQuizPage() {
    const [step, setStep] = useState<GenerationStep>('configure');
    const [generatedQuiz, setGeneratedQuiz] = useState<GenerateQuizOutput | null>(null);

    const handleQuizGenerated = (data: GenerateQuizOutput) => {
        setGeneratedQuiz(data);
        setStep('review');
    };

    const handleBack = () => {
        setStep('configure');
        setGeneratedQuiz(null);
    }
    
    const handleReset = () => {
        setStep('configure');
        setGeneratedQuiz(null);
    }

    return (
        <div className="p-4 sm:p-8">
             <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {step === 'configure' ? (
                        <Card className="max-w-4xl mx-auto">
                            <CardHeader>
                                <CardTitle className="text-2xl">Create New Quiz</CardTitle>
                                <CardDescription>Choose your preferred method to generate a new quiz.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="file" className="w-full">
                                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
                                        <TabsTrigger value="file" className="flex items-center gap-2"><FileUp className="h-4 w-4" /> From File</TabsTrigger>
                                        <TabsTrigger value="text" className="flex items-center gap-2"><BookText className="h-4 w-4" /> From Text</TabsTrigger>
                                        <TabsTrigger value="manual" className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Manual</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="file" className="pt-6">
                                        <GenerateFromFile onQuizGenerated={handleQuizGenerated} />
                                    </TabsContent>
                                    <TabsContent value="text" className="pt-6">
                                        <GenerateFromText onQuizGenerated={handleQuizGenerated} />
                                    </TabsContent>
                                    <TabsContent value="manual" className="pt-6">
                                        <GenerateManual onQuizGenerated={handleQuizGenerated} />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    ) : (
                       generatedQuiz && <QuizReview quizData={generatedQuiz} onBack={handleBack} onReset={handleReset}/>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
