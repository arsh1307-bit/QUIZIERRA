'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { useGarage } from '@/hooks/use-garage';
import type { MultiplayerRoom, CarStats } from '@/lib/racing-types';
import {
  Users,
  Plus,
  LogIn,
  LogOut,
  Crown,
  Play,
  Loader2,
  Copy,
  RefreshCw,
  Trash2,
  Car
} from 'lucide-react';

interface MultiplayerLobbyProps {
  onJoinRace: (room: MultiplayerRoom) => void;
}

export function MultiplayerLobby({ onJoinRace }: MultiplayerLobbyProps) {
  const { user, firestore } = useFirebase();
  const { garage, carStats } = useGarage();
  const { toast } = useToast();
  
  const [rooms, setRooms] = useState<MultiplayerRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoom | null>(null);
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  // Listen to available rooms
  useEffect(() => {
    if (!firestore) return;

    const roomsRef = collection(firestore, 'multiplayerRooms');
    // Simple query without composite index requirement
    // We'll filter client-side for 'waiting' status
    const q = query(
      roomsRef,
      where('status', '==', 'waiting')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList: MultiplayerRoom[] = [];
      snapshot.forEach((doc) => {
        roomList.push({ id: doc.id, ...doc.data() } as MultiplayerRoom);
      });
      // Sort client-side by createdAt descending
      roomList.sort((a, b) => {
        const aTime = a.createdAt && typeof a.createdAt === 'object' && 'toMillis' in a.createdAt 
          ? (a.createdAt as { toMillis: () => number }).toMillis() 
          : 0;
        const bTime = b.createdAt && typeof b.createdAt === 'object' && 'toMillis' in b.createdAt 
          ? (b.createdAt as { toMillis: () => number }).toMillis() 
          : 0;
        return bTime - aTime;
      });
      setRooms(roomList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching rooms:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  // Listen to current room changes
  useEffect(() => {
    if (!firestore || !currentRoom) return;

    const roomRef = doc(firestore, 'multiplayerRooms', currentRoom.id);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomData = { id: snapshot.id, ...snapshot.data() } as MultiplayerRoom;
        setCurrentRoom(roomData);
        
        if (roomData.status === 'starting') {
          onJoinRace(roomData);
        }
      } else {
        // Room was deleted
        setCurrentRoom(null);
        toast({
          variant: 'destructive',
          title: 'Room Closed',
          description: 'The room has been closed by the host.',
        });
      }
    });

    return () => unsubscribe();
  }, [firestore, currentRoom?.id, onJoinRace, toast]);

  const createRoom = async () => {
    if (!user || !firestore || !garage || !carStats) return;
    
    setCreating(true);
    try {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const displayName = user.displayName || user.email?.split('@')[0] || 'Player';
      
      const newRoom: Omit<MultiplayerRoom, 'id'> = {
        name: roomName || `${displayName}'s Race`,
        hostId: user.uid,
        hostName: displayName,
        maxPlayers: 4,
        currentPlayers: [user.uid],
        playerNames: { [user.uid]: displayName },
        playerStats: { [user.uid]: carStats },
        playerColors: { [user.uid]: garage.carColor },
        status: 'waiting',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(firestore, 'multiplayerRooms', roomId), newRoom);
      setCurrentRoom({ id: roomId, ...newRoom });
      setRoomName('');
      
      toast({
        title: 'Room Created!',
        description: 'Share the room code with friends to join.',
      });
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create room.',
      });
    }
    setCreating(false);
  };

  const joinRoom = async (room: MultiplayerRoom) => {
    if (!user || !firestore || !garage || !carStats) return;
    
    if (room.currentPlayers.length >= room.maxPlayers) {
      toast({
        variant: 'destructive',
        title: 'Room Full',
        description: 'This room is already full.',
      });
      return;
    }

    setJoining(room.id);
    try {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Player';
      const roomRef = doc(firestore, 'multiplayerRooms', room.id);
      
      await updateDoc(roomRef, {
        currentPlayers: arrayUnion(user.uid),
        [`playerNames.${user.uid}`]: displayName,
        [`playerStats.${user.uid}`]: carStats,
        [`playerColors.${user.uid}`]: garage.carColor,
      });

      const updatedRoom = await getDoc(roomRef);
      if (updatedRoom.exists()) {
        setCurrentRoom({ id: updatedRoom.id, ...updatedRoom.data() } as MultiplayerRoom);
      }
      
      toast({
        title: 'Joined!',
        description: `You joined ${room.name}`,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to join room.',
      });
    }
    setJoining(null);
  };

  const leaveRoom = async () => {
    if (!user || !firestore || !currentRoom) return;

    try {
      const roomRef = doc(firestore, 'multiplayerRooms', currentRoom.id);
      
      if (currentRoom.hostId === user.uid) {
        // Host leaving - delete room
        await deleteDoc(roomRef);
      } else {
        // Player leaving
        await updateDoc(roomRef, {
          currentPlayers: arrayRemove(user.uid),
          [`playerNames.${user.uid}`]: null,
          [`playerStats.${user.uid}`]: null,
          [`playerColors.${user.uid}`]: null,
        });
      }
      
      setCurrentRoom(null);
      toast({
        title: 'Left Room',
        description: 'You have left the room.',
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  const startRace = async () => {
    if (!user || !firestore || !currentRoom) return;
    if (currentRoom.hostId !== user.uid) return;

    try {
      const roomRef = doc(firestore, 'multiplayerRooms', currentRoom.id);
      await updateDoc(roomRef, { status: 'starting' });
    } catch (error) {
      console.error('Error starting race:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to start race.',
      });
    }
  };

  const copyRoomCode = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom.id);
      toast({
        title: 'Copied!',
        description: 'Room code copied to clipboard.',
      });
    }
  };

  if (!user || !garage) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Please log in to access multiplayer.</p>
        </CardContent>
      </Card>
    );
  }

  // In a room
  if (currentRoom) {
    const isHost = currentRoom.hostId === user.uid;
    
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {currentRoom.name}
              </CardTitle>
              <CardDescription>
                {currentRoom.currentPlayers.length}/{currentRoom.maxPlayers} players
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={copyRoomCode}>
              <Copy className="w-4 h-4 mr-1" />
              Copy Code
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Players list */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Players</h4>
            {currentRoom.currentPlayers.map((playerId) => (
              <motion.div
                key={playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: currentRoom.playerColors[playerId] || '#3B82F6' }}
                  >
                    <Car className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="font-medium">
                      {currentRoom.playerNames[playerId] || 'Unknown'}
                    </span>
                    {playerId === currentRoom.hostId && (
                      <Crown className="w-4 h-4 inline ml-2 text-yellow-500" />
                    )}
                  </div>
                </div>
                {currentRoom.playerStats[playerId] && (
                  <Badge variant="outline">
                    Power: {currentRoom.playerStats[playerId].totalPower.toFixed(0)}
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            {isHost ? (
              <>
                <Button 
                  className="flex-1" 
                  onClick={startRace}
                  disabled={currentRoom.currentPlayers.length < 2}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Race
                </Button>
                <Button variant="destructive" onClick={leaveRoom}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button variant="secondary" className="flex-1" onClick={leaveRoom}>
                <LogOut className="w-4 h-4 mr-2" />
                Leave Room
              </Button>
            )}
          </div>

          {isHost && currentRoom.currentPlayers.length < 2 && (
            <p className="text-sm text-center text-muted-foreground">
              Waiting for more players to join...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Lobby view
  return (
    <div className="space-y-4">
      {/* Create room */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Room
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Room name (optional)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <Button onClick={createRoom} disabled={creating}>
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Create
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available rooms */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Available Rooms
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setLoading(true)}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No rooms available</p>
              <p className="text-sm">Create one to start racing!</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                <AnimatePresence>
                  {rooms.map((room) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <div className="font-medium">{room.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Host: {room.hostName} • {room.currentPlayers.length}/{room.maxPlayers} players
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => joinRoom(room)}
                        disabled={joining === room.id || room.currentPlayers.length >= room.maxPlayers}
                      >
                        {joining === room.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : room.currentPlayers.length >= room.maxPlayers ? (
                          'Full'
                        ) : (
                          <>
                            <LogIn className="w-4 h-4 mr-1" />
                            Join
                          </>
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
