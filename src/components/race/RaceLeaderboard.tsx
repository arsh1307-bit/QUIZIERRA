'use client';

import { Attempt } from '@/lib/types';
import { cn } from '@/lib/utils';

type RaceLeaderboardProps = {
  attempts: Attempt[];
  currentQuestionIndex: number;
};

export function RaceLeaderboard({ attempts, currentQuestionIndex }: RaceLeaderboardProps) {
  if (!attempts.length) return null;

  // Sort attempts by position (if race is in progress) or by score
  const sortedAttempts = [...attempts].sort((a, b) => {
    if (a.raceStats && b.raceStats) {
      return (a.raceStats.totalTime || 0) - (b.raceStats.totalTime || 0);
    }
    return (b.score || 0) - (a.score || 0);
  });

  const getPositionColor = (position: number) => {
    switch (position) {
      case 0: return 'bg-yellow-400 text-yellow-900';
      case 1: return 'bg-gray-300 text-gray-900';
      case 2: return 'bg-amber-600 text-white';
      default: return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-lg">Race Leaderboard</h3>
        <p className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} • {sortedAttempts.length} racers
        </p>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {sortedAttempts.map((attempt, index) => (
          <div key={attempt.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                  getPositionColor(index)
                )}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">
                    {attempt.studentName || `Player ${attempt.id.substring(0, 4)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {attempt.raceStats?.totalTime?.toFixed(2) || '--'}s
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                  🚗 {attempt.raceStats?.carParts.engine || 0}
                </div>
                <div className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                  🛑 {attempt.raceStats?.carParts.brakes || 0}
                </div>
                <div className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                  🔧 {attempt.raceStats?.carParts.chassis || 0}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
