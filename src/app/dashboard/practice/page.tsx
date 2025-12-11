'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GenerateFromText } from '@/components/quiz/generate-from-text';
import type { GenerateQuizOutput } from '@/ai/flows/instructor-generates-quiz-from-topic';
import { Badge } from '@/components/ui/badge';

export default function PracticePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [practiceQuiz, setPracticeQuiz] = useState<GenerateQuizOutput | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleQuizGenerated = (data: { title: string; questions: any[] }) => {
    // Adapt the shape from GenerateFromText callback into a GenerateQuizOutput-like object
    setPracticeQuiz({
      title: data.title,
      questions: data.questions as any,
    });
    setShowAnswers(false);
  };

  if (isUserLoading || !user) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Practice Quiz with AI</CardTitle>
            <CardDescription>
              Paste notes or a topic, and let the AI generate practice questions for you. This does not affect your official scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenerateFromText onQuizGenerated={handleQuizGenerated} />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="bg-card/80 backdrop-blur-sm h-full flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>{practiceQuiz ? practiceQuiz.title : 'No Quiz Yet'}</CardTitle>
                <CardDescription>
                  {practiceQuiz
                    ? 'Review the questions below. Toggle answers to check yourself.'
                    : 'Generate a quiz on the left to start practicing.'}
                </CardDescription>
              </div>
              {practiceQuiz && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnswers(prev => !prev)}
                >
                  {showAnswers ? 'Hide Answers' : 'Show Answers'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 overflow-y-auto max-h-[70vh]">
            {practiceQuiz ? (
              practiceQuiz.questions.map((q: any, index: number) => (
                <Card key={q.id || index} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground">
                          Question {index + 1}
                        </span>
                        <Badge variant="outline">{q.type === 'mcq' ? 'MCQ' : 'Text'}</Badge>
                      </div>
                      <p className="font-medium">{q.content}</p>
                    </div>
                  </div>

                  {q.type === 'mcq' && Array.isArray(q.options) && (
                    <ul className="mt-3 space-y-2">
                      {q.options.map((opt: string, i: number) => {
                        const isCorrect = showAnswers && q.correctAnswer === opt;
                        return (
                          <li
                            key={i}
                            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                              isCorrect ? 'border-green-500 bg-green-500/10' : 'border-border'
                            }`}
                          >
                            <span className="font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
                            <span>{opt}</span>
                            {isCorrect && (
                              <span className="ml-auto text-xs font-semibold text-green-500">Correct</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {q.type === 'text' && showAnswers && q.correctAnswer && (
                    <div className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="font-semibold">Reference answer: </span>
                      <span>{q.correctAnswer}</span>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Generate a quiz to see practice questions here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
