'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useGarage } from '@/hooks/use-garage';
import { 
  type CarStats, 
  type RaceParticipant,
  type RaceType,
  generateBotStats 
} from '@/lib/racing-types';
import {
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Zap,
  ChevronUp,
  ChevronDown,
  Car,
  Bot,
  Users,
  Timer,
  Flag,
  Loader2
} from 'lucide-react';

interface RacerState {
  id: string;
  name: string;
  color: string;
  position: number; // 0-100%
  speed: number;
  nitro: number;
  maxNitro: number;
  stats: CarStats;
  isBot: boolean;
  finished: boolean;
  finishTime?: number;
  lane: number;
}

interface GameState {
  status: 'idle' | 'countdown' | 'racing' | 'finished';
  countdown: number;
  startTime: number;
  elapsedTime: number;
  winner?: string;
}

const TRACK_LENGTH = 100; // percentage
const FINISH_LINE = 100;
const NITRO_REGEN_RATE = 2; // Faster nitro regen
const NITRO_DRAIN_RATE = 1.5;
const POSITION_MULTIPLIER = 3; // Speed up race progression
const BOT_NAMES = ['Speed Demon', 'Road Runner', 'Turbo Tiger', 'Flash', 'Nitro Knight', 'Drift King'];

function CarSprite({ color, nitroActive, isPlayer }: { color: string; nitroActive: boolean; isPlayer: boolean }) {
  return (
    <div className="relative">
      <motion.div
        animate={nitroActive ? {
          x: [-2, 2, -2],
          transition: { duration: 0.1, repeat: Infinity }
        } : {}}
      >
        <svg viewBox="0 0 60 30" className={`w-16 h-8 ${isPlayer ? 'drop-shadow-lg' : ''}`}>
          {/* Nitro flames */}
          {nitroActive && (
            <motion.g
              animate={{ opacity: [1, 0.5, 1], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.1, repeat: Infinity }}
            >
              <ellipse cx="2" cy="15" rx="8" ry="4" fill="#F97316" />
              <ellipse cx="0" cy="15" rx="5" ry="2" fill="#FEF08A" />
            </motion.g>
          )}
          {/* Car body */}
          <path
            d="M8 18 L12 18 L16 10 L32 8 L45 8 L52 12 L58 18 L58 22 L8 22 Z"
            fill={color}
          />
          {/* Window */}
          <path
            d="M18 11 L30 9 L30 17 L18 17 Z"
            fill="#1e293b"
            opacity="0.8"
          />
          <path
            d="M32 9 L43 9 L50 14 L32 17 Z"
            fill="#1e293b"
            opacity="0.8"
          />
          {/* Wheels */}
          <circle cx="18" cy="22" r="5" fill="#1f2937" />
          <circle cx="18" cy="22" r="2" fill="#6b7280" />
          <circle cx="48" cy="22" r="5" fill="#1f2937" />
          <circle cx="48" cy="22" r="2" fill="#6b7280" />
          {/* Headlight */}
          <ellipse cx="56" cy="16" rx="2" ry="1.5" fill="#fef08a" />
          {/* Player indicator */}
          {isPlayer && (
            <polygon points="30,0 33,5 27,5" fill="#22C55E" />
          )}
        </svg>
      </motion.div>
    </div>
  );
}

function RaceTrack({ 
  racers, 
  gameState 
}: { 
  racers: RacerState[]; 
  gameState: GameState;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-full bg-gradient-to-b from-green-900 to-green-800 rounded-lg overflow-hidden p-4">
      {/* Sky */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-400 to-sky-300 rounded-t-lg" />
      
      {/* Track */}
      <div ref={trackRef} className="relative mt-16 space-y-2">
        {racers.map((racer, index) => (
          <div key={racer.id} className="relative h-14">
            {/* Lane */}
            <div className="absolute inset-0 bg-gray-700 rounded border-b-2 border-dashed border-white/30">
              {/* Lane markings */}
              <div className="absolute inset-y-0 left-0 right-0 flex justify-between px-4 items-center opacity-30">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="w-8 h-1 bg-white" />
                ))}
              </div>
            </div>
            
            {/* Finish line */}
            <div 
              className="absolute top-0 bottom-0 w-2 bg-gradient-to-b from-white via-black to-white"
              style={{ left: `${FINISH_LINE}%` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <Flag className="w-4 h-4 text-white" />
              </div>
            </div>
            
            {/* Car */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 z-10"
              animate={{ left: `${Math.min(racer.position, FINISH_LINE)}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            >
              <CarSprite 
                color={racer.color} 
                nitroActive={racer.nitro > 0 && racer.speed > racer.stats.speed} 
                isPlayer={!racer.isBot}
              />
            </motion.div>
            
            {/* Racer info */}
            <div className="absolute left-2 top-1 text-xs text-white/80 font-medium z-20">
              {racer.isBot ? <Bot className="w-3 h-3 inline mr-1" /> : <Car className="w-3 h-3 inline mr-1" />}
              {racer.name}
            </div>
            
            {/* Position indicator */}
            <div className="absolute right-2 top-1 z-20">
              <Badge variant={racer.finished ? 'default' : 'secondary'} className="text-xs">
                {racer.finished ? `🏁 ${((racer.finishTime || 0) / 1000).toFixed(2)}s` : `${racer.position.toFixed(1)}%`}
              </Badge>
            </div>
          </div>
        ))}
      </div>
      
      {/* Countdown overlay */}
      <AnimatePresence>
        {gameState.status === 'countdown' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 z-30"
          >
            <motion.span
              key={gameState.countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-8xl font-bold text-white"
            >
              {gameState.countdown === 0 ? 'GO!' : gameState.countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Winner overlay */}
      <AnimatePresence>
        {gameState.status === 'finished' && gameState.winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/70 z-30"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-center"
            >
              <Trophy className="w-20 h-20 mx-auto text-yellow-400 mb-4" />
              <h2 className="text-4xl font-bold text-white mb-2">
                {gameState.winner} Wins!
              </h2>
              <p className="text-white/80">
                Time: {(gameState.elapsedTime / 1000).toFixed(2)}s
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Controls({
  onAccelerate,
  onBrake,
  onNitro,
  nitroAmount,
  maxNitro,
  disabled,
  speed,
  maxSpeed
}: {
  onAccelerate: () => void;
  onBrake: () => void;
  onNitro: () => void;
  nitroAmount: number;
  maxNitro: number;
  disabled: boolean;
  speed: number;
  maxSpeed: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-4">
          {/* Speed gauge */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground text-center">Speed</div>
            <div className="relative h-24 w-24 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#22C55E" 
                  strokeWidth="8"
                  strokeDasharray={`${(speed / maxSpeed) * 283} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="55" textAnchor="middle" className="text-lg font-bold fill-current">
                  {Math.round(speed)}
                </text>
              </svg>
            </div>
          </div>
          
          {/* Control buttons */}
          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="w-20 h-20 rounded-full"
              onMouseDown={onAccelerate}
              onTouchStart={onAccelerate}
              disabled={disabled}
            >
              <ChevronUp className="w-10 h-10" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-20 h-20 rounded-full"
              onMouseDown={onBrake}
              onTouchStart={onBrake}
              disabled={disabled}
            >
              <ChevronDown className="w-10 h-10" />
            </Button>
          </div>
          
          {/* Nitro */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground text-center">Nitro</div>
            <Button
              size="lg"
              variant="destructive"
              className="w-24 h-24 rounded-full mx-auto flex flex-col"
              onMouseDown={onNitro}
              onTouchStart={onNitro}
              disabled={disabled || nitroAmount <= 0}
            >
              <Zap className="w-8 h-8" />
              <span className="text-xs">{Math.round(nitroAmount)}%</span>
            </Button>
            <Progress value={(nitroAmount / maxNitro) * 100} className="h-2" />
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Use keyboard: ↑ Accelerate | ↓ Brake | Space for Nitro
        </div>
      </CardContent>
    </Card>
  );
}

export function RacingGame({ 
  raceType = 'bot',
  botDifficulty = 'medium',
  onRaceComplete
}: { 
  raceType?: RaceType;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  onRaceComplete?: (won: boolean, time: number) => void;
}) {
  const { garage, carStats, updateRaceStats } = useGarage();
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    countdown: 3,
    startTime: 0,
    elapsedTime: 0,
  });
  
  const [racers, setRacers] = useState<RacerState[]>([]);
  const [isNitroActive, setIsNitroActive] = useState(false);
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [isBraking, setIsBraking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);

  // Initialize race - only call this explicitly, not in useEffect
  const initializeRace = useCallback(() => {
    if (!garage || !carStats) {
      console.log('Cannot initialize: missing garage or carStats');
      return;
    }

    console.log('Initializing race...');

    const playerRacer: RacerState = {
      id: garage.odId,
      name: garage.carName,
      color: garage.carColor,
      position: 0,
      speed: 0,
      nitro: 100,
      maxNitro: 100,
      stats: { ...carStats }, // Create a copy to avoid reference issues
      isBot: false,
      finished: false,
      lane: 0,
    };

    const bots: RacerState[] = [];
    if (raceType === 'bot') {
      const numBots = botDifficulty === 'easy' ? 2 : botDifficulty === 'medium' ? 3 : 4;
      for (let i = 0; i < numBots; i++) {
        const botStats = generateBotStats(botDifficulty);
        botStats.totalPower = botStats.speed + botStats.acceleration + botStats.handling + botStats.nitroBoost;
        bots.push({
          id: `bot-${i}`,
          name: BOT_NAMES[i % BOT_NAMES.length],
          color: ['#EF4444', '#F59E0B', '#8B5CF6', '#EC4899'][i],
          position: 0,
          speed: 0,
          nitro: 100,
          maxNitro: 100,
          stats: botStats,
          isBot: true,
          finished: false,
          lane: i + 1,
        });
      }
    }

    setRacers([playerRacer, ...bots]);
    setGameState({
      status: 'idle',
      countdown: 3,
      startTime: 0,
      elapsedTime: 0,
    });
    setIsInitialized(true);
    console.log('Race initialized with', bots.length + 1, 'racers');
  }, [garage?.odId, garage?.carName, garage?.carColor, carStats?.totalPower, raceType, botDifficulty]);

  // Only initialize once on mount
  useEffect(() => {
    if (!isInitialized && garage && carStats) {
      initializeRace();
    }
  }, [isInitialized, garage, carStats, initializeRace]);

  // Start race countdown
  const startRace = () => {
    setGameState(prev => ({ ...prev, status: 'countdown', countdown: 3 }));
    
    const countdownInterval = setInterval(() => {
      setGameState(prev => {
        if (prev.countdown <= 1) {
          clearInterval(countdownInterval);
          return {
            ...prev,
            status: 'racing',
            countdown: 0,
            startTime: Date.now(),
          };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  // Game loop
  useEffect(() => {
    if (gameState.status !== 'racing') return;

    const updateGame = (timestamp: number) => {
      const deltaTime = lastUpdateRef.current ? (timestamp - lastUpdateRef.current) / 1000 : 0.016;
      lastUpdateRef.current = timestamp;

      setRacers(prevRacers => {
        const updatedRacers = prevRacers.map(racer => {
          if (racer.finished) return racer;

          let newSpeed = racer.speed;
          let newNitro = racer.nitro;
          let newPosition = racer.position;

          if (racer.isBot) {
            // Bot AI - balanced for fair competitive racing
            // Bots reach 60-75% of their max speed
            const targetSpeed = racer.stats.speed * (0.60 + Math.random() * 0.15);
            // Moderate acceleration
            const accelerationRate = racer.stats.acceleration * 0.32;
            
            if (newSpeed < targetSpeed) {
              newSpeed += accelerationRate * deltaTime;
            } else if (newSpeed > targetSpeed * 1.1) {
              // Gradually slow down if too fast (prevents sudden spikes)
              newSpeed = Math.max(targetSpeed, newSpeed - accelerationRate * 0.3 * deltaTime);
            }
            
            // Bot nitro usage - occasional small boosts
            if (newNitro > 40 && Math.random() < 0.008) {
              // Moderate boost
              newSpeed += racer.stats.nitroBoost * 0.25;
              newNitro -= NITRO_DRAIN_RATE * deltaTime * 6;
            }
            
            // Normal nitro regen for bots
            newNitro = Math.min(racer.maxNitro, newNitro + NITRO_REGEN_RATE * deltaTime * 0.8);
          } else {
            // Player controls - snappy and responsive
            const accelerationRate = racer.stats.acceleration * 1.2; // Faster acceleration
            const brakingRate = racer.stats.handling * 0.8;
            const maxSpeed = racer.stats.speed * 1.1; // Slightly higher max speed for player

            if (isAccelerating) {
              newSpeed = Math.min(maxSpeed, newSpeed + accelerationRate * deltaTime * 2);
            } else if (isBraking) {
              newSpeed = Math.max(0, newSpeed - brakingRate * deltaTime * 2);
            } else {
              // Slower natural deceleration
              newSpeed = Math.max(0, newSpeed - (accelerationRate * 0.15) * deltaTime);
            }

            // Nitro boost - more powerful for player
            if (isNitroActive && newNitro > 0) {
              newSpeed = Math.min(maxSpeed * 1.6, newSpeed + racer.stats.nitroBoost * deltaTime * 1.5);
              newNitro = Math.max(0, newNitro - NITRO_DRAIN_RATE * deltaTime * 20);
            } else {
              // Nitro regen
              newNitro = Math.min(racer.maxNitro, newNitro + NITRO_REGEN_RATE * deltaTime * 3);
            }
          }

          // Update position - multiplied for faster races
          newPosition += (newSpeed / 50) * deltaTime * POSITION_MULTIPLIER;

          // Check finish
          if (newPosition >= FINISH_LINE && !racer.finished) {
            return {
              ...racer,
              position: FINISH_LINE,
              speed: 0,
              nitro: newNitro,
              finished: true,
              finishTime: Date.now() - gameState.startTime,
            };
          }

          return {
            ...racer,
            speed: newSpeed,
            nitro: newNitro,
            position: Math.min(newPosition, FINISH_LINE),
          };
        });

        // Check if race is finished
        const finishedRacers = updatedRacers.filter(r => r.finished);
        if (finishedRacers.length === updatedRacers.length || finishedRacers.some(r => !r.isBot)) {
          const sortedByTime = [...finishedRacers].sort((a, b) => (a.finishTime || Infinity) - (b.finishTime || Infinity));
          const winner = sortedByTime[0];
          
          if (winner && gameState.status === 'racing') {
            setGameState(prev => ({
              ...prev,
              status: 'finished',
              winner: winner.name,
              elapsedTime: winner.finishTime || Date.now() - prev.startTime,
            }));

            const playerWon = !winner.isBot;
            updateRaceStats(playerWon);
            onRaceComplete?.(playerWon, winner.finishTime || 0);
            
            toast({
              title: playerWon ? '🏆 Victory!' : '💨 Race Complete',
              description: playerWon 
                ? `You won in ${((winner.finishTime || 0) / 1000).toFixed(2)}s!`
                : `${winner.name} won the race.`,
            });
          }
        }

        return updatedRacers;
      });

      setGameState(prev => ({
        ...prev,
        elapsedTime: Date.now() - prev.startTime,
      }));

      gameLoopRef.current = requestAnimationFrame(updateGame);
    };

    gameLoopRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.status, gameState.startTime, isAccelerating, isBraking, isNitroActive, updateRaceStats, onRaceComplete, toast]);

  // Keyboard controls - prevent default to stop page scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for arrow keys and space to stop page scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      
      if (gameState.status !== 'racing') return;
      
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setIsAccelerating(true);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setIsBraking(true);
      }
      if (e.key === ' ') {
        setIsNitroActive(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setIsAccelerating(false);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setIsBraking(false);
      }
      if (e.key === ' ') {
        setIsNitroActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.status]);

  const playerRacer = racers.find(r => !r.isBot);

  if (!garage || !carStats) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Loading your garage...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Race info header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            {raceType === 'bot' ? <Bot className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            {raceType === 'bot' ? `vs Bots (${botDifficulty})` : 'Multiplayer'}
          </Badge>
          {gameState.status === 'racing' && (
            <Badge className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              {(gameState.elapsedTime / 1000).toFixed(2)}s
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {gameState.status === 'idle' && racers.length > 0 && (
            <Button onClick={startRace}>
              <Play className="w-4 h-4 mr-2" />
              Start Race
            </Button>
          )}
          {gameState.status === 'finished' && (
            <Button onClick={() => {
              setIsInitialized(false);
              setTimeout(() => initializeRace(), 100);
            }}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Race Again
            </Button>
          )}
        </div>
      </div>

      {/* Race track */}
      {racers.length > 0 ? (
        <RaceTrack racers={racers} gameState={gameState} />
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Preparing race...</p>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      {playerRacer && (
        <Controls
          onAccelerate={() => setIsAccelerating(true)}
          onBrake={() => setIsBraking(true)}
          onNitro={() => setIsNitroActive(true)}
          nitroAmount={playerRacer.nitro}
          maxNitro={playerRacer.maxNitro}
          disabled={gameState.status !== 'racing'}
          speed={playerRacer.speed}
          maxSpeed={playerRacer.stats.speed}
        />
      )}
    </div>
  );
}
