'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useGarage } from '@/hooks/use-garage';
import { CAR_PARTS_CONFIG, type CarPartType, type CarStats } from '@/lib/racing-types';
import { 
  Wrench, 
  Zap, 
  Gauge, 
  Trophy, 
  Coins, 
  ArrowUp,
  Car,
  Palette,
  Settings,
  TrendingUp
} from 'lucide-react';

const PART_ICONS: Record<CarPartType, React.ReactNode> = {
  engine: <Wrench className="w-6 h-6" />,
  wheels: <Settings className="w-6 h-6" />,
  nitro: <Zap className="w-6 h-6" />,
  body: <Car className="w-6 h-6" />,
  exhaust: <TrendingUp className="w-6 h-6" />,
  suspension: <Gauge className="w-6 h-6" />,
};

const CAR_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#1F2937', '#6B7280', '#F8FAFC',
];

function StatBar({ label, value, maxValue = 100, color }: { label: string; value: number; maxValue?: number; color: string }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function PartCard({ 
  partType, 
  coins, 
  level, 
  onUpgrade 
}: { 
  partType: CarPartType; 
  coins: number; 
  level: number;
  onUpgrade: () => void;
}) {
  const config = CAR_PARTS_CONFIG[partType];
  const isMaxLevel = level >= config.maxLevel;
  const nextUpgradeCost = isMaxLevel ? 0 : config.coinsPerUpgrade[level];
  const canUpgrade = !isMaxLevel && coins >= nextUpgradeCost;
  const progressToNextLevel = isMaxLevel ? 100 : Math.min((coins / nextUpgradeCost) * 100, 100);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className={`relative overflow-hidden ${canUpgrade ? 'ring-2 ring-green-500/50' : ''}`}>
        <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {config.icon}
          </div>
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {PART_ICONS[partType]}
              </div>
              <div>
                <CardTitle className="text-lg">{config.name}</CardTitle>
                <CardDescription className="text-xs">{config.description}</CardDescription>
              </div>
            </div>
            <Badge variant={isMaxLevel ? 'default' : 'secondary'} className="text-sm">
              Lv. {level}/{config.maxLevel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-yellow-600">
              <Coins className="w-4 h-4" />
              {coins} coins
            </span>
            {!isMaxLevel && (
              <span className="text-muted-foreground">
                Need: {nextUpgradeCost}
              </span>
            )}
          </div>
          
          {!isMaxLevel && (
            <Progress value={progressToNextLevel} className="h-2" />
          )}
          
          <Button 
            className="w-full" 
            disabled={!canUpgrade}
            onClick={onUpgrade}
            variant={canUpgrade ? 'default' : 'secondary'}
          >
            {isMaxLevel ? (
              <>MAX LEVEL 🏆</>
            ) : canUpgrade ? (
              <>
                <ArrowUp className="w-4 h-4 mr-1" />
                Upgrade ({nextUpgradeCost} coins)
              </>
            ) : (
              <>Need {nextUpgradeCost - coins} more coins</>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CarPreview({ color, stats, name }: { color: string; stats: CarStats | null; name: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          {name}
        </CardTitle>
        <CardDescription>Your racing machine</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Car Visual */}
        <div className="relative h-48 bg-gradient-to-b from-muted/50 to-muted rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ 
                x: [0, 5, 0, -5, 0],
                rotate: [0, 1, 0, -1, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="relative"
            >
              {/* Car SVG */}
              <svg viewBox="0 0 200 80" className="w-64 h-auto drop-shadow-lg">
                {/* Car body */}
                <path
                  d="M20 50 L35 50 L45 30 L90 25 L130 25 L155 35 L180 50 L180 55 L20 55 Z"
                  fill={color}
                  stroke={color}
                  strokeWidth="2"
                />
                {/* Windows */}
                <path
                  d="M50 32 L88 28 L88 45 L50 45 Z"
                  fill="#1e293b"
                  opacity="0.8"
                />
                <path
                  d="M92 28 L125 28 L145 40 L92 45 Z"
                  fill="#1e293b"
                  opacity="0.8"
                />
                {/* Wheels */}
                <circle cx="50" cy="55" r="12" fill="#1f2937" stroke="#374151" strokeWidth="3" />
                <circle cx="50" cy="55" r="6" fill="#6b7280" />
                <circle cx="150" cy="55" r="12" fill="#1f2937" stroke="#374151" strokeWidth="3" />
                <circle cx="150" cy="55" r="6" fill="#6b7280" />
                {/* Headlights */}
                <ellipse cx="175" cy="48" rx="4" ry="3" fill="#fef08a" />
                {/* Racing stripes */}
                <path
                  d="M45 35 L90 30 L90 33 L45 38 Z"
                  fill="white"
                  opacity="0.3"
                />
              </svg>
            </motion.div>
          </div>
          {/* Ground line */}
          <div className="absolute bottom-4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Car Stats</span>
              <Badge variant="outline">
                Power: {stats.totalPower.toFixed(0)}
              </Badge>
            </div>
            <StatBar label="Speed" value={stats.speed} maxValue={150} color="#EF4444" />
            <StatBar label="Acceleration" value={stats.acceleration} maxValue={100} color="#F59E0B" />
            <StatBar label="Handling" value={stats.handling} maxValue={100} color="#22C55E" />
            <StatBar label="Nitro Boost" value={stats.nitroBoost} maxValue={80} color="#3B82F6" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GaragePage() {
  const { garage, carStats, loading, upgradePart, updateCarCustomization } = useGarage();
  const { toast } = useToast();
  const [carName, setCarName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const handleUpgrade = async (partType: CarPartType) => {
    const result = await upgradePart(partType);
    toast({
      variant: result.success ? 'default' : 'destructive',
      title: result.success ? '🎉 Upgrade Complete!' : 'Upgrade Failed',
      description: result.message,
    });
  };

  const handleSaveCustomization = async () => {
    const name = carName || garage?.carName || 'My Racer';
    const color = selectedColor || garage?.carColor || '#3B82F6';
    const success = await updateCarCustomization(color, name);
    toast({
      variant: success ? 'default' : 'destructive',
      title: success ? 'Saved!' : 'Error',
      description: success ? 'Car customization updated' : 'Failed to save',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Settings className="w-8 h-8 text-muted-foreground" />
        </motion.div>
      </div>
    );
  }

  if (!garage) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Please log in to access your garage.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Car className="w-8 h-8" />
            My Garage
          </h1>
          <p className="text-muted-foreground">Upgrade your car and dominate the track!</p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div className="text-sm">
                <span className="font-bold">{garage.wins}</span>
                <span className="text-muted-foreground"> wins / </span>
                <span className="font-bold">{garage.totalRaces}</span>
                <span className="text-muted-foreground"> races</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="parts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="parts" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Parts & Upgrades
          </TabsTrigger>
          <TabsTrigger value="customize" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Customize
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parts" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Parts Grid */}
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
              {(Object.keys(CAR_PARTS_CONFIG) as CarPartType[]).map((partType) => (
                <PartCard
                  key={partType}
                  partType={partType}
                  coins={garage.parts[partType]}
                  level={garage.levels[partType]}
                  onUpgrade={() => handleUpgrade(partType)}
                />
              ))}
            </div>

            {/* Car Preview */}
            <div className="lg:col-span-1">
              <CarPreview 
                color={selectedColor || garage.carColor} 
                stats={carStats} 
                name={carName || garage.carName}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="customize" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customize Your Car</CardTitle>
                <CardDescription>Make it yours!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="carName">Car Name</Label>
                  <Input
                    id="carName"
                    placeholder={garage.carName}
                    value={carName}
                    onChange={(e) => setCarName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Car Color</Label>
                  <div className="grid grid-cols-10 gap-2">
                    {CAR_COLORS.map((color) => (
                      <motion.button
                        key={color}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          (selectedColor || garage.carColor) === color
                            ? 'border-foreground ring-2 ring-offset-2 ring-foreground'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <Button onClick={handleSaveCustomization} className="w-full">
                  Save Customization
                </Button>
              </CardContent>
            </Card>

            <CarPreview 
              color={selectedColor || garage.carColor} 
              stats={carStats} 
              name={carName || garage.carName}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
