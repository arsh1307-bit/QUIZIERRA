
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Save, Trash2, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { GenerateQuizOutput } from '@/ai/flows/instructor-generates-quiz-from-topic';
import { collection, writeBatch, doc } from 'firebase/firestore';

type QuizReviewProps = {
    quizData: GenerateQuizOutput;
    onBack: () => void;
    onReset: () => void;
};

type QuestionState = GenerateQuizOutput['questions'][0] & { isApproved?: boolean; difficulty?: string };

export function QuizReview({ quizData, onBack, onReset }: QuizReviewProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [title, setTitle] = useState(quizData.title);
    const [questions, setQuestions] = useState<QuestionState[]>(
         quizData.questions.map(q => ({
            ...q,
            // Auto-approve text questions, require approval for MCQs
            isApproved: q.type === 'text'
        }))
    );
    const [isSaving, setIsSaving] = useState(false);

    const updateQuestionContent = (id: string, newContent: string) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, content: newContent } : q));
    };

    const updateCorrectAnswer = (id: string, newAnswer: string) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, correctAnswer: newAnswer, isApproved: true } : q));
    };

    const deleteQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };
    
    const unapprovedMcqs = questions.filter(q => q.type === 'mcq' && !q.isApproved).length;

    async function classifyDifficultyForQuestions(qs: QuestionState[]): Promise<QuestionState[]> {
        const classified: QuestionState[] = [];

        for (const q of qs) {
            let difficulty: string | undefined = q.difficulty;
            try {
                const res = await fetch('/api/predict-difficulty', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: q.content }),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.label && typeof data.label === 'string') {
                        difficulty = data.label;
                    }
                }
            } catch (e) {
                console.warn('Difficulty classification failed for question', q.id, e);
            }
            classified.push({ ...q, difficulty });
        }

        return classified;
    }

    const handleSaveQuiz = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to save a quiz.' });
            return;
        }

        if (unapprovedMcqs > 0) {
            toast({ variant: 'destructive', title: 'Approval Needed', description: `Please approve the correct answer for ${unapprovedMcqs} more MCQ question(s).` });
            return;
        }

        setIsSaving(true);
        try {
            // Run difficulty classification before persisting
            const questionsWithDifficulty = await classifyDifficultyForQuestions(questions);

            // Normalize question fields to avoid runtime type errors (e.g., indexOf on non-string)
            const normalizedQuestions = questionsWithDifficulty.map(q => ({
                ...q,
                id: String(q.id),
                content: String(q.content || ''),
                maxScore: typeof q.maxScore === 'number' ? q.maxScore : Number(q.maxScore) || 10,
                options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : undefined,
                correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : undefined,
                difficulty: q.difficulty != null ? String(q.difficulty) : undefined,
            }));

            const batch = writeBatch(firestore);

            const quizCollectionRef = collection(firestore, 'quizzes');
            const newQuizDocRef = doc(quizCollectionRef);

            const quizData = {
                id: newQuizDocRef.id,
                title: String(title || ''),
                createdBy: user.uid,
                createdAt: new Date().toISOString(),
                questionIds: normalizedQuestions.map(q => q.id),
                description: `A quiz with ${normalizedQuestions.length} questions.`,
            };
            batch.set(newQuizDocRef, quizData);

            // Correctly reference the subcollection for questions
            const questionsCollectionRef = collection(newQuizDocRef, 'questions');
            normalizedQuestions.forEach((question) => {
                const questionDocRef = doc(questionsCollectionRef, question.id);
                const questionPayload = {
                    id: question.id,
                    type: question.type,
                    content: question.content,
                    maxScore: question.maxScore,
                    quizId: newQuizDocRef.id,
                    ...(question.options && { options: question.options }),
                    ...(question.correctAnswer && { correctAnswer: question.correctAnswer }),
                    ...(question.difficulty && { difficulty: question.difficulty }),
                };
                batch.set(questionDocRef, questionPayload);
            });

            try {
                await batch.commit();
            } catch (e) {
                // Log the normalized payload to help diagnose client-side save errors
                console.error('Failed to commit batch. Quiz payload:', {
                    quiz: quizData,
                    questions: normalizedQuestions,
                });
                throw e;
            }

            toast({ title: 'Quiz Saved!', description: `Your new quiz "${title}" has been successfully created.` });
            onReset();
            router.push('/dashboard/quizzes');

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'An unexpected error occurred while saving the quiz.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Generator
                </Button>
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center gap-2 justify-center">
                        <Wand2 className="h-6 w-6 text-primary" /> Review & Refine Your Quiz
                    </h1>
                    <p className="text-muted-foreground">Approve AI suggestions and edit content before saving.</p>
                </div>
                <Button onClick={handleSaveQuiz} disabled={isSaving || unapprovedMcqs > 0}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Quiz
                </Button>
            </div>
            
            {unapprovedMcqs > 0 && (
                <div className="p-3 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">
                        You have {unapprovedMcqs} multiple-choice question(s) that require an approved answer.
                    </p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <Label htmlFor="quiz-title" className="text-lg font-semibold">Quiz Title</Label>
                </CardHeader>
                <CardContent>
                    <Input
                        id="quiz-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-2xl font-bold h-12"
                    />
                </CardContent>
            </Card>

            <Accordion type="single" collapsible defaultValue="item-0" className="w-full space-y-4">
                {questions.map((q, index) => (
                    <AccordionItem key={q.id} value={`item-${index}`} className="border-b-0">
                        <Card className="overflow-hidden">
                             <div className="flex items-center p-4 hover:bg-muted/50 group">
                                <AccordionTrigger className="flex-1 p-0 hover:no-underline">
                                    <div className="flex items-center gap-4">
                                        {q.type === 'mcq' ? (
                                            q.isApproved ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-amber-500" />
                                        ) : (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        )}
                                        <span className="font-semibold text-left">{index + 1}. {q.content}</span>
                                    </div>
                                </AccordionTrigger>
                                <Button variant="ghost" size="icon" className="ml-4 text-muted-foreground hover:text-destructive" onClick={() => deleteQuestion(q.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <AccordionContent className="p-6 pt-0">
                                <div className="space-y-4">
                                    <div>
                                        <Label>Question Text</Label>
                                        <Textarea
                                            value={q.content}
                                            onChange={(e) => updateQuestionContent(q.id, e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>

                                    {q.type === 'mcq' && q.options && (
                                        <div>
                                            <Label>Options & Correct Answer</Label>
                                            <p className="text-sm text-muted-foreground mb-2">The AI has suggested an answer. Please review and approve it, or select the correct one.</p>
                                            <RadioGroup
                                                value={q.correctAnswer}
                                                onValueChange={(newAnswer) => updateCorrectAnswer(q.id, newAnswer)}
                                            >
                                                {q.options.map((option, i) => (
                                                    <div key={i} className={`flex items-center space-x-2 p-3 rounded-md transition-colors ${q.correctAnswer === option ? 'bg-primary/10' : 'bg-muted/50'}`}>
                                                        <RadioGroupItem value={option} id={`${q.id}-option-${i}`} />
                                                        <Label htmlFor={`${q.id}-option-${i}`} className="flex-1 cursor-pointer">{option}</Label>
                                                        {quizData.questions.find(orig => orig.id === q.id)?.correctAnswer === option && (
                                                            <div className="text-xs text-primary font-semibold flex items-center gap-1">
                                                                <Wand2 className="h-3 w-3" />
                                                                AI Suggestion
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    )}

                                    {q.type === 'text' && (
                                        <div>
                                            <Label>Reference Answer</Label>
                                            <Textarea
                                                value={q.correctAnswer}
                                                onChange={(e) => updateCorrectAnswer(q.id, e.target.value)}
                                                className="mt-1"
                                                placeholder="Enter the ideal answer for grading reference."
                                            />
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                ))}
            </Accordion>
        </motion.div>
    );
}
