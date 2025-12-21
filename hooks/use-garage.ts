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
        const data = snapshot.data();
        // Migrate old garages that don't have universalCoins
        if (typeof data.universalCoins !== 'number') {
          const oldCoins = (data.parts?.engine || 0) + (data.parts?.body || 0) + (data.parts?.suspension || 0);
          const migratedGarage = {
            ...data,
            universalCoins: oldCoins,
            totalCoinsEarned: oldCoins,
            totalCoinsSpent: 0,
          };
          await updateDoc(garageRef, migratedGarage);
          setGarage({ id: snapshot.id, ...migratedGarage } as UserGarage);
        } else {
          setGarage({ id: snapshot.id, ...data } as UserGarage);
        }
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

  // Add universal coins (from quiz rewards)
  const addCoins = useCallback(async (amount: number) => {
    if (!user || !firestore || !garage) return false;
    
    try {
      const garageRef = doc(firestore, 'garages', user.uid);
      await updateDoc(garageRef, { 
        universalCoins: (garage.universalCoins || 0) + amount,
        totalCoinsEarned: (garage.totalCoinsEarned || 0) + amount,
        updatedAt: new Date().toISOString() 
      });
      return true;
    } catch (err) {
      console.error('Failed to add coins:', err);
      return false;
    }
  }, [user, firestore, garage]);

  // Legacy function - now adds to universal coins instead of specific part
  const addParts = useCallback(async (partType: CarPartType, coins: number) => {
    // Redirect to universal coins pool
    return addCoins(coins);
  }, [addCoins]);

  // Upgrade any part using universal coins
  const upgradePart = useCallback(async (partType: CarPartType): Promise<{ success: boolean; message: string }> => {
    if (!user || !firestore || !garage) {
      return { success: false, message: 'Not logged in' };
    }

    const { CAR_PARTS_CONFIG } = await import('@/lib/racing-types');
    const config = CAR_PARTS_CONFIG[partType];
    const currentLevel = garage.levels[partType];
    const universalCoins = garage.universalCoins || 0;
    
    if (currentLevel >= config.maxLevel) {
      return { success: false, message: 'Already at max level!' };
    }
    
    const upgradeCost = config.coinsPerUpgrade[currentLevel];
    
    if (universalCoins < upgradeCost) {
      return { success: false, message: `Need ${upgradeCost} 🪙 (have ${universalCoins} 🪙)` };
    }
    
    try {
      const garageRef = doc(firestore, 'garages', user.uid);
      const newLevels = { ...garage.levels, [partType]: currentLevel + 1 };
      
      await updateDoc(garageRef, { 
        universalCoins: universalCoins - upgradeCost,
        totalCoinsSpent: (garage.totalCoinsSpent || 0) + upgradeCost,
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
    addCoins,
    addParts, // Legacy - redirects to addCoins
    upgradePart,
    updateCarCustomization,
    updateRaceStats,
  };
}
