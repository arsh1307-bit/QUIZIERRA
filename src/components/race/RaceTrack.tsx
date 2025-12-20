'use client';

import { Attempt } from '@/lib/types';

const getCarColor = (id: string, isLight = false) => {
  const colors = {
    player1: isLight ? '#FCA5A5' : '#EF4444', // Red
    player2: isLight ? '#93C5FD' : '#3B82F6', // Blue
    player3: isLight ? '#A7F3D0' : '#10B981', // Green
    player4: isLight ? '#FDE68A' : '#F59E0B', // Yellow
  };
  return colors[id as keyof typeof colors] || (isLight ? '#D1D5DB' : '#6B7280');
};

type RaceTrackProps = {
  attempts: Attempt[];
  currentQuestionIndex: number;
  totalQuestions: number;
};

export function RaceTrack({ attempts, currentQuestionIndex, totalQuestions }: RaceTrackProps) {
  const calculateCarPosition = (attempt: Attempt) => {
    if (!attempt.raceStats) return 0;
    const { carParts } = attempt.raceStats;
    const baseSpeed = (carParts.engine * 2 + carParts.brakes * 1.5 + carParts.chassis) / 4.5;
    const randomFactor = 0.9 + Math.random() * 0.2; 
    const progress = (currentQuestionIndex / totalQuestions) * 360 * totalQuestions;
    return (progress * (baseSpeed * randomFactor)) % 360; 
  };

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
      <div className="relative w-full aspect-square max-w-2xl mx-auto">
        <svg className="w-full h-full" viewBox="0 0 400 400">
          {/* TRACK DESIGN */}
          <circle cx="200" cy="200" r="120" fill="none" stroke="#333" strokeWidth="40" />
          <circle cx="200" cy="200" r="120" fill="none" stroke="#3a3a3a" strokeWidth="36" />
          <line x1="200" y1="60" x2="200" y2="100" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          
          {/* CARS */}
          {attempts.map((attempt) => {
            const currentAngleDegrees = calculateCarPosition(attempt);
            
            // MATH: Start at top (-90deg), move clockwise
            const angleRad = ((currentAngleDegrees - 90) * Math.PI) / 180;
            const radius = 120;
            const carX = 200 + radius * Math.cos(angleRad);
            const carY = 200 + radius * Math.sin(angleRad);
            
            // ROTATION: Face along the direction of travel
            // We add 90 because the SVG car drawing is vertical (nose pointing down relative to origin)
            const rotation = currentAngleDegrees + 90;
            
            return (
              <g 
                key={attempt.id}
                transform={`translate(${carX}, ${carY}) rotate(${rotation})`}
                className="transition-all duration-1000 ease-in-out"
              >
                {/* CAR ICON ASSEMBLY */}
                <g transform="scale(0.25) translate(-50, -85)">
                  {/* Axles */}
                  <rect x="15" y="33" width="70" height="6" fill="#546E7A" />
                  <rect x="20" y="133" width="60" height="6" fill="#546E7A" />

                  {/* Rear Wing */}
                  <rect x="0" y="0" width="100" height="35" fill={getCarColor(attempt.id)} />

                  {/* Sidepods */}
                  <path d="M 15,50 L 85,50 L 100,110 L 0,110 Z" fill="#546E7A" />

                  {/* Main Body & Nose */}
                  <path d="M 35,20 L 65,20 L 65,120 L 50,170 L 35,120 Z" fill={getCarColor(attempt.id)} />

                  {/* Cockpit */}
                  <rect x="42" y="65" width="16" height="25" rx="8" fill="#4E342E" />

                  {/* Wheels */}
                  <rect x="5" y="25" width="24" height="32" rx="4" fill="#37474F" />
                  <rect x="71" y="25" width="24" height="32" rx="4" fill="#37474F" />
                  <rect x="10" y="125" width="24" height="32" rx="4" fill="#37474F" />
                  <rect x="66" y="125" width="24" height="32" rx="4" fill="#37474F" />

                  {/* Front Wing */}
                  <rect x="5" y="165" width="90" height="15" fill={getCarColor(attempt.id)} />

                  {/* Driver Initial - Rotated to be readable */}
                  <text 
                    x="50" y="105" 
                    textAnchor="middle" 
                    fontSize="36" 
                    fill="white" 
                    fontWeight="900" 
                    transform="rotate(-90, 50, 105)"
                    style={{ userSelect: 'none' }}
                  >
                    {attempt.studentName?.charAt(0).toUpperCase() || 'P'}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}