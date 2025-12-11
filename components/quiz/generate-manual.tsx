'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { GenerateQuizOutput } from '@/ai/flows/instructor-generates-quiz-from-topic';

 type GenerateManualProps = {
   onQuizGenerated: (data: GenerateQuizOutput) => void;
 };

 type ManualQuestion = {
   id: string;
   type: 'mcq' | 'text';
   content: string;
   options: string[];
   correctAnswer?: string;
   maxScore: number;
 };

 const createEmptyQuestion = (): ManualQuestion => {
   const id =
     typeof crypto !== 'undefined' && 'randomUUID' in crypto
       ? crypto.randomUUID()
       : Math.random().toString(36).slice(2);

   return {
     id,
     type: 'mcq',
     content: '',
     options: ['', '', '', ''],
     correctAnswer: '',
     maxScore: 10,
   };
 };

export function GenerateManual({ onQuizGenerated }: GenerateManualProps) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<ManualQuestion[]>([createEmptyQuestion()]);

  const updateQuestion = (id: string, patch: Partial<ManualQuestion>) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)));
  };

  const updateOption = (id: string, index: number, value: string) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== id) return q;
        const options = [...q.options];
        options[index] = value;
        return { ...q, options };
      }),
    );
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, createEmptyQuestion()]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => (prev.length === 1 ? prev : prev.filter(q => q.id !== id)));
  };

  const handleReview = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({ variant: 'destructive', title: 'Missing title', description: 'Please enter a quiz title.' });
      return;
    }

    const cleanedQuestions = questions
      .map(q => ({ ...q, content: q.content.trim() }))
      .filter(q => q.content.length > 0);

    if (cleanedQuestions.length === 0) {
      toast({ variant: 'destructive', title: 'No questions', description: 'Add at least one question.' });
      return;
    }

    for (const q of cleanedQuestions) {
      if (q.type === 'mcq') {
        const filledOptions = q.options.map(o => o.trim()).filter(Boolean);
        if (filledOptions.length < 2) {
          toast({
            variant: 'destructive',
            title: 'Incomplete MCQ',
            description: 'Each multiple-choice question needs at least 2 options.',
          });
          return;
        }
        if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
          toast({
            variant: 'destructive',
            title: 'Missing correct answer',
            description: 'Select the correct answer for each multiple-choice question.',
          });
          return;
        }
      } else {
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          toast({
            variant: 'destructive',
            title: 'Missing reference answer',
            description: 'Text questions need a reference answer for grading.',
          });
          return;
        }
      }
    }

    const payload: GenerateQuizOutput = {
      title: trimmedTitle,
      questions: cleanedQuestions.map(q => ({
        id: q.id,
        type: q.type,
        content: q.content,
        maxScore: q.maxScore,
        ...(q.type === 'mcq'
          ? {
              options: q.options.map(o => o.trim()).filter(Boolean),
              correctAnswer: q.correctAnswer,
            }
          : {
              correctAnswer: q.correctAnswer?.trim(),
            }),
      })),
    };

    onQuizGenerated(payload);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Create Quiz Manually</CardTitle>
        <CardDescription>Add your own questions without using AI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="manual-quiz-title">Quiz Title</Label>
          <Input
            id="manual-quiz-title"
            placeholder="e.g. Algebra Basics Quiz"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-6">
          {questions.map((q, index) => (
            <Card key={q.id} className="border border-dashed">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Question {index + 1}</CardTitle>
                  <CardDescription>
                    {q.type === 'mcq' ? 'Multiple-choice question' : 'Text / open-ended question'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={q.type === 'mcq' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateQuestion(q.id, { type: 'mcq' })}
                  >
                    MCQ
                  </Button>
                  <Button
                    type="button"
                    variant={q.type === 'text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateQuestion(q.id, { type: 'text', options: ['', '', '', ''] })}
                  >
                    Text
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeQuestion(q.id)}
                    disabled={questions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Question Text</Label>
                  <Textarea
                    placeholder="Type the question here..."
                    value={q.content}
                    onChange={e => updateQuestion(q.id, { content: e.target.value })}
                  />
                </div>

                {q.type === 'mcq' ? (
                  <div className="space-y-2">
                    <Label>Options (choose the correct one)</Label>
                    <RadioGroup
                      value={q.correctAnswer}
                      onValueChange={val => updateQuestion(q.id, { correctAnswer: val })}
                    >
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-md border px-3 py-2"
                        >
                          <RadioGroupItem value={opt} id={`${q.id}-opt-${i}`} />
                          <Input
                            placeholder={`Option ${i + 1}`}
                            value={opt}
                            onChange={e => updateOption(q.id, i, e.target.value)}
                          />
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Reference Answer</Label>
                    <Textarea
                      placeholder="Ideal answer used as grading reference."
                      value={q.correctAnswer || ''}
                      onChange={e => updateQuestion(q.id, { correctAnswer: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2 max-w-xs">
                  <Label htmlFor={`max-score-${q.id}`}>Max Score</Label>
                  <Input
                    id={`max-score-${q.id}`}
                    type="number"
                    min={1}
                    max={100}
                    value={q.maxScore}
                    onChange={e =>
                      updateQuestion(q.id, {
                        maxScore: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addQuestion}>
            <Plus className="mr-2 h-4 w-4" /> Add another question
          </Button>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleReview}>
            Review & Save Quiz
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
