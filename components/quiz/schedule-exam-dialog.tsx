
'use client';

import { useState } from 'react';
import { doc, setDoc, collection, writeBatch, getDocs } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Quiz, Exam, Question } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, ClipboardCopy, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type ScheduleExamDialogProps = {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
};

function generateAccessCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function ScheduleExamDialog({ quiz, isOpen, onClose }: ScheduleExamDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [scheduledTime, setScheduledTime] = useState<Date | undefined>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [createdExam, setCreatedExam] = useState<Exam | null>(null);

  const handleSchedule = async () => {
    if (!firestore || !user || !scheduledTime) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing required information to schedule exam.' });
      return;
    }
    setIsSaving(true);
    try {
        const batch = writeBatch(firestore);

        // 1. Fetch all questions from the source quiz's subcollection
        const questionsQuery = collection(firestore, 'quizzes', quiz.id, 'questions');
        const questionsSnapshot = await getDocs(questionsQuery);
        const questions = questionsSnapshot.docs.map(doc => doc.data() as Question);

        if (questions.length === 0) {
            throw new Error("This quiz has no questions and cannot be scheduled.");
        }

        // 2. Create the new Exam document reference
        const examsCollectionRef = collection(firestore, 'exams');
        const newExamRef = doc(examsCollectionRef);
        const accessCode = generateAccessCode();

        const newExam: Exam = {
            id: newExamRef.id,
            quizId: quiz.id,
            quizTitle: quiz.title,
            scheduledTime: scheduledTime.toISOString(),
            status: 'Scheduled',
            accessCode,
            createdBy: user.uid,
            createdAt: new Date().toISOString(),
            enrolledStudentIds: [],
        };
        batch.set(newExamRef, newExam);

        // 3. Create a snapshot of the questions in a subcollection of the new exam
        const examQuestionsCollectionRef = collection(newExamRef, 'questions');
        questions.forEach(question => {
            const newQuestionSnapshotRef = doc(examQuestionsCollectionRef, question.id);
            batch.set(newQuestionSnapshotRef, question);
        });
        
        // 4. Commit the batch
        await batch.commit();
        
        setCreatedExam(newExam);

    } catch (error: any) {
        console.error("Scheduling Error:", error);
        toast({ variant: 'destructive', title: 'Failed to Schedule', description: error.message });
        setIsSaving(false);
    }
  };
  
  const copyToClipboard = () => {
      if (!createdExam) return;
      navigator.clipboard.writeText(createdExam.accessCode);
      toast({ title: 'Copied!', description: 'Access code copied to clipboard.' });
  }

  const handleClose = () => {
      setCreatedExam(null);
      setIsSaving(false);
      onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {!createdExam ? (
            <>
                <DialogHeader>
                  <DialogTitle>Schedule Exam: {quiz.title}</DialogTitle>
                  <DialogDescription>
                    Set a date and time for this exam to go live. An access code will be generated for students.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">
                      Start Date
                    </Label>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !scheduledTime && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledTime ? format(scheduledTime, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={scheduledTime}
                            onSelect={setScheduledTime}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="time" className="text-right">
                        Start Time
                    </Label>
                    <Input 
                        id="time"
                        type="time"
                        defaultValue={format(scheduledTime || new Date(), 'HH:mm')}
                        onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            setScheduledTime(prev => {
                                const newDate = new Date(prev || new Date());
                                newDate.setHours(hours, minutes);
                                return newDate;
                            });
                        }}
                        className="col-span-3"
                    />
                   </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button type="submit" onClick={handleSchedule} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Scheduling...' : 'Schedule Exam'}
                  </Button>
                </DialogFooter>
            </>
        ) : (
             <>
                <DialogHeader>
                  <DialogTitle>Exam Scheduled Successfully!</DialogTitle>
                  <DialogDescription>
                    Share the access code below with your students to allow them to join the exam lobby.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground">ACCESS CODE</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <p className="text-4xl font-bold tracking-widest font-mono bg-muted p-4 rounded-lg">{createdExam.accessCode}</p>
                         <Button variant="outline" size="icon" onClick={copyToClipboard}>
                            <ClipboardCopy className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                 <DialogFooter>
                  <Button type="button" onClick={handleClose}>Done</Button>
                </DialogFooter>
             </>
        )}
      </DialogContent>
    </Dialog>
  );
}
