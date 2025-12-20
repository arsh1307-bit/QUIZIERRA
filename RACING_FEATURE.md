# 🏎️ Racing Game Feature - Complete Documentation

## Overview
A fully integrated car racing game system that rewards students with upgrade coins for completing quizzes. Build your racing car, upgrade parts, and compete against bots or other players!

---

## 🎯 Key Features

### 1. **Quiz Rewards System**
After completing each quiz, students automatically earn racing coins:
- **40-50%**: 5-7 coins
- **50-60%**: 10 coins  
- **60-70%**: 15 coins
- **70-80%**: 20 coins
- **80-90%**: 25 coins
- **90-100%**: 25 coins
- **Adaptive Quiz Bonus**: 1.5x multiplier

Coins are randomly assigned to one of 6 car parts: Engine, Wheels, Nitro, Body, Exhaust, or Suspension.

### 2. **Student Dashboard Integration**
The main student dashboard now shows:
- **My Racing Garage widget** with:
  - Animated 2D car preview
  - Total coins across all parts
  - Current car color and name
  - Top upgraded part
  - Quick access to full garage

### 3. **Full Garage System** (`/dashboard/racing`)
Navigate to **Dashboard → Racing** to access:

#### **Garage Tab**
- Visual car builder with 6 upgradeable parts
- Each part has 10 upgrade levels
- Coins required per upgrade increase with level
- Real-time stats display (Speed, Acceleration, Handling, Nitro)
- Parts grid showing current coins and upgrade status

#### **Customize Tab**
- 20 color options for your car
- Custom car name input
- Live preview of changes

### 4. **Racing Game**
#### **Race vs Bots**
- Choose difficulty: Easy (2 bots), Medium (3 bots), Hard (4 bots)
- Animated race track with multiple lanes
- Controls:
  - ⬆️ **Arrow Up / W**: Accelerate
  - ⬇️ **Arrow Down / S**: Brake
  - **Space**: Nitro Boost
- Real-time speed and nitro gauges
- Countdown, racing, and victory animations

#### **Multiplayer**
- Create or join race rooms (up to 4 players)
- Real-time synchronization via Firebase
- Share room codes with friends
- See other players' car stats before racing

### 5. **Race History**
- Track all your races
- Filter by: All Races, Wins, vs Bots, Multiplayer
- Statistics dashboard:
  - Total races
  - Win rate
  - Best time
  - Total coins earned from racing

---

## 🔧 Technical Implementation

### File Structure
```
src/
├── lib/
│   └── racing-types.ts          # Types for cars, races, multiplayer
├── hooks/
│   └── use-garage.ts            # Custom hook for garage management
├── components/
│   ├── racing/
│   │   ├── garage.tsx           # Garage UI with parts & upgrades
│   │   ├── racing-game.tsx      # Racing game engine
│   │   ├── multiplayer-lobby.tsx # Multiplayer rooms
│   │   └── race-history.tsx     # Race results & stats
│   └── dashboards/
│       └── student-dashboard.tsx # Updated with garage widget
├── app/
│   ├── dashboard/
│   │   └── racing/
│   │       └── page.tsx         # Main racing page
│   └── exam/[examId]/results/
│       └── page.tsx             # Updated with coin rewards
```

### Firebase Collections
```
garages/              # User car data
  └── {userId}/
      ├── parts: { engine: 25, wheels: 15, ... }  # Coins per part
      ├── levels: { engine: 3, wheels: 2, ... }   # Upgrade levels
      ├── carColor: "#3B82F6"
      ├── carName: "Lightning"
      ├── totalRaces: 10
      ├── wins: 7

multiplayerRooms/     # Active race rooms
  └── {roomId}/
      ├── hostId
      ├── currentPlayers: []
      ├── playerStats: {}
      ├── status: "waiting" | "racing"

raceResults/          # Historical race data
  └── {resultId}/
      ├── userId
      ├── raceType: "bot" | "multiplayer"
      ├── rank: 1
      ├── finishTime: 15234
      ├── coinsEarned: 10

attempts/             # Updated with racing rewards
  └── {attemptId}/
      ├── ...existing fields...
      └── racingReward: { partType: "engine", coins: 15 }
```

---

## 🎮 How It Works

### Flow Diagram
```
Quiz Complete → Calculate Score → Award Coins
       ↓
Update Garage (Firebase)
       ↓
Display Reward on Results Page
       ↓
Student sees coins in Dashboard Widget
       ↓
Navigate to Racing → Use Coins to Upgrade
       ↓
Better Stats → Win More Races → Earn More Coins
```

### Car Stats Calculation
Each part contributes to overall stats with multipliers per level:
```typescript
Speed = Σ(part.baseSpeed × part.upgradeMultiplier^level)
Acceleration = Σ(part.baseAccel × part.upgradeMultiplier^level)
Handling = Σ(part.baseHandling × part.upgradeMultiplier^level)
NitroBoost = Σ(part.baseNitro × part.upgradeMultiplier^level)
```

---

## 🚀 Getting Started

### For Students
1. Complete a quiz (score 40%+ to earn coins)
2. Check your **Dashboard** to see new coins
3. Click **"Open Garage"** or navigate to **Racing** tab
4. Use coins to upgrade your car parts
5. Race against bots or challenge friends!

### For Instructors
- The system automatically awards coins based on quiz performance
- No configuration needed - works out of the box
- Students are incentivized to perform better for more coins

---

## 🎨 Customization Options

### Car Colors (20 available)
Red, Orange, Yellow, Green, Teal, Cyan, Blue, Indigo, Purple, Pink, and more!

### Car Parts & Icons
- 🔧 **Engine**: Speed & Acceleration
- 🛞 **Wheels**: Handling & Grip
- 🔥 **Nitro**: Boost Power
- 🚗 **Body Kit**: Aerodynamics
- 💨 **Exhaust**: Power Output
- 🔩 **Suspension**: Stability

---

## 📊 Game Balance

### Upgrade Costs
Parts require increasing coins per level:
- Level 1→2: 10-15 coins
- Level 5→6: 75-110 coins
- Level 9→10: 400-600 coins

### Bot Difficulty
- **Easy**: 70% of player power
- **Medium**: 100% of player power
- **Hard**: 130% of player power

### Multiplayer Balance
All players race with their actual upgraded stats - skill and upgrades matter!

---

## 🐛 Troubleshooting

**Issue**: Not seeing Racing tab
- **Solution**: Ensure you're logged in and have a student/instructor role

**Issue**: Coins not appearing after quiz
- **Solution**: Score must be 40% or higher. Check the results page for coin display.

**Issue**: Can't upgrade parts
- **Solution**: Need enough coins for that specific part type. Each part has its own coin pool.

---

## 🔮 Future Enhancements
- Leaderboards
- Tournament modes
- Special event races
- Rare car skins
- Achievement system
- Daily challenges

---

## 📝 Notes
- Default car setup: Engine Lv1, Wheels Lv1, all others Lv0
- Total max level across all parts: 60 levels
- Coins are part-specific (can't transfer between parts)
- Garage persists across sessions
- Race history stores last 50 races

---

Built with ❤️ using Next.js, Firebase, Framer Motion, and Recharts
