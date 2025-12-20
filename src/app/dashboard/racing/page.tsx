'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GaragePage } from '@/components/racing/garage';
import { RacingGame } from '@/components/racing/racing-game';
import { MultiplayerLobby } from '@/components/racing/multiplayer-lobby';
import { RaceHistory } from '@/components/racing/race-history';
import { useGarage } from '@/hooks/use-garage';
import type { MultiplayerRoom } from '@/lib/racing-types';
import {
  Car,
  Warehouse,
  Flag,
  Users,
  Trophy,
  Bot,
  Gamepad2,
  ArrowLeft
} from 'lucide-react';

export default function RacingPage() {
  const { garage, carStats } = useGarage();
  const [activeTab, setActiveTab] = useState('garage');
  const [raceMode, setRaceMode] = useState<'select' | 'bot' | 'multiplayer' | 'racing'>('select');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [multiplayerRoom, setMultiplayerRoom] = useState<MultiplayerRoom | null>(null);

  const handleStartBotRace = () => {
    setRaceMode('racing');
  };

  const handleJoinMultiplayerRace = (room: MultiplayerRoom) => {
    setMultiplayerRoom(room);
    setRaceMode('racing');
  };

  const handleRaceComplete = (won: boolean, time: number) => {
    // Race completion is handled in the RacingGame component
    // This callback can be used for additional logic
  };

  const renderRaceContent = () => {
    if (raceMode === 'select') {
      return (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bot Race Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card className="h-full cursor-pointer hover:border-primary transition-colors" onClick={() => setRaceMode('bot')}>
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-orange-500" />
                </div>
                <CardTitle className="text-2xl">Race vs Bots</CardTitle>
                <CardDescription>
                  Challenge AI opponents of varying difficulty levels. Perfect for practice and earning coins!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Easy</Badge>
                    <span>2 bots, slower speeds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Medium</Badge>
                    <span>3 bots, balanced challenge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Hard</Badge>
                    <span>4 bots, maximum competition</span>
                  </div>
                </div>
                <Button className="w-full mt-4">
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Select Difficulty
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Multiplayer Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card className="h-full cursor-pointer hover:border-primary transition-colors" onClick={() => setRaceMode('multiplayer')}>
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">Multiplayer Race</CardTitle>
                <CardDescription>
                  Challenge real players! Create a room or join an existing one for competitive racing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Create Room</Badge>
                    <span>Host your own race</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Join Room</Badge>
                    <span>Race with friends</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Up to 4 Players</Badge>
                    <span>Real-time competition</span>
                  </div>
                </div>
                <Button className="w-full mt-4">
                  <Users className="w-4 h-4 mr-2" />
                  Find Race
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    if (raceMode === 'bot') {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setRaceMode('select')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Race Selection
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Race vs Bots
              </CardTitle>
              <CardDescription>Select difficulty and start racing!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Difficulty:</span>
                <Select value={botDifficulty} onValueChange={(v) => setBotDifficulty(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Easy</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="hard">🔴 Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleStartBotRace}>
                  <Flag className="w-4 h-4 mr-2" />
                  Start Race
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 text-sm">
                <strong>Your Car Stats:</strong>
                {carStats && (
                  <div className="grid grid-cols-4 gap-4 mt-2">
                    <div>Speed: {carStats.speed.toFixed(1)}</div>
                    <div>Accel: {carStats.acceleration.toFixed(1)}</div>
                    <div>Handling: {carStats.handling.toFixed(1)}</div>
                    <div>Nitro: {carStats.nitroBoost.toFixed(1)}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (raceMode === 'multiplayer') {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setRaceMode('select')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Race Selection
          </Button>
          
          <MultiplayerLobby onJoinRace={handleJoinMultiplayerRace} />
        </div>
      );
    }

    if (raceMode === 'racing') {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => {
            setRaceMode('select');
            setMultiplayerRoom(null);
          }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Race Selection
          </Button>
          
          <RacingGame 
            key={`race-${multiplayerRoom ? 'multiplayer' : 'bot'}-${botDifficulty}-${Date.now()}`}
            raceType={multiplayerRoom ? 'multiplayer' : 'bot'}
            botDifficulty={botDifficulty}
            onRaceComplete={handleRaceComplete}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Car className="w-8 h-8" />
            Racing Arena
          </h1>
          <p className="text-muted-foreground">
            Upgrade your car, race against bots or players, and become the ultimate champion!
          </p>
        </div>
        {garage && (
          <Card className="px-4 py-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>{garage.wins} wins</span>
              </div>
              <div className="text-muted-foreground">
                {garage.totalRaces} races
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="garage" className="flex items-center gap-2">
            <Warehouse className="w-4 h-4" />
            Garage
          </TabsTrigger>
          <TabsTrigger value="race" className="flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Race
          </TabsTrigger>
          <TabsTrigger value="multiplayer" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Multiplayer
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="garage">
          <GaragePage />
        </TabsContent>

        <TabsContent value="race">
          {renderRaceContent()}
        </TabsContent>

        <TabsContent value="multiplayer">
          <MultiplayerLobby onJoinRace={(room) => {
            setMultiplayerRoom(room);
            setActiveTab('race');
            setRaceMode('racing');
          }} />
        </TabsContent>

        <TabsContent value="history">
          <RaceHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
