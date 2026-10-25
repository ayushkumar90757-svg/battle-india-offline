# 🇮🇳 BATTLE INDIA OFFLINE

A complete, playable 3D offline Battle Royale shooting game inspired by the fast-paced gameplay of Free Fire, featuring original characters, maps, Indian tactical weapons, responsive controls, and high-performance offline AI bots.

---

## 🎮 Game Features

1. **100% Offline Gameplay**
   - Zero internet connection required after downloading/installing.
   - 20 intelligent AI Commando enemy bots with adjustable difficulty (*Recruit*, *Soldier*, *Veteran*).
   - Dynamic shrinking electric Safe Zone with countdown phases and out-of-zone damage ticks.
   - Victory Royale screen ("Champion of Bharat - #1") with detailed match statistics (Kills, Damage, Survival Time).
   - Quick Match Mode (20-bot Battle Royale) and Practice Mode (Target shooting range with moving dummies and distance markers).

2. **Player Controls & Movement**
   - Third-person perspective (over-the-shoulder follow camera with terrain collision prevention).
   - **Desktop Controls**:
     - `W`, `A`, `S`, `D`: Movement (**Left & Right movement are strictly non-inverted**).
     - Mouse Drag / Pointer Lock: Smooth 360° camera look with aim sensitivity slider.
     - `Left Click`: Fire (Automatic/Semi-auto).
     - `Right Click`: Aim Down Sights (ADS / Scope zoom).
     - `Space`: Jump.
     - `C`: Crouch / Stand.
     - `R`: Reload.
     - `1`, `2`, `3`: Quick weapon switch (Primary, Secondary, Pistol).
     - `4` or `F`: Use Tactical Medkit (+50 HP).
     - `E` or Walk over: Loot weapon/ammo/medkit pickups.
     - `Esc` or `P`: Pause menu.
   - **Mobile Touch Controls**:
     - Virtual Analog Joystick on bottom-left with dynamic repositioning.
     - Smooth swipe surface on right half of screen for camera rotation.
     - Large tactile action buttons: Fire 🔥, Aim/Scope 🎯, Jump ⬆️, Crouch ⬇️, Reload 🔄, Medkit 🩹, and Weapon Slot pills.

3. **Indus Arsenal (5 Original Weapons)**
   - **KAVACH-AR**: All-rounder standard military assault rifle (30-round mag, 28 dmg).
   - **GARUDA-SMG**: High rate-of-fire submachine gun (35-round mag, 18 dmg).
   - **TRISHUL-12**: Devastating pump-action shotgun with an 8-pellet buckshot spread.
   - **BRAHMOS-SR**: Heavy bolt-action sniper rifle with high-magnification telescopic scope (95 dmg body, 190 headshot one-hit elimination).
   - **AGNI-9**: Tactical sidearm pistol with rapid reload (12-round mag, 23 dmg).
   - Procedural 3D low-poly weapon models, animated muzzle flashes, bullet tracers, and impact dust/sparks.
   - 100% offline procedural Web Audio API sound synthesizer (gunfire crack, reload mechanical clicks, hitmarker dings, zone warning siren, and victory fanfare).

4. **Isle of Shanti (300m Island Map)**
   - Compact, high-FPS low-poly island surrounded by ocean.
   - Central military command outpost with a 2-story watchtower and sandbag bunkers.
   - Coastal village with enterable cottages and indoor loot.
   - Shipping warehouse depot with stacked cargo containers.
   - Hillside ancient stone ruins for high-ground vantage.
   - 75+ low-poly trees and 40+ cover rocks.
   - Real-time 2D radar minimap with island topography, player heading arrow, safe zone rings, and bot gunfire radar blips.

5. **Performance & Hardware Optimization**
   - Stable 60 FPS target on modern devices; smooth 30-60 FPS on low-end Android phones (2-4 GB RAM).
   - Graphics Quality presets (*Low*, *Medium*, *High*).
   - Automatic low-tier detection on mobile/budget devices.
   - Memory-efficient object pooling for bullet tracers and particles.
   - Staggered round-robin AI decision updates (5 bots/frame) to prevent CPU spikes.

---

## 🚀 How to Run the Game Locally

### Option 1: Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser (Chrome, Edge, Firefox, or Safari).

### Option 2: Production Build & Preview
```bash
npm run build
npm run preview
```
Open `http://localhost:3000`.

### Option 3: Play on Android Phone via Local Wi-Fi
1. Ensure your PC and phone are on the same Wi-Fi network.
2. Run:
   ```bash
   npm run preview
   ```
3. Look at the terminal output for the Network address (e.g., `http://192.168.x.x:3000`).
4. On your Android phone, open Chrome and type that URL.
5. In Chrome's menu (`⋮`), tap **"Install App"** or **"Add to Home Screen"**. The game will install as a standalone offline PWA with hardware acceleration and full screen landscape view!

---

## 📱 How to Export an Installable Android APK

The project is already initialized with **Capacitor Android** in the `android/` folder, configured with landscape orientation, hardware acceleration, and the package ID `com.battleindia.offline`.

### Prerequisites for Building Native APK:
1. **JDK 17 or 21**:
   - Download and install [Eclipse Temurin OpenJDK 17](https://adoptium.net/temurin/releases/?version=17) or Oracle JDK.
   - Ensure `JAVA_HOME` environment variable is set.
2. **Android Studio** (or Android SDK Command-line Tools):
   - Download and install [Android Studio](https://developer.android.com/studio).
   - During setup, install Android SDK Platform 34 or 35 and Android SDK Build-Tools.

### Step-by-Step APK Build Instructions:

#### Method A: Using Android Studio (Recommended, Visual)
1. Build and sync the latest game assets:
   ```bash
   npm run build
   npx cap sync android
   ```
2. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
   *(Or launch Android Studio, click **File > Open**, and select the `c:\Users\ayush\OneDrive\Desktop\gungame\android` folder)*.
3. Wait for Gradle sync to complete in Android Studio.
4. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Once compiled, Android Studio displays a notification with a **"locate"** link pointing directly to:
   `android/app/build/outputs/apk/debug/app-debug.apk`
6. Transfer this APK to any Android phone and tap to install!

#### Method B: Command-Line Build (Without GUI)
1. Open terminal in the project directory:
   ```bash
   npm run build
   npx cap sync android
   cd android
   .\gradlew assembleDebug
   ```
2. The installable APK is generated at:
   `android\app\build\outputs\apk\debug\app-debug.apk`

---

## 📁 Project Architecture

```
gungame/
├── android/                   # Native Android Gradle project (Capacitor)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml   # Landscape mode & hardware acceleration
│   │   │   └── assets/public/       # Bundled offline game files
│   └── gradlew.bat
├── dist/                      # Bundled production build (628 KB total)
├── src/
│   ├── ai/
│   │   └── BotManager.js      # 20 AI Bots, staggered updates, kill feed
│   ├── audio/
│   │   └── SoundManager.js    # 100% offline Web Audio procedural synthesizer
│   ├── controllers/
│   ├── engine/
│   │   ├── GameEngine.js      # Three.js WebGL renderer, Low/Med/High tiers
│   │   ├── InputManager.js    # Desktop & mobile non-inverted controls
│   │   └── ObjectPool.js      # Bullet & particle pooling
│   ├── entities/
│   │   ├── Bot.js             # Enemy bot state machine, strafing, combat
│   │   ├── CharacterModel.js  # Low-poly rigged commando model & animations
│   │   └── Player.js          # Player physics, camera follow, ADS zoom
│   ├── environment/
│   │   ├── IslandMap.js       # 300m Island, outposts, cottages, warehouses
│   │   ├── LootManager.js     # 3D floating pickups (weapons, ammo, medkits)
│   │   └── SafeZone.js        # Shrinking electric storm dome & timers
│   ├── practice/
│   │   └── PracticeRange.js   # Shooting range, moving targets, distance lines
│   ├── ui/
│   │   ├── HUD.js             # Health/Armor bars, ammo, scope, kill feed
│   │   ├── Minimap.js         # 2D real-time radar with safe zone & gunfire blips
│   │   ├── TouchControls.js   # Virtual joystick & touch buttons
│   │   └── UIManager.js       # Menu, Pause, Settings, Results screens
│   ├── weapons/
│   │   ├── WeaponConfig.js    # AR, SMG, Shotgun, Sniper, Pistol stats
│   │   ├── WeaponManager.js   # Firing, raycasting, recoil, reload, tracers
│   │   └── WeaponModelGenerator.js # Procedural 3D weapon meshes
│   ├── main.js                # App entry point & match lifecycle loop
│   └── style.css              # Mobile-first responsive UI styling
├── capacitor.config.json      # Capacitor Android configuration
├── index.html                 # Game HTML structure & touch layout
├── package.json
└── vite.config.js
```
