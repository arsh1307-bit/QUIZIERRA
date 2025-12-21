'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGarage } from '@/hooks/use-garage';
import { useFirebase } from '@/firebase/provider';
import { collection, addDoc } from 'firebase/firestore';
import { type CarStats } from '@/lib/racing-types';
import {
  Play,
  RotateCcw,
  Trophy,
  ChevronUp,
  Frown,
  Zap,
} from 'lucide-react';

// --- Constants ---
const FINISH_LINE = 100;
const POSITION_MULTIPLIER = 18;
const BOT_NAMES = ['Apex', 'Vortex', 'Nitro-Fuel', 'Turbo-X', 'Phantom', 'Blitz'];

// --- Types ---
interface Racer {
  id: string;
  name: string;
  color: string;
  position: number;
  speed: number;
  nitro: number;
  stats: CarStats & { nitroBoost: number; handling: number }; // Ensure these props exist
  isBot: boolean;
  finished: boolean;
  finishTime?: number;
}

// --- Car Sprite Component ---
function CarSprite({ color, nitroActive, isPlayer }: { color: string; nitroActive: boolean; isPlayer: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-16">
      <motion.div
        animate={nitroActive ? { y: [-1, 1, -1] } : {}}
        transition={{ duration: 0.1, repeat: Infinity }}
      >
        <svg viewBox="0 0 60 30" className={`w-16 h-8 ${isPlayer ? 'drop-shadow-[0_0_12px_rgba(34,197,94,0.9)]' : 'drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]'}`}>
          {nitroActive && (
            <motion.g animate={{ opacity: [1, 0.5, 1], scale: [1, 1.4, 1] }} transition={{ duration: 0.05, repeat: Infinity }}>
              <path d="M-5 15 L5 10 L5 20 Z" fill="#F97316" />
              <path d="M-2 15 L4 12 L4 18 Z" fill="#FEF08A" />
            </motion.g>
          )}
          <path d="M8 18 L12 18 L16 10 L32 8 L45 8 L52 12 L58 18 L58 22 L8 22 Z" fill={color} />
          <path d="M18 11 L30 9 L30 17 L18 17 Z" fill="#1e293b" opacity="0.8" />
          <path d="M32 9 L43 9 L50 14 L32 17 Z" fill="#1e293b" opacity="0.8" />
          <circle cx="18" cy="22" r="5" fill="#1f2937" />
          <circle cx="18" cy="22" r="2" fill="#6b7280" />
          <circle cx="48" cy="22" r="5" fill="#1f2937" />
          <circle cx="48" cy="22" r="2" fill="#6b7280" />
          {isPlayer && <polygon points="30,0 33,5 27,5" fill="#22C55E" />}
        </svg>
      </motion.div>
    </div>
  );
}

export function RacingGame({ botDifficulty = 'medium', onRaceComplete }: any) {
  const { garage, carStats, updateRaceStats } = useGarage();
  const { user, firestore } = useFirebase();

  const [status, setStatus] = useState<'idle' | 'countdown' | 'racing' | 'finished'>('idle');
  const [lights, setLights] = useState(0);
  const [winnerData, setWinnerData] = useState<{ name: string; isPlayer: boolean; time: number } | null>(null);
  const [displayTime, setDisplayTime] = useState(0);

  // Use the Racer interface here instead of any[]
  const racersRef = useRef<Racer[]>([]);
  const controlsRef = useRef({ up: false, down: false, nitro: false });
  
  // FIXED: Initialized with null to satisfy TypeScript
  const gameLoopRef = useRef<number | null>(null);
  
  const lastUpdateRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [, setTick] = useState(0);

  const initializeRace = useCallback(() => {
    if (!garage || !carStats) return;

    let botMult = 1.15;
    if (botDifficulty === 'medium') botMult = 1.25;
    if (botDifficulty === 'hard') botMult = 1.35;

    // Helper to ensure stats have defaults if undefined
    const baseStats = {
      ...carStats,
      nitroBoost: (carStats as any).nitroBoost || 50,
      handling: (carStats as any).handling || 50
    };

    const player: Racer = {
      id: 'player',
      name: garage.carName || 'You',
      color: garage.carColor || '#22C55E',
      position: 0, speed: 0, nitro: 100,
      stats: { ...baseStats },
      isBot: false, finished: false
    };

    const bots: Racer[] = [0, 1, 2].map(i => ({
      id: `bot-${i}`,
      name: BOT_NAMES[i],
      color: ['#EF4444', '#F59E0B', '#8B5CF6'][i],
      position: 0, speed: 0, nitro: 100,
      stats: {
        ...baseStats,
        speed: baseStats.speed * botMult,
        acceleration: baseStats.acceleration * botMult
      },
      isBot: true, finished: false
    }));

    racersRef.current = [player, ...bots];
    setStatus('idle');
    setWinnerData(null);
    setDisplayTime(0);
    setLights(0);
  }, [garage, carStats, botDifficulty]);

  useEffect(() => {
    if (racersRef.current.length === 0) initializeRace();
  }, [initializeRace]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') controlsRef.current.up = isDown;
      if (k === 's' || k === 'arrowdown') controlsRef.current.down = isDown;
      if (e.code === 'Space') controlsRef.current.nitro = isDown;
    };
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    return () => {
      window.removeEventListener('keydown', (e) => handleKey(e, true));
      window.removeEventListener('keyup', (e) => handleKey(e, false));
    };
  }, []);

  const startRace = () => {
    setStatus('countdown');
    let currentLight = 0;
    const interval = setInterval(() => {
      currentLight += 1;
      setLights(currentLight);
      if (currentLight === 5) {
        clearInterval(interval);
        setTimeout(() => {
          setLights(0);
          startTimeRef.current = Date.now();
          lastUpdateRef.current = Date.now();
          setStatus('racing');
        }, 600 + Math.random() * 1000);
      }
    }, 700);
  };

  useEffect(() => {
    if (status !== 'racing') return;

    const update = () => {
      const now = Date.now();
      const dt = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;
      setDisplayTime(now - startTimeRef.current);

      let winner: Racer | null = null;

      racersRef.current.forEach(r => {
        if (r.finished) return;

        if (r.isBot) {
          const target = r.stats.speed;
          r.speed += (target - r.speed) * dt;
          const playerPos = racersRef.current.find(p => !p.isBot)?.position || 0;
          
          // Bot Logic
          if (r.position < playerPos - 10 && r.nitro > 20) {
            r.speed += r.stats.nitroBoost * dt * 0.5;
            r.nitro -= dt * 15;
          } else {
            r.nitro = Math.min(100, r.nitro + dt * 3);
          }
        } else {
          // Player Logic
          const { up, down, nitro } = controlsRef.current;
          if (up) r.speed = Math.min(r.stats.speed * 1.3, r.speed + r.stats.acceleration * dt * 2.5);
          else if (down) r.speed = Math.max(0, r.speed - r.stats.handling * 10 * dt);
          else r.speed = Math.max(0, r.speed - 20 * dt);

          if (nitro && r.nitro > 0) {
            r.speed += (r.stats.nitroBoost * 2.0) * dt;
            r.nitro = Math.max(0, r.nitro - (dt * 45));
          } else {
            r.nitro = Math.min(100, r.nitro + (dt * 4));
          }
        }

        r.position += (r.speed / 60) * dt * POSITION_MULTIPLIER;

        if (r.position >= FINISH_LINE) {
          r.position = 100;
          r.finished = true;
          r.finishTime = now - startTimeRef.current;
          if (!winner) winner = r;
        }
      });

      setTick(now);

      if (winner) {
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        const isPlayer = !(winner as Racer).isBot;
        updateRaceStats(isPlayer);
        setWinnerData({ name: (winner as Racer).name, isPlayer, time: (winner as Racer).finishTime! });
        setStatus('finished');
        // --- Save race result to Firestore ---
        if (firestore && user && isPlayer) {
          // Compose race result object
          const player = racersRef.current.find(r => !r.isBot);
          const bots = racersRef.current.filter(r => r.isBot);
          // Build participants list from current racers (no undefined entries)
          const participants = racersRef.current.slice().sort((a, b) => (a.finishTime ?? 999999) - (b.finishTime ?? 999999));
          const playerRank = participants.findIndex(r => r.id === 'player') + 1;
          const coinsEarned = isPlayer && playerRank === 1 ? 50 : 10;
          const raceResult = {
            userId: user.uid,
            carName: garage?.carName || 'You',
            carColor: garage?.carColor || '#22C55E',
            finishTime: player?.finishTime ?? 0,
            rank: playerRank,
            totalParticipants: 1 + bots.length,
            coinsEarned,
            raceType: 'bot',
            createdAt: new Date().toISOString(),
          };
          addDoc(collection(firestore, 'raceResults'), raceResult).catch(console.error);
        }
        if (onRaceComplete) onRaceComplete(isPlayer, (winner as Racer).finishTime);
      } else {
        gameLoopRef.current = requestAnimationFrame(update);
      }
    };

    gameLoopRef.current = requestAnimationFrame(update);
    
    // Clean up function with safety check
    return () => {
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [status, updateRaceStats, onRaceComplete]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 p-4">
      <div className="flex justify-between items-center px-2">
        <Badge variant="outline" className="bg-slate-900 text-white border-slate-700 uppercase px-4 py-1">
          Circuit: {botDifficulty}
        </Badge>
        <div className="bg-green-600 text-white font-mono px-4 py-1 rounded-md text-xl shadow-[0_0_15px_rgba(22,163,74,0.5)]">
          {(displayTime / 1000).toFixed(2)}s
        </div>
      </div>

      <div className="relative bg-[#222] rounded-3xl border-8 border-slate-800 shadow-2xl overflow-hidden min-h-[400px] flex flex-col justify-center">
        
        {/* TRACK LANES SYSTEM */}
        <div className="absolute inset-0 flex flex-col py-4">
          {racersRef.current.map((_, i) => (
            <div 
              key={`lane-${i}`} 
              className={`flex-1 w-full border-b border-white/10 relative flex items-center ${i === 0 ? 'border-t border-white/10' : ''} bg-[#2a2a2a] shadow-inner`}
            >
              {/* Central Dash Markings */}
              <div className="absolute top-1/2 left-0 right-0 h-[2px] border-t border-dashed border-white/5 -translate-y-1/2" />
              
              {/* Lane ID */}
              <div className="absolute left-4 opacity-5 text-white font-black italic text-4xl select-none">
                0{i + 1}
              </div>
            </div>
          ))}

          {/* F1 STYLE FINISH LINE GANTRY */}
          <div className="absolute right-0 top-0 bottom-0 w-24 flex">
             {/* Checkered pattern background */}
             <div 
              className="w-full h-full opacity-20"
              style={{
                backgroundImage: `radial-gradient(#fff 2px, transparent 2px), radial-gradient(#fff 2px, #000 2px)`,
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px'
              }}
             />
             {/* The Finish Gantry Line */}
             <div className="absolute right-12 top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
          </div>
        </div>

        {/* CARS LAYER */}
        <div className="space-y-0 relative z-10 flex flex-col h-full py-4 min-h-[360px]">
          {racersRef.current.map((r, idx) => (
            <div key={r.id} className="flex-1 flex items-center relative">
              <motion.div 
                className="absolute flex items-center"
                animate={{ left: `${r.position}%` }}
                transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
                style={{ x: r.position >= 100 ? '-100%' : '0' }}
              >
                <CarSprite 
                    color={r.color} 
                    nitroActive={r.nitro > 0 && r.speed > r.stats.speed * 1.1 && !r.finished} 
                    isPlayer={!r.isBot} 
                />
                <div className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap shadow-sm ${!r.isBot ? 'bg-green-500 text-black' : 'bg-black/60 text-white/50'}`}>
                  {r.name}
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        {/* F1 STYLE LIGHTS GAUNTRY */}
        <AnimatePresence>
          {status === 'countdown' && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-x-0 top-6 flex flex-col items-center z-40"
            >
              <div className="bg-zinc-900 p-4 rounded-xl border-4 border-zinc-800 shadow-2xl flex gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className={`w-10 h-10 rounded-full border-4 border-black/40 transition-colors duration-200 ${lights >= i ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)]' : 'bg-zinc-800'}`} />
                    <div className={`w-10 h-10 rounded-full border-4 border-black/40 transition-colors duration-200 ${lights >= i ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)]' : 'bg-zinc-800'}`} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Button Overlay */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
            <Button onClick={startRace} className="bg-white text-black hover:bg-green-500 hover:text-white text-2xl font-black px-12 py-8 rounded-xl transition-all shadow-2xl uppercase italic tracking-tighter">
              Engage Engine
            </Button>
          </div>
        )}

        {/* Results Modal */}
        <AnimatePresence>
          {status === 'finished' && winnerData && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex items-center justify-center bg-black/95 z-50 p-6">
              <Card className={`w-full max-w-sm border-4 bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,1)] ${winnerData.isPlayer ? 'border-green-500' : 'border-red-500'}`}>
                <div className="p-8 text-center">
                  <div className="mb-4">
                    {winnerData.isPlayer ? <Trophy className="w-20 h-20 text-yellow-400 mx-auto" /> : <Frown className="w-20 h-20 text-red-500 mx-auto" />}
                  </div>
                  <h2 className="text-5xl font-black text-white italic mb-1 uppercase tracking-tighter">
                    {winnerData.isPlayer ? 'Podium P1' : 'Rank P2'}
                  </h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest mb-6">{winnerData.name}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-800 p-3 rounded-lg border border-white/5">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Lap Time</p>
                      <p className="text-xl font-mono text-white">{(winnerData.time / 1000).toFixed(2)}s</p>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-white/5">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Contract Pay</p>
                      <p className="text-xl font-mono text-yellow-500">{winnerData.isPlayer ? '+$1,000' : '$0'}</p>
                    </div>
                  </div>

                  <Button onClick={initializeRace} className="w-full bg-green-600 hover:bg-green-500 text-white font-black h-14 text-lg">
                    <RotateCcw className="mr-2 h-5 w-5" /> RE-ENTER PIT
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* TELEMETRY DASHBOARD */}
      <Card className="bg-slate-900 border-slate-800 p-6 shadow-xl border-b-4 border-b-green-500">
        <div className="grid grid-cols-3 gap-8 items-center">
          <div className="text-left">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 italic">Speed Telemetry</p>
            <div className="text-4xl font-black text-white italic leading-none">
              {Math.round(racersRef.current.find(r => !r.isBot)?.speed || 0)} <span className="text-xs text-slate-600 not-italic uppercase">km/h</span>
            </div>
          </div>
          
          <div className="flex justify-center gap-6">
             <div className={`p-4 rounded-2xl border-2 transition-all duration-75 ${controlsRef.current.up ? 'bg-green-500 border-green-400 text-black scale-90 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-slate-800 text-slate-700'}`}>
                <ChevronUp strokeWidth={4} />
             </div>
             <div className={`p-4 rounded-2xl border-2 transition-all duration-75 ${controlsRef.current.nitro ? 'bg-orange-500 border-orange-400 text-black scale-90 shadow-[0_0_20px_rgba(249,115,22,0.6)]' : 'border-slate-800 text-slate-700'}`}>
                <Zap fill="currentColor" />
             </div>
          </div>

          <div className="space-y-2">
             <div className="flex justify-between text-[10px] font-black uppercase italic">
                <span className="text-orange-500 tracking-tighter">Nitro Core Temp</span>
                <span className="text-white">{Math.round(racersRef.current.find(r => !r.isBot)?.nitro || 0)}%</span>
             </div>
             <Progress 
                value={racersRef.current.find(r => !r.isBot)?.nitro || 0} 
                className={`h-3 bg-slate-800 ${
                  controlsRef.current.nitro 
                    ? '[&>div]:bg-white' 
                    : '[&>div]:bg-orange-500 [&>div]:shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                }`}
             />
             <p className="text-[9px] text-slate-600 text-center font-bold uppercase tracking-widest">Hold Space for Boost</p>
          </div>
        </div>
      </Card>
    </div>
  );
}