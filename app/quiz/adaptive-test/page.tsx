
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios'; // Make sure to install axios: npm install axios

const AdaptiveTestPage = () => {
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState('medium');
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNextQuestion = async (difficulty: string, correct: boolean | null) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/adaptive-next-question', {
        userId: 'test-user', // Replace with a real user ID
        currentDifficulty: difficulty,
        lastWasCorrect: correct,
      });
      setCurrentQuestion(response.data);
    } catch (err) {
      setError('Failed to fetch the next question.');
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNextQuestion(currentDifficulty, lastWasCorrect);
  }, [currentDifficulty, lastWasCorrect]);

  const handleAnswer = (isCorrect: boolean) => {
    setLastWasCorrect(isCorrect);
    // The difficulty for the *next* question will be determined by the backend
    // But we can anticipate it on the client for a smoother experience
    if (isCorrect) {
      if (currentDifficulty === 'easy') setCurrentDifficulty('medium');
      else setCurrentDifficulty('hard');
    } else {
      if (currentDifficulty === 'hard') setCurrentDifficulty('medium');
      else setCurrentDifficulty('easy');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!currentQuestion) return <div>No more questions available at this level.</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Adaptive Quiz</h1>
      <p><strong>Difficulty:</strong> {currentQuestion.difficulty}</p>
      <p>{currentQuestion.text_preview}</p>
      <div>
        <button onClick={() => handleAnswer(true)} style={{ margin: '5px', padding: '10px', background: 'green', color: 'white' }}>Correct</button>
        <button onClick={() => handleAnswer(false)} style={{ margin: '5px', padding: '10px', background: 'red', color: 'white' }}>Incorrect</button>
      </div>
    </div>
  );
};

export default AdaptiveTestPage;
