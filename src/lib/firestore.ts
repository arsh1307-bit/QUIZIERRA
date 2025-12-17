"use server";
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
// Server-side proxy to Python AI service
const PYTHON_AI_BASE = process.env.PYTHON_AI_BASE || 'http://127.0.0.1:8000';
import type { Quiz, Question } from './types';
import { getAuth } from 'firebase/auth';

export async function createQuizWithAI(topic: string, numQuestions: number, userId: string) {
  const firestore = getFirestore();
  // Call the Python AI backend to generate the quiz
  const res = await fetch(`${PYTHON_AI_BASE}/ai/from_text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: topic, num_questions: numQuestions, use_structured: true }),
  });

  if (!res.ok) {
    throw new Error('AI generation service failed');
  }

  const body = await res.json();
  // The Python endpoint returns { generated: [...] } — convert to expected shape
  const quizData = {
    title: body.title || `Generated Quiz: ${topic}`,
    questions: (body.generated || []).map((g: any) => ({
      id: g.id,
      type: 'mcq',
      content: g.question || g.stem || '',
      options: (g.distractors || g.options || []).slice(0,3),
      correctAnswer: g.answer || g.correct || '',
      maxScore: 10,
    })),
  };
  
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
