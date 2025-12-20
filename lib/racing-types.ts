// Racing Game Types

export type CarPartType = 'engine' | 'wheels' | 'nitro' | 'body' | 'exhaust' | 'suspension';

export interface CarPartConfig {
  type: CarPartType;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  baseStats: {
    speed: number;
    acceleration: number;
    handling: number;
    nitroBoost: number;
  };
  upgradeMultiplier: number; // Stats increase per level
  coinsPerUpgrade: number[]; // Coins needed for each level upgrade
}

export const CAR_PARTS_CONFIG: Record<CarPartType, CarPartConfig> = {
  engine: {
    type: 'engine',
    name: 'Engine',
    description: 'Increases top speed and acceleration',
    icon: '🔧',
    maxLevel: 10,
    baseStats: { speed: 10, acceleration: 8, handling: 0, nitroBoost: 0 },
    upgradeMultiplier: 1.2,
    coinsPerUpgrade: [10, 20, 35, 50, 75, 100, 150, 200, 300, 500],
  },
  wheels: {
    type: 'wheels',
    name: 'Wheels',
    description: 'Better grip and handling',
    icon: '🛞',
    maxLevel: 10,
    baseStats: { speed: 2, acceleration: 3, handling: 12, nitroBoost: 0 },
    upgradeMultiplier: 1.15,
    coinsPerUpgrade: [8, 16, 28, 45, 65, 90, 130, 180, 260, 400],
  },
  nitro: {
    type: 'nitro',
    name: 'Nitro System',
    description: 'Powerful boost capability',
    icon: '🔥',
    maxLevel: 10,
    baseStats: { speed: 0, acceleration: 5, handling: 0, nitroBoost: 15 },
    upgradeMultiplier: 1.25,
    coinsPerUpgrade: [12, 24, 40, 60, 85, 120, 170, 240, 350, 550],
  },
  body: {
    type: 'body',
    name: 'Body Kit',
    description: 'Aerodynamics and style',
    icon: '🚗',
    maxLevel: 10,
    baseStats: { speed: 5, acceleration: 2, handling: 5, nitroBoost: 0 },
    upgradeMultiplier: 1.1,
    coinsPerUpgrade: [15, 30, 50, 75, 110, 150, 210, 300, 420, 600],
  },
  exhaust: {
    type: 'exhaust',
    name: 'Exhaust',
    description: 'More power output',
    icon: '💨',
    maxLevel: 10,
    baseStats: { speed: 6, acceleration: 6, handling: 0, nitroBoost: 2 },
    upgradeMultiplier: 1.15,
    coinsPerUpgrade: [10, 20, 35, 55, 80, 110, 160, 220, 320, 480],
  },
  suspension: {
    type: 'suspension',
    name: 'Suspension',
    description: 'Stability and control',
    icon: '🔩',
    maxLevel: 10,
    baseStats: { speed: 0, acceleration: 4, handling: 10, nitroBoost: 0 },
    upgradeMultiplier: 1.12,
    coinsPerUpgrade: [8, 16, 28, 45, 65, 90, 130, 180, 260, 400],
  },
};

export interface UserCarParts {
  engine: number; // Coins collected for this part
  wheels: number;
  nitro: number;
  body: number;
  exhaust: number;
  suspension: number;
}

export interface UserCarLevels {
  engine: number; // Current upgrade level (0-10)
  wheels: number;
  nitro: number;
  body: number;
  exhaust: number;
  suspension: number;
}

export interface CarStats {
  speed: number;
  acceleration: number;
  handling: number;
  nitroBoost: number;
  totalPower: number;
}

export interface UserGarage {
  id: string;
  odId: string;
  parts: UserCarParts;
  levels: UserCarLevels;
  carColor: string;
  carName: string;
  totalRaces: number;
  wins: number;
  losses: number;
  createdAt: string;
  updatedAt: string;
}

export type RaceType = 'solo' | 'bot' | 'multiplayer';
export type RaceStatus = 'waiting' | 'countdown' | 'racing' | 'finished';

export interface RaceParticipant {
  odId: string;
  odName: string;
  carStats: CarStats;
  carColor: string;
  position: number; // 0-100 (percentage of track completed)
  speed: number;
  nitroRemaining: number;
  isBot: boolean;
  finishTime?: number;
  rank?: number;
}

export interface Race {
  id: string;
  type: RaceType;
  status: RaceStatus;
  trackLength: number; // in meters
  participants: RaceParticipant[];
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  winner?: string;
}

export interface RaceResult {
  id: string;
  odId: string;
  odName: string;
  raceId: string;
  raceType: RaceType;
  rank: number;
  totalParticipants: number;
  finishTime: number; // in milliseconds
  coinsEarned: number;
  createdAt: string;
}

export interface MultiplayerRoom {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  maxPlayers: number;
  currentPlayers: string[];
  playerNames: Record<string, string>;
  playerStats: Record<string, CarStats>;
  playerColors: Record<string, string>;
  status: 'waiting' | 'starting' | 'racing' | 'finished';
  raceId?: string;
  createdAt: string;
}

// Quiz reward calculation
export function calculatePartReward(
  score: number,
  totalQuestions: number,
  isAdaptive: boolean = false
): { partType: CarPartType; coins: number } | null {
  const percentage = (score / (totalQuestions * 10)) * 100;
  
  // Minimum 40% to get any reward
  if (percentage < 40) return null;
  
  // Determine coins based on performance
  let coins = 0;
  if (percentage >= 90) coins = 25;
  else if (percentage >= 80) coins = 20;
  else if (percentage >= 70) coins = 15;
  else if (percentage >= 60) coins = 10;
  else if (percentage >= 50) coins = 7;
  else if (percentage >= 40) coins = 5;
  
  // Bonus for adaptive quizzes
  if (isAdaptive) {
    coins = Math.floor(coins * 1.5);
  }
  
  // Random part type (weighted towards common parts)
  const partTypes: CarPartType[] = ['engine', 'wheels', 'nitro', 'body', 'exhaust', 'suspension'];
  const weights = [20, 25, 15, 15, 15, 10]; // Higher weight = more common
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  let selectedPart: CarPartType = 'engine';
  for (let i = 0; i < partTypes.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      selectedPart = partTypes[i];
      break;
    }
  }
  
  return { partType: selectedPart, coins };
}

// Calculate car stats from levels
export function calculateCarStats(levels: UserCarLevels): CarStats {
  let speed = 0;
  let acceleration = 0;
  let handling = 0;
  let nitroBoost = 0;
  
  for (const [partType, level] of Object.entries(levels)) {
    const config = CAR_PARTS_CONFIG[partType as CarPartType];
    const multiplier = Math.pow(config.upgradeMultiplier, level);
    
    speed += config.baseStats.speed * multiplier;
    acceleration += config.baseStats.acceleration * multiplier;
    handling += config.baseStats.handling * multiplier;
    nitroBoost += config.baseStats.nitroBoost * multiplier;
  }
  
  const totalPower = speed + acceleration + handling + nitroBoost;
  
  return {
    speed: Math.round(speed * 10) / 10,
    acceleration: Math.round(acceleration * 10) / 10,
    handling: Math.round(handling * 10) / 10,
    nitroBoost: Math.round(nitroBoost * 10) / 10,
    totalPower: Math.round(totalPower * 10) / 10,
  };
}

// Generate bot stats based on difficulty - balanced for fair play
export function generateBotStats(difficulty: 'easy' | 'medium' | 'hard'): CarStats {
  // Easy = beatable, Medium = competitive, Hard = challenging but fair
  const baseMultiplier = difficulty === 'easy' ? 0.5 : difficulty === 'medium' ? 0.68 : 0.82;
  const randomVariance = () => 0.9 + Math.random() * 0.1; // 90% to 100%
  
  return {
    speed: Math.round(42 * baseMultiplier * randomVariance()),
    acceleration: Math.round(38 * baseMultiplier * randomVariance()),
    handling: Math.round(33 * baseMultiplier * randomVariance()),
    nitroBoost: Math.round(22 * baseMultiplier * randomVariance()),
    totalPower: 0, // Will be calculated
  };
}

// Default garage for new users
export function createDefaultGarage(odId: string): Omit<UserGarage, 'id'> {
  return {
    odId,
    parts: {
      engine: 0,
      wheels: 0,
      nitro: 0,
      body: 0,
      exhaust: 0,
      suspension: 0,
    },
    levels: {
      engine: 1,
      wheels: 1,
      nitro: 0,
      body: 0,
      exhaust: 0,
      suspension: 0,
    },
    carColor: '#3B82F6',
    carName: 'My Racer',
    totalRaces: 0,
    wins: 0,
    losses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
