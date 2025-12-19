'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2, FileText, FileX2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import type { GenerateQuizOutput } from '@/ai/flows/instructor-generates-quiz-from-topic';
import { AnswerReview } from '../quiz/answer-review';
import type { KeyAnswer } from '@/app/api/generate-key-answers/route';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, doc, updateDoc, writeBatch, arrayUnion, getDoc } from 'firebase/firestore';
import type { UploadedMaterial } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const formSchema = z.object({
  numMcq: z.coerce.number().min(0).max(20),
  numText: z.coerce.number().min(0).max(20),
}).refine(data => data.numMcq + data.numText > 0, {
  message: "You must generate at least one question.",
  path: ["numMcq"],
});

type GenerateFromFileProps = {
    onQuizGenerated: (data: GenerateQuizOutput) => void;
    showAnswerReview?: boolean; // New prop to enable answer review stage
}

export function GenerateFromFile({ onQuizGenerated, showAnswerReview = true }: GenerateFromFileProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'review' | 'generating'>('upload');
  const [keyAnswers, setKeyAnswers] = useState<KeyAnswer[]>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  const [materialId, setMaterialId] = useState<string | null>(null);

  // Resume logic: check URL params for resume
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const resumeId = new URLSearchParams(window.location.search).get('resume');
    const resumeStep = new URLSearchParams(window.location.search).get('step');
    
    if (resumeId && firestore && user) {
      const loadResumeMaterial = async () => {
        try {
          const materialDocRef = doc(firestore, 'uploadedMaterials', resumeId);
          const materialDoc = await getDoc(materialDocRef);
          
          if (materialDoc.exists()) {
            const material = { id: materialDoc.id, ...materialDoc.data() } as UploadedMaterial;
            
            // Verify ownership
            if (material.userId !== user.uid) {
              console.error('Material does not belong to user');
              return;
            }
            
            setMaterialId(material.id);
            setExtractedText(material.fullTextStorage || material.previewText || '');
            
            if (resumeStep === 'review' && material.keyAnswers) {
              setKeyAnswers(material.keyAnswers.map(ka => ({
                id: ka.id,
                topic: ka.topic,
                explanation: ka.explanation,
                sourceSnippet: ka.sourceSnippet,
              })));
              setStep('review');
            } else if (resumeStep === 'generate' && material.materialStatus === 'answersReviewed') {
              // Resume quiz generation
              const formValues = form.getValues();
              await generateQuizFromText(material.fullTextStorage || material.previewText || '', formValues);
            }
          }
        } catch (error) {
          console.error('Failed to resume:', error);
        }
      };
      
      loadResumeMaterial();
    }
  }, [firestore, user]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numMcq: 5,
      numText: 0,
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officed.document.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const handleGenerate = async (values: z.infer<typeof formSchema>) => {
    if (!file) {
      toast({ variant: 'destructive', title: 'No file selected', description: 'Please upload a file to generate a quiz.' });
      return;
    }
    
    setIsProcessing(true);
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/parse-file', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to parse the file.');
        }

        const textContent = result.text;
        
        if (!textContent || !textContent.trim()) {
            throw new Error('Could not extract any text from the file.');
        }

        setExtractedText(textContent);

        // Save uploaded material to Firestore
        if (user && firestore) {
            try {
                const materialData: Omit<UploadedMaterial, 'id'> = {
                    userId: user.uid,
                    fileName: file.name,
                    fileType: file.type || 'unknown',
                    uploadedAt: new Date().toISOString(),
                    quizCompleted: 0,
                    previewText: textContent.substring(0, 10000), // First 10k chars for UI
                    fullTextStorage: textContent, // Full text for AI generation
                    materialStatus: 'uploaded',
                };
                const materialRef = await addDoc(collection(firestore, 'uploadedMaterials'), materialData);
                setMaterialId(materialRef.id);
            } catch (error) {
                console.error('Failed to save material:', error);
            }
        }

        // If answer review is enabled, generate key answers first
        if (showAnswerReview) {
            const keyAnswersResponse = await fetch('/api/generate-key-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textContent }),
            });

            if (keyAnswersResponse.ok) {
                const keyAnswersData = await keyAnswersResponse.json();
                const answers = keyAnswersData.keyAnswers || [];
                setKeyAnswers(answers);
                
                // Update material with key answers (status will be updated after review)
                if (materialId && firestore && user) {
                    try {
                        await updateDoc(doc(firestore, 'uploadedMaterials', materialId), {
                            keyAnswers: answers.map(a => ({
                                id: a.id,
                                topic: a.topic,
                                explanation: a.explanation,
                                sourceSnippet: a.sourceSnippet,
                                status: undefined, // Will be set after student reviews
                            })),
                        });
                    } catch (error) {
                        console.error('Failed to update material with key answers:', error);
                    }
                }
                
                setStep('review');
                toast({ title: 'Key Answers Generated', description: 'Review the concepts before generating your quiz.' });
            } else {
                // If key answers generation fails, proceed directly to quiz generation
                await generateQuizFromText(textContent, values);
            }
        } else {
            // Skip answer review, go directly to quiz generation
            await generateQuizFromText(textContent, values);
        }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateQuizFromText = async (textContent: string, values: z.infer<typeof formSchema>) => {
    setStep('generating');
    
    // Get flagged topics for adaptive generation
    const flaggedTopics = keyAnswers
        .filter(a => a.status === 'flagged')
        .map(a => a.topic);
    
    const aiResponse = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            context: textContent,
            numMcq: values.numMcq,
            numText: values.numText,
            weakTopics: flaggedTopics, // Pass flagged topics for adaptive generation
        }),
    });

    const aiResult = (await aiResponse.json()) as GenerateQuizOutput | { error?: string };

    if (!aiResponse.ok) {
        throw new Error((aiResult as { error?: string }).error || 'Failed to generate quiz from file.');
    }

    if ('questions' in aiResult && Array.isArray(aiResult.questions) && aiResult.questions.length > 0) {
        // Auto-save quiz and redirect to exam (NO manual review for students)
        await saveQuizAndRedirect(aiResult as GenerateQuizOutput);
    } else {
        throw new Error('The AI could not generate questions from the provided file. The content might be too short or unclear.');
    }
  };

  const saveQuizAndRedirect = async (quizData: GenerateQuizOutput) => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to save a quiz.' });
        return;
    }

    try {
        const batch = writeBatch(firestore);

        // Create quiz document
        const quizCollectionRef = collection(firestore, 'quizzes');
        const newQuizDocRef = doc(quizCollectionRef);

        const quizPayload = {
            id: newQuizDocRef.id,
            title: quizData.title,
            createdBy: user.uid,
            createdAt: new Date().toISOString(),
            questionIds: quizData.questions.map(q => q.id),
            description: `A practice quiz with ${quizData.questions.length} questions.`,
        };
        batch.set(newQuizDocRef, quizPayload);

        // Create question documents
        const questionsCollectionRef = collection(newQuizDocRef, 'questions');
        quizData.questions.forEach(question => {
            const questionDocRef = doc(questionsCollectionRef, question.id);
            const questionPayload = {
                id: question.id,
                type: question.type,
                content: question.content,
                maxScore: question.maxScore,
                quizId: newQuizDocRef.id,
                ...(question.options && { options: question.options }),
                ...(question.correctAnswer && { correctAnswer: question.correctAnswer }),
            };
            batch.set(questionDocRef, questionPayload);
        });

        await batch.commit();

        // Update material with quiz reference
        if (materialId) {
            await updateDoc(doc(firestore, 'uploadedMaterials', materialId), {
                quizId: newQuizDocRef.id,
                materialStatus: 'quizGenerated',
                linkedQuizzes: arrayUnion(newQuizDocRef.id),
            });
        }

        toast({ title: 'Quiz Created!', description: 'Redirecting to quiz...' });
        
        // Redirect directly to exam page (NO review step for students)
        router.push(`/exam/${newQuizDocRef.id}/page`);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save quiz.' });
    }
  };

  const handleAnswerReviewComplete = async (reviewStatus?: Array<{ id: string; status: 'approved' | 'flagged' }>) => {
    if (!extractedText) return;
    setIsProcessing(true);
    try {
        // Update material with review status
        if (materialId && firestore && reviewStatus) {
            try {
                const updatedKeyAnswers = keyAnswers.map(answer => {
                    const review = reviewStatus.find(r => r.id === answer.id);
                    return {
                        ...answer,
                        status: review?.status,
                    };
                });
                
                await updateDoc(doc(firestore, 'uploadedMaterials', materialId), {
                    keyAnswers: updatedKeyAnswers,
                    materialStatus: 'answersReviewed',
                });
            } catch (error) {
                console.error('Failed to update review status:', error);
            }
        }
        
        const formValues = form.getValues();
        await generateQuizFromText(extractedText, formValues);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'An unexpected error occurred.' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAnswerReviewBack = () => {
    setStep('upload');
    setKeyAnswers([]);
  };

  const removeFile = () => {
    setFile(null);
  };

  // Show answer review stage if enabled and key answers are available
  if (step === 'review' && keyAnswers.length > 0) {
    return (
      <AnswerReview
        keyAnswers={keyAnswers}
        sourceFileName={file?.name}
        onComplete={handleAnswerReviewComplete}
        onBack={handleAnswerReviewBack}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!file && (
        <div
          {...getRootProps()}
          className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="h-10 w-10" />
            <p className="font-semibold">Drag & drop a file here, or click to select</p>
            <p className="text-sm">Supports: PDF, DOCX, TXT</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
          >
            <Card className="bg-muted/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={removeFile}>
                  <FileX2 className="h-5 w-5 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="numMcq"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>MCQ Questions</FormLabel>
                        <FormControl>
                        <Input type="number" min={0} max={20} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="numText"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Text Questions</FormLabel>
                        <FormControl>
                        <Input type="number" min={0} max={20} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <FormMessage>{form.formState.errors.root?.message}</FormMessage>

          <Button type="submit" className="w-full" disabled={!file || isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Analyzing & Generating...' : 'Generate Quiz from File'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
