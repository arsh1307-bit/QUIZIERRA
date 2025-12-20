'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileText, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { KeyAnswer } from '@/app/api/generate-key-answers/route';

type AnswerReviewProps = {
  keyAnswers: KeyAnswer[];
  sourceFileName?: string;
  onComplete: (reviewStatus?: Array<{ id: string; status: 'approved' | 'flagged' }>) => void;
  onBack?: () => void;
};

export function AnswerReview({ keyAnswers, sourceFileName, onComplete, onBack }: AnswerReviewProps) {
  const [reviewedAnswers, setReviewedAnswers] = useState<Set<string>>(new Set());
  const [needsClarification, setNeedsClarification] = useState<Set<string>>(new Set());
  
  // Track review status for persistence
  const [reviewStatus, setReviewStatus] = useState<Map<string, 'approved' | 'flagged'>>(new Map());

  const handleReview = (answerId: string, isGood: boolean) => {
    const status = isGood ? 'approved' : 'flagged';
    setReviewStatus(prev => new Map(prev).set(answerId, status));
    
    if (isGood) {
      setReviewedAnswers(prev => new Set(prev).add(answerId));
      setNeedsClarification(prev => {
        const next = new Set(prev);
        next.delete(answerId);
        return next;
      });
    } else {
      setNeedsClarification(prev => new Set(prev).add(answerId));
      setReviewedAnswers(prev => {
        const next = new Set(prev);
        next.delete(answerId);
        return next;
      });
    }
  };
  
  // Expose review status to parent via callback
  const getReviewStatus = () => {
    return Array.from(reviewStatus.entries()).map(([id, status]) => ({ id, status }));
  };

  const allReviewed = keyAnswers.length > 0 && reviewedAnswers.size + needsClarification.size === keyAnswers.length;
  const allGood = reviewedAnswers.size === keyAnswers.length && keyAnswers.length > 0;

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Key Answers
          </CardTitle>
          <CardDescription>
            {sourceFileName && `From: ${sourceFileName}`}
            <br />
            Review the AI-generated key concepts and explanations from your material. 
            This helps ensure accuracy before generating your quiz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <AnimatePresence>
          {keyAnswers.map((answer, index) => {
            const isReviewed = reviewedAnswers.has(answer.id) || needsClarification.has(answer.id);
            const isGood = reviewedAnswers.has(answer.id);
            
            return (
              <motion.div
                key={answer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`transition-all ${isGood ? 'border-green-500/50 bg-green-500/5' : needsClarification.has(answer.id) ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-muted-foreground">#{index + 1}</span>
                          {answer.topic}
                        </CardTitle>
                        {isReviewed && (
                          <Badge variant={isGood ? 'default' : 'secondary'} className="mt-2">
                            {isGood ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Looks Good
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Needs Clarification
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Explanation:</p>
                      <p className="text-foreground">{answer.explanation}</p>
                    </div>
                    
                    {answer.sourceSnippet && (
                      <div className="bg-muted/50 rounded-lg p-3 border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Source Snippet:</p>
                        <p className="text-sm italic">{answer.sourceSnippet}</p>
                      </div>
                    )}

                    {!isReviewed && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(answer.id, true)}
                          className="flex-1"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Looks Good
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(answer.id, false)}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Needs Clarification
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Reviewed: {reviewedAnswers.size + needsClarification.size} / {keyAnswers.length}
              </p>
              {needsClarification.size > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {needsClarification.size} concept{needsClarification.size > 1 ? 's' : ''} marked for clarification
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
              )}
              <Button 
                onClick={() => onComplete(getReviewStatus())} 
                disabled={!allReviewed}
                className="min-w-[140px]"
              >
                {allReviewed ? (
                  <>
                    Continue to Quiz <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  'Review All Concepts First'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

