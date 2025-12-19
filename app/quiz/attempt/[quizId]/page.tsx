
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Quiz, Question, StudentAnswer, Attempt } from '@/lib/types';

const AttemptQuizPage = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) {
      setError('Quiz ID is missing.');
      setLoading(false);
      return;
    }

    const fetchQuiz = async () => {
      try {
        const quizRef = doc(db, 'quizzes', quizId as string);
        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists() || quizSnap.data().status !== 'published') {
          setError('This quiz is not available.');
          setLoading(false);
          return;
        }

        const quizData = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
        setQuiz(quizData);

        if (quizData.questionIds) {
          const questionPromises = quizData.questionIds.map(id => getDoc(doc(db, 'questions', id)));
          const questionSnaps = await Promise.all(questionPromises);
          const questionData = questionSnaps.map(snap => {
            const data = snap.data() as Question;
            // Never send correctAnswer to the client
            const { correctAnswer, ...studentQuestion } = data;
            return { id: snap.id, ...studentQuestion } as Question;
          });
          setQuestions(questionData);
        }
      } catch (err) {
        setError('Failed to fetch quiz.');
        console.error(err);
      }
      setLoading(false);
    };

    fetchQuiz();
  }, [quizId]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quizId) return;

    const studentAnswers: StudentAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
      questionContent: questions.find(q => q.id === questionId)?.content || '',
      timeTaken: 0, // Simplified for now
    }));

    const attempt: Omit<Attempt, 'id'> = {
      examId: quizId as string, // Using quizId as examId
      studentId: 'current-student-id', // Replace with actual student ID
      answers: studentAnswers,
      score: 0, // Score will be calculated on the backend
      totalQuestions: questions.length,
      status: 'Pending Grading',
      startedAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'attempts'), attempt);
      alert('Quiz submitted successfully! You will see your results soon.');
    } catch (err) {
      setError('Failed to submit quiz.');
      console.error(err);
    }
  };

  if (loading) return <div>Loading Quiz...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!quiz) return <div>Quiz not found.</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>{quiz.title}</h1>
      <p>{quiz.description}</p>
      {questions.map(q => (
        <div key={q.id} style={{ marginBottom: '20px' }}>
          <p>{q.content}</p>
          {q.options?.map((option, i) => (
            <div key={i}>
              <input
                type="radio"
                name={`question-${q.id}`}
                value={i.toString()}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              />
              <label style={{ marginLeft: '10px' }}>{option}</label>
            </div>
          ))}
        </div>
      ))}
      <button onClick={handleSubmit} style={{ padding: '10px 20px', background: 'green', color: 'white', border: 'none', cursor: 'pointer' }}>
        Submit Quiz
      </button>
    </div>
  );
};

export default AttemptQuizPage;
