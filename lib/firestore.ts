'use server';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { generateQuizFromTopic } from '@/ai/flows/instructor-generates-quiz-from-topic';
import type { Quiz, Question } from './types';
import { getAuth } from 'firebase/auth';

export async function createQuizWithAI(topic: string, numQuestions: number, userId: string) {
  const firestore = getFirestore();
  const quizData = await generateQuizFromTopic({ topic, numQuestions });
  
  try {
    const parsedQuiz = JSON.parse(quizData.quiz);

    const quizCollectionRef = collection(firestore, 'quizzes');
    const newQuizRef = await addDoc(quizCollectionRef, {
      title: parsedQuiz.quizTitle,
      description: `A quiz about ${topic}`,
      createdBy: userId,
      createdAt: serverTimestamp(),
      questionIds: [],
    });

    const questionCollectionRef = collection(firestore, 'quizzes', newQuizRef.id, 'questions');
    const questionIds: string[] = [];

    for (const q of parsedQuiz.questions) {
      const newQuestionRef = await addDoc(questionCollectionRef, {
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
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
