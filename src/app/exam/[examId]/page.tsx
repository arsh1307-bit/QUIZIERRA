'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import type { Question, Exam, StudentAnswer, Attempt } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

function ExamSkeleton() {
    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function ExamPage() {
    const params = useParams();
    const examId = params.examId as string;
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<StudentAnswer[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState<string>('');
    const [startTime, setStartTime] = useState(Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const questionsQuery = useMemoFirebase(() => {
        if (!firestore || !examId) return null;
        return collection(firestore, 'exams', examId, 'questions');
    }, [firestore, examId]);

    const examRef = useMemoFirebase(() => {
        if (!firestore || !examId) return null;
        return doc(firestore, 'exams', examId);
    }, [firestore, examId]);

    const { data: questions, isLoading: isLoadingQuestions } = useCollection<Question>(questionsQuery);
    const { data: exam, isLoading: isLoadingExam } = useDoc<Exam>(examRef);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    const currentQuestion = useMemo(() => {
        if (!questions || questions.length === 0) return null;
        return questions[currentQuestionIndex];
    }, [questions, currentQuestionIndex]);

    useEffect(() => {
        setStartTime(Date.now());
        setCurrentAnswer(''); 
    }, [currentQuestionIndex]);
    
    const recordAnswer = () => {
        if (!currentQuestion) return;
        const timeTaken = (Date.now() - startTime) / 1000; // in seconds
        const newAnswer: StudentAnswer = {
            questionId: currentQuestion.id,
            questionContent: currentQuestion.content,
            answer: currentAnswer,
            correctAnswer: currentQuestion.correctAnswer,
            timeTaken: timeTaken,
        };
        const newAnswers = [...answers, newAnswer];
        setAnswers(newAnswers);
        return newAnswers;
    }

    const handleNext = async () => {
        recordAnswer();
        if (currentQuestionIndex < (questions?.length || 0) - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // This is the final question, submit.
            await handleSubmit();
        }
    };
    
    const handleSubmit = async () => {
        setIsSubmitting(true);
        const finalAnswers = recordAnswer();

        if (!firestore || !user || !exam || !finalAnswers) {
            toast({ variant: 'destructive', title: 'Error', description: "Submission failed: missing required context."});
            setIsSubmitting(false);
            return;
        }

        try {
            const attemptId = uuidv4();
            const attemptRef = doc(firestore, 'attempts', attemptId);
            
            const attemptData: Attempt = {
                id: attemptId,
                examId: examId,
                studentId: user.uid,
                answers: finalAnswers,
                status: 'Pending Grading',
                startedAt: new Date(answers.length > 0 ? startTime : Date.now()).toISOString(),
                examTitle: exam.quizTitle,
                score: 0,
                totalQuestions: questions?.length || 0
            };
            
            await setDoc(attemptRef, attemptData);
            
            router.push(`/exam/${examId}/results?attemptId=${attemptId}`);

        } catch (error: any) {
            console.error("Failed to submit exam:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
            setIsSubmitting(false);
        }
    };


    const progress = questions ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

    if (isLoadingExam || isLoadingQuestions || !exam || !questions || !currentQuestion) {
        return <ExamSkeleton />;
    }

    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto">
            <Card className="shadow-2xl">
                <CardHeader>
                    <CardTitle>{exam.quizTitle}</CardTitle>
                    <CardDescription>Answer each question to the best of your ability.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-primary">Question {currentQuestionIndex + 1} of {questions.length}</p>
                            <p className="text-sm text-muted-foreground">Score: {currentQuestion.maxScore} pts</p>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    <div className="space-y-4">
                        <p className="text-lg font-semibold">{currentQuestion.content}</p>
                        {currentQuestion.type === 'mcq' && currentQuestion.options && (
                            <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                                {currentQuestion.options.map((option, index) => (
                                    <Label key={index} className="flex items-center space-x-3 p-4 border rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors">
                                        <RadioGroupItem value={option} id={`option-${index}`} />
                                        <span>{option}</span>
                                    </Label>
                                ))}
                            </RadioGroup>
                        )}
                        {currentQuestion.type === 'text' && (
                            <Textarea
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                placeholder="Type your answer here..."
                                className="min-h-[120px]"
                            />
                        )}
                    </div>
                    
                    <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={handleNext}
                        disabled={!currentAnswer || isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting 
                            ? 'Submitting...' 
                            : currentQuestionIndex < questions.length - 1 
                                ? 'Next Question' 
                                : 'Finish & Submit Exam'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
