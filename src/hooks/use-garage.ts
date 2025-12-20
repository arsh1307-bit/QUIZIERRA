'use client';

import { useEffect, useState, useCallback } from 'react';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { UserGarage, UserCarParts, UserCarLevels, CarPartType, CAR_PARTS_CONFIG } from '@/lib/racing-types';
import { createDefaultGarage, calculateCarStats } from '@/lib/racing-types';

export function useGarage() {
  const { user, firestore } = useFirebase();
  const [garage, setGarage] = useState<UserGarage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      setLoading(false);
      return;
    }

    const garageRef = doc(firestore, 'garages', user.uid);
    
    const unsubscribe = onSnapshot(garageRef, async (snapshot) => {
      if (snapshot.exists()) {
        setGarage({ id: snapshot.id, ...snapshot.data() } as UserGarage);
      } else {
        // Create default garage for new user
        const defaultGarage = createDefaultGarage(user.uid);
        try {
          await setDoc(garageRef, defaultGarage);
          setGarage({ id: user.uid, ...defaultGarage });
        } catch (err) {
          setError('Failed to create garage');
          console.error(err);
        }
      }
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const addParts = useCallback(async (partType: CarPartType, coins: number) => {
    if (!user || !firestore || !garage) return false;
    
    try {
      const garageRef = doc(firestore, 'garages', user.uid);
      const newParts = { ...garage.parts, [partType]: garage.parts[partType] + coins };
      await updateDoc(garageRef, { 
        parts: newParts,
        updatedAt: new Date().toISOString() 
      });
      return true;
    } catch (err) {
      console.error('Failed to add parts:', err);
      return false;
    }
  }, [user, firestore, garage]);

  const upgradePart = useCallback(async (partType: CarPartType): Promise<{ success: boolean; message: string }> => {
    if (!user || !firestore || !garage) {
      return { success: false, message: 'Not logged in' };
    }

    const { CAR_PARTS_CONFIG } = await import('@/lib/racing-types');
    const config = CAR_PARTS_CONFIG[partType];
    const currentLevel = garage.levels[partType];
    const currentCoins = garage.parts[partType];
    
    if (currentLevel >= config.maxLevel) {
      return { success: false, message: 'Already at max level!' };
    }
    
    const upgradeCost = config.coinsPerUpgrade[currentLevel];
    
    if (currentCoins < upgradeCost) {
      return { success: false, message: `Need ${upgradeCost} coins (have ${currentCoins})` };
    }
    
    try {
      const garageRef = doc(firestore, 'garages', user.uid);
      const newParts = { ...garage.parts, [partType]: currentCoins - upgradeCost };
      const newLevels = { ...garage.levels, [partType]: currentLevel + 1 };
      
      await updateDoc(garageRef, { 
        parts: newParts,
        levels: newLevels,
        updatedAt: new Date().toISOString() 
      });
      
      return { success: true, message: `${config.name} upgraded to level ${currentLevel + 1}!` };
    } catch (err) {
      console.error('Failed to upgrade part:', err);
      return { success: false, message: 'Upgrade failed' };
    }
  }, [user, firestore, garage]);

  const updateCarCustomization = useCallback(async (carColor: string, carName: string) => {
    if (!user || !firestore) return false;
    
    try {
      const garageRef = doc(firestore, 'garages', user.uid);
      await updateDoc(garageRef, { 
        carColor, 
        carName,
        updatedAt: new Date().toISOString() 
      });
      return true;
    } catch (err) {
      console.error('Failed to update customization:', err);
      return false;
    }
  }, [user, firestore]);

  const updateRaceStats = useCallback(async (won: boolean) => {
    if (!user || !firestore || !garage) return false;
    
    try {
      const garageRef = doc(firestore, 'garages', user.uid);
      await updateDoc(garageRef, { 
        totalRaces: garage.totalRaces + 1,
        wins: won ? garage.wins + 1 : garage.wins,
        losses: won ? garage.losses : garage.losses + 1,
        updatedAt: new Date().toISOString() 
      });
      return true;
    } catch (err) {
      console.error('Failed to update race stats:', err);
      return false;
    }
  }, [user, firestore, garage]);

  const carStats = garage ? calculateCarStats(garage.levels) : null;

  return {
    garage,
    carStats,
    loading,
    error,
    addParts,
    upgradePart,
    updateCarCustomization,
    updateRaceStats,
  };
}
