'use server';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { generateQuiz } from '@/ai/flows/instructor-generates-quiz-from-topic';
import type { Quiz, Question } from './types';
import { getAuth } from 'firebase/auth';

export async function createQuizWithAI(topic: string, numQuestions: number, userId: string) {
  const firestore = getFirestore();
  const quizData = await generateQuiz({ context: topic, numMcq: numQuestions, numText: 0, isAdaptive: false });
  
  try {
    const quizCollectionRef = collection(firestore, 'quizzes');
    const newQuizRef = await addDoc(quizCollectionRef, {
      title: quizData.title,
      description: `A quiz about ${topic}`,
      createdBy: userId,
      createdAt: serverTimestamp(),
      questionIds: [],
    });

    const questionCollectionRef = collection(firestore, 'quizzes', newQuizRef.id, 'questions');
    const questionIds: string[] = [];

    for (const q of quizData.questions) {
      const newQuestionRef = await addDoc(questionCollectionRef, {
        type: q.type,
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        maxScore: q.maxScore,
        quizId: newQuizRef.id,
      });
      questionIds.push(newQuestionRef.id);
    }
    
    await setDoc(doc(firestore, 'quizzes', newQuizRef.id), { questionIds }, { merge: true });

    return { success: true, quizId: newQuizRef.id };
  } catch (error) {
    console.error("Error creating quiz with AI:", error);
    return { success: false, error: (error as Error).message };
  }
}
