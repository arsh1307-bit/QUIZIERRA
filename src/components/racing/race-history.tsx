'use client';

import { useEffect, useState } from 'react';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebase } from '@/firebase/provider';
import type { RaceResult, RaceType } from '@/lib/racing-types';
import {
  Trophy,
  Medal,
  Clock,
  Coins,
  TrendingUp,
  Calendar,
  Bot,
  Users,
  Car,
  Target
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = 'primary'
}: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string; 
  value: string | number;
  subValue?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${color}/10`}>
            <Icon className={`w-5 h-5 text-${color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RaceResultCard({ result }: { result: RaceResult }) {
  const isWin = result.rank === 1;
  const isTop3 = result.rank <= 3;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${isWin ? 'border-yellow-500/50 bg-yellow-500/5' : 'bg-card'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            result.rank === 1 ? 'bg-yellow-500 text-yellow-950' :
            result.rank === 2 ? 'bg-gray-300 text-gray-800' :
            result.rank === 3 ? 'bg-amber-600 text-amber-950' :
            'bg-muted text-muted-foreground'
          }`}>
            {result.rank === 1 ? <Trophy className="w-5 h-5" /> : `#${result.rank}`}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {result.raceType === 'bot' ? 'vs Bots' : 'Multiplayer'}
              </span>
              {result.raceType === 'bot' ? (
                <Bot className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Users className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {(result.finishTime / 1000).toFixed(2)}s
              <span className="mx-1">•</span>
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
        <div className="text-right">
          <Badge variant={isWin ? 'default' : isTop3 ? 'secondary' : 'outline'}>
            {result.rank}/{result.totalParticipants}
          </Badge>
          {result.coinsEarned > 0 && (
            <div className="text-sm text-yellow-600 flex items-center justify-end gap-1 mt-1">
              <Coins className="w-3 h-3" />
              +{result.coinsEarned}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function RaceHistory() {
  const { user, firestore } = useFirebase();
  const [results, setResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRaces: 0,
    wins: 0,
    totalCoins: 0,
    bestTime: Infinity,
    avgPosition: 0,
  });

  useEffect(() => {
    if (!user || !firestore) {
      setLoading(false);
      return;
    }

    const resultsRef = collection(firestore, 'raceResults');
    const q = query(
      resultsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resultsList: RaceResult[] = [];
      snapshot.forEach((doc) => {
        resultsList.push({ id: doc.id, ...doc.data() } as RaceResult);
      });
      setResults(resultsList);

      // Calculate stats
      if (resultsList.length > 0) {
        const wins = resultsList.filter(r => r.rank === 1).length;
        const totalCoins = resultsList.reduce((sum, r) => sum + r.coinsEarned, 0);
        const bestTime = Math.min(...resultsList.map(r => r.finishTime));
        const avgPosition = resultsList.reduce((sum, r) => sum + r.rank, 0) / resultsList.length;
        
        setStats({
          totalRaces: resultsList.length,
          wins,
          totalCoins,
          bestTime,
          avgPosition,
        });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Please log in to view your race history.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Car className="w-8 h-8 mx-auto animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading race history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Target} 
          label="Total Races" 
          value={stats.totalRaces}
        />
        <StatCard 
          icon={Trophy} 
          label="Wins" 
          value={stats.wins}
          subValue={stats.totalRaces > 0 ? `${((stats.wins / stats.totalRaces) * 100).toFixed(1)}% win rate` : undefined}
        />
        <StatCard 
          icon={Clock} 
          label="Best Time" 
          value={stats.bestTime === Infinity ? '-' : `${(stats.bestTime / 1000).toFixed(2)}s`}
        />
        <StatCard 
          icon={Coins} 
          label="Total Coins" 
          value={stats.totalCoins}
          subValue="from racing"
        />
      </div>

      {/* Race history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Race History
          </CardTitle>
          <CardDescription>Your recent races and results</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No races yet</p>
              <p className="text-sm">Start racing to build your history!</p>
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Races</TabsTrigger>
                <TabsTrigger value="wins">Wins</TabsTrigger>
                <TabsTrigger value="bot">vs Bots</TabsTrigger>
                <TabsTrigger value="multiplayer">Multiplayer</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {results.map((result) => (
                      <RaceResultCard key={result.id} result={result} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="wins">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {results.filter(r => r.rank === 1).map((result) => (
                      <RaceResultCard key={result.id} result={result} />
                    ))}
                    {results.filter(r => r.rank === 1).length === 0 && (
                      <p className="text-center py-8 text-muted-foreground">No wins yet - keep racing!</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="bot">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {results.filter(r => r.raceType === 'bot').map((result) => (
                      <RaceResultCard key={result.id} result={result} />
                    ))}
                    {results.filter(r => r.raceType === 'bot').length === 0 && (
                      <p className="text-center py-8 text-muted-foreground">No bot races yet</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="multiplayer">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {results.filter(r => r.raceType === 'multiplayer').map((result) => (
                      <RaceResultCard key={result.id} result={result} />
                    ))}
                    {results.filter(r => r.raceType === 'multiplayer').length === 0 && (
                      <p className="text-center py-8 text-muted-foreground">No multiplayer races yet</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to save race results
export async function saveRaceResult(
  firestore: ReturnType<typeof getFirestore>,
  userId: string,
  userName: string,
  raceType: RaceType,
  rank: number,
  totalParticipants: number,
  finishTime: number,
  coinsEarned: number
): Promise<void> {
  const resultsRef = collection(firestore, 'raceResults');
  await addDoc(resultsRef, {
    odId: userId,
    odName: userName,
    raceType,
    rank,
    totalParticipants,
    finishTime,
    coinsEarned,
    createdAt: new Date().toISOString(),
  });
}
