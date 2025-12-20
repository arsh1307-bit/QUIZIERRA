'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RaceTrack } from '@/components/race/RaceTrack';
import { RaceLeaderboard } from '@/components/race/RaceLeaderboard';
import { Attempt } from '@/lib/types';

// Mock data for demo
const MOCK_ATTEMPTS: Attempt[] = [
  {
    id: 'player1',
    studentId: 'player1',
    studentName: 'Alice',
    examId: 'demo',
    answers: [],
    score: 0,
    totalQuestions: 5,
    status: 'In Progress',
    startedAt: new Date().toISOString(),
    raceStats: {
      lapTimes: [],
      totalTime: 0,
      currentPosition: 0,
      carParts: { chassis: 1, brakes: 1, engine: 1 }
    }
  },
  {
    id: 'player2',
    studentId: 'player2',
    studentName: 'Bob',
    examId: 'demo',
    answers: [],
    score: 0,
    totalQuestions: 5,
    status: 'In Progress',
    startedAt: new Date().toISOString(),
    raceStats: {
      lapTimes: [],
      totalTime: 0,
      currentPosition: 0,
      carParts: { chassis: 1, brakes: 1, engine: 1 }
    }
  },
  {
    id: 'player3',
    studentId: 'player3',
    studentName: 'Charlie',
    examId: 'demo',
    answers: [],
    score: 0,
    totalQuestions: 5,
    status: 'In Progress',
    startedAt: new Date().toISOString(),
    raceStats: {
      lapTimes: [],
      totalTime: 0,
      currentPosition: 0,
      carParts: { chassis: 1, brakes: 1, engine: 1 }
    }
  }
];

export default function RaceDemoPage() {
  const [attempts, setAttempts] = useState<Attempt[]>(MOCK_ATTEMPTS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, boolean>>({});
  const totalQuestions = 5;

  const handleAnswerToggle = (playerId: string) => {
    setCorrectAnswers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  const submitQuestion = () => {
    // Update car parts based on question difficulty and correct answers
    setAttempts(prev => 
      prev.map(attempt => {
        if (!correctAnswers[attempt.id]) return attempt;
        
        // Upgrade car parts based on question difficulty
        const updatedParts = { ...attempt.raceStats!.carParts };
        
        if (selectedDifficulty === 'easy') {
          updatedParts.chassis = Math.min(updatedParts.chassis + 1, 5);
        } else if (selectedDifficulty === 'medium') {
          updatedParts.brakes = Math.min(updatedParts.brakes + 1, 5);
        } else { // hard
          updatedParts.engine = Math.min(updatedParts.engine + 1, 5);
        }

        return {
          ...attempt,
          raceStats: {
            ...attempt.raceStats!,
            carParts: updatedParts
          }
        };
      })
    );

    // Simulate lap
    simulateLap();
    
    // Reset for next question
    setCorrectAnswers({});
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const simulateLap = () => {
    // Group attempts by their car part configuration
    const attemptsByConfig = new Map<string, { config: string, attempts: Attempt[] }>();
    
    attempts.forEach(attempt => {
      if (!attempt.raceStats) return;
      
      const config = `${attempt.raceStats.carParts.engine}-${attempt.raceStats.carParts.brakes}-${attempt.raceStats.carParts.chassis}`;
      
      if (!attemptsByConfig.has(config)) {
        attemptsByConfig.set(config, { 
          config, 
          attempts: [] 
        });
      }
      attemptsByConfig.get(config)?.attempts.push(attempt);
    });

    // Calculate lap time for each unique configuration
    const configLapTimes = new Map<string, number>();
    
    attemptsByConfig.forEach(({ config, attempts }) => {
      const { carParts } = attempts[0].raceStats!;
      const baseTime = 20;
      const engineFactor = 1 - (carParts.engine * 0.05);
      const brakesFactor = 1 - (carParts.brakes * 0.03);
      const chassisFactor = 1 - (carParts.chassis * 0.02);
      const randomFactor = 0.9 + Math.random() * 0.2;
      
      // Same configuration gets the same lap time
      const lapTime = baseTime * engineFactor * brakesFactor * chassisFactor * randomFactor;
      configLapTimes.set(config, lapTime);
    });

    // Update all attempts with their respective lap times
    setAttempts(prev => 
      prev.map(attempt => {
        if (!attempt.raceStats) return attempt;
        
        const config = `${attempt.raceStats.carParts.engine}-${attempt.raceStats.carParts.brakes}-${attempt.raceStats.carParts.chassis}`;
        const lapTime = configLapTimes.get(config) || 0;
        
        const newLapTimes = [...(attempt.raceStats.lapTimes || []), lapTime];
        
        return {
          ...attempt,
          raceStats: {
            ...attempt.raceStats,
            lapTimes: newLapTimes,
            totalTime: newLapTimes.reduce((sum, time) => sum + time, 0)
          }
        };
      })
    );
  };

  const resetRace = () => {
    setAttempts(MOCK_ATTEMPTS);
    setCurrentQuestionIndex(0);
    setCorrectAnswers({});
    setSelectedDifficulty('easy');
  };

  const isRaceComplete = currentQuestionIndex >= totalQuestions;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">🏁 Quiz Race Demo</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RaceTrack 
            attempts={attempts} 
            currentQuestionIndex={currentQuestionIndex} 
            totalQuestions={totalQuestions} 
          />
          
          <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-xl font-semibold mb-4">
              Question {Math.min(currentQuestionIndex + 1, totalQuestions)} of {totalQuestions}
            </h2>
            
            {!isRaceComplete ? (
              <>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Question Difficulty:</h3>
                  <div className="flex flex-wrap gap-2">
                    {(['easy', 'medium', 'hard'] as const).map(difficulty => (
                      <Button
                        key={difficulty}
                        variant={selectedDifficulty === difficulty ? 'default' : 'outline'}
                        onClick={() => setSelectedDifficulty(difficulty)}
                        className="capitalize flex-1"
                      >
                        {difficulty === 'easy' && '😊 '}
                        {difficulty === 'medium' && '🤔 '}
                        {difficulty === 'hard' && '🧠 '}
                        {difficulty}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Mark Correct Answers:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {attempts.map(attempt => (
                      <Button
                        key={attempt.id}
                        variant={correctAnswers[attempt.id] ? 'default' : 'outline'}
                        onClick={() => handleAnswerToggle(attempt.id)}
                        className="justify-start"
                      >
                        <span className="mr-2">
                          {correctAnswers[attempt.id] ? '✅' : '⬜'}
                        </span>
                        {attempt.studentName}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={submitQuestion}
                  disabled={Object.values(correctAnswers).every(v => !v)}
                  className="w-full"
                >
                  Submit Question
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <h3 className="text-2xl font-bold mb-4">🏁 Race Complete! 🏁</h3>
                <p className="mb-6">The race is over! Check the leaderboard for final results.</p>
                <Button onClick={resetRace} size="lg">
                  Start New Race
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <RaceLeaderboard 
            attempts={attempts} 
            currentQuestionIndex={currentQuestionIndex} 
          />
          
          <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold mb-3">How It Works</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Select question difficulty (Easy/Medium/Hard)</li>
              <li>• Mark which participants got it right</li>
              <li>• Correct answers upgrade car parts:</li>
              <li className="ml-4">- Easy: 🏗️ Chassis (stability)</li>
              <li className="ml-4">- Medium: 🛑 Brakes (control)</li>
              <li className="ml-4">- Hard: 🚀 Engine (speed)</li>
              <li>• After each question, cars race a lap</li>
              <li>• Fastest total time wins!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
