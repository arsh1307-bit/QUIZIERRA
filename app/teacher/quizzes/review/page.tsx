
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config'; // Make sure this path is correct
import { Quiz, Question } from '@/lib/types';

const ReviewAndRefineQuizPage = () => {
  const searchParams = useSearchParams();
  const quizId = searchParams.get('quizId');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) {
      setError('Quiz ID is missing.');
      setLoading(false);
      return;
    }

    const fetchQuizAndQuestions = async () => {
      try {
        const quizRef = doc(db, 'quizzes', quizId);
        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists()) {
          setError('Quiz not found.');
          setLoading(false);
          return;
        }

        const quizData = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
        setQuiz(quizData);

        if (quizData.questionIds) {
          const questionPromises = quizData.questionIds.map(id => getDoc(doc(db, 'questions', id)));
          const questionSnaps = await Promise.all(questionPromises);
          const questionData = questionSnaps.map(snap => ({ id: snap.id, ...snap.data() } as Question));
          setQuestions(questionData);
        }
      } catch (err) {
        setError('Failed to fetch quiz data.');
        console.error(err);
      }
      setLoading(false);
    };

    fetchQuizAndQuestions();
  }, [quizId]);

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleSaveAndPublish = async () => {
    if (!quizId) return;

    try {
      // Update all questions in Firestore
      const questionUpdatePromises = questions.map(q => updateDoc(doc(db, 'questions', q.id), { ...q }));
      await Promise.all(questionUpdatePromises);

      // Update quiz status to 'published'
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, { status: 'published', approvedBy: 'teacher' });

      alert('Quiz published successfully!');
    } catch (err) {
      setError('Failed to publish quiz.');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!quiz) return <div>No quiz found.</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Review & Refine Quiz: {quiz.title}</h1>
      {questions.map((q, index) => (
        <div key={q.id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <label>Question:</label>
          <input
            type="text"
            value={q.content}
            onChange={(e) => handleQuestionChange(index, 'content', e.target.value)}
            style={{ width: '100%', marginBottom: '10px' }}
          />
          <div>
            {q.options?.map((option, i) => (
              <div key={i}>
                <input
                  type="radio"
                  name={`question-${q.id}`}
                  checked={q.correctAnswer === i.toString()}
                  onChange={() => handleQuestionChange(index, 'correctAnswer', i.toString())}
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(q.options || [])];
                    newOptions[i] = e.target.value;
                    handleQuestionChange(index, 'options', newOptions);
                  }}
                  style={{ marginLeft: '10px' }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={handleSaveAndPublish} style={{ padding: '10px 20px', background: 'blue', color: 'white', border: 'none', cursor: 'pointer' }}>
        Save & Publish
      </button>
    </div>
  );
};

export default ReviewAndRefineQuizPage;
