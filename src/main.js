// src/main.js
// Main entry point and game loop orchestrator for Battle India Offline

import * as THREE from 'three';
import { GameEngine } from './engine/GameEngine.js';
import { SoundManager } from './audio/SoundManager.js';
import { ObjectPool } from './engine/ObjectPool.js';
import { InputManager } from './engine/InputManager.js';
import { IslandMap } from './environment/IslandMap.js';
import { SafeZone } from './environment/SafeZone.js';
import { LootManager } from './environment/LootManager.js';
import { WeaponManager } from './weapons/WeaponManager.js';
import { Player } from './entities/Player.js';
import { BotManager } from './ai/BotManager.js';
import { PracticeRange } from './practice/PracticeRange.js';
import { Minimap } from './ui/Minimap.js';
import { TouchControls } from './ui/TouchControls.js';
import { HUD } from './ui/HUD.js';
import { UIManager } from './ui/UIManager.js';

class BattleIndiaApp {
  constructor() {
    this.gameState = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'RESULTS'
    this.gameMode = 'royale'; // 'royale' or 'practice'
    this.matchStartTime = 0;
    this.survivalTime = 0;

    // 1. Initialize Core Engine & Audio
    const container = document.getElementById('game-canvas-container');
    this.engine = new GameEngine(container);
    this.sound = new SoundManager();
    this.input = new InputManager();

    // 2. Environment & World
    this.map = new IslandMap(this.engine.scene);
    this.safeZone = new SafeZone(this.engine.scene, this.sound);
    this.lootManager = new LootManager(this.engine.scene, this.sound);

    // 3. Weapons & Player
    this.weaponPool = new ObjectPool(() => ({}), () => {});
    this.weaponManager = new WeaponManager(this.sound, this.weaponPool);
    this.player = new Player(this.engine.scene, this.engine.camera, this.map);
    window.__bio_player = this.player; // Global reference for bot kill identification

    // 4. Enemy Bots & Practice Range
    this.botManager = new BotManager(this.engine.scene, this.map, this.sound);
    this.practiceRange = null;

    // 5. UI & Controls
    const minimapCanvas = document.getElementById('minimap-canvas');
    this.minimap = new Minimap(minimapCanvas);
    this.botManager.minimap = this.minimap;
    this.hud = new HUD();
    this.touchControls = new TouchControls(this.input, this.sound);
    this.ui = new UIManager(this);

    // Setup bot killfeed reporting
    this.botManager.onKillFeedEvent = (event) => {
      this.hud.addKillFeedEntry(event.killer, event.victim, event.weapon);
    };

    // Canvas click: request pointer lock on desktop
    container.addEventListener('click', () => {
      if (this.gameState === 'PLAYING') {
        this.input.requestPointerLock(container);
        this.sound.init(); // Unlock Web Audio context
      }
    });

    // Loot prompt tap listener
    document.getElementById('hud-loot-prompt')?.addEventListener('click', () => {
      if (this.nearbyLoot) {
        this.lootManager.collectItem(this.nearbyLoot, this.player, this.weaponManager);
      }
    });

    // Hide loading screen after initialization
    setTimeout(() => {
      this.ui.hideLoading();
    }, 400);

    // Start main game loop
    this._runLoop();
  }

  startMatch(mode = 'royale') {
    this.gameMode = mode;
    this.gameState = 'PLAYING';
    this.matchStartTime = Date.now();
    this.sound.init();

    // Reset Player
    const playerSpawn = mode === 'practice'
      ? new THREE.Vector3(0, 0, 5)
      : new THREE.Vector3(-25 + Math.random() * 50, 0, -25 + Math.random() * 50);
    this.player.respawn(playerSpawn);

    // Reset Weapons
    this.weaponManager.equipWeapon(0, 'kavach_ar', 30, 120);
    this.weaponManager.equipWeapon(1, mode === 'practice' ? 'brahmos_sr' : 'trishul_12', 6, 30);
    this.weaponManager.equipWeapon(2, 'agni_9', 12, 60);
    this.weaponManager.switchSlot(0, true);

    // Reset Loot
    this.lootManager.populateMap(this.map.lootSpawns);

    if (mode === 'royale') {
      // Clean up practice targets if any
      if (this.practiceRange) {
        this.practiceRange.cleanup();
        this.practiceRange = null;
      }
      // Re-enable Safe Zone
      this.safeZone.zoneMesh.visible = true;
      this.safeZone.ringMesh.visible = true;
      this.safeZone._preparePhase(0);

      // Spawn 20 AI enemy bots
      this.botManager.spawnMatchBots(this.player);
    } else {
      // Practice Mode
      // Disable Safe Zone
      this.safeZone.zoneMesh.visible = false;
      this.safeZone.ringMesh.visible = false;

      // Clear Bots
      this.botManager.bots.forEach(b => this.engine.scene.remove(b.characterModel.group));
      this.botManager.bots = [];

      // Setup Shooting Range
      if (!this.practiceRange) {
        this.practiceRange = new PracticeRange(this.engine.scene, this.sound);
      }
    }

    this.ui.showHUD();
    this.input.requestPointerLock(document.getElementById('game-canvas-container'));
  }

  togglePause(forceState = null) {
    if (this.gameState === 'RESULTS') return;

    if (forceState !== null) {
      this.gameState = forceState ? 'PAUSED' : 'PLAYING';
    } else {
      this.gameState = this.gameState === 'PLAYING' ? 'PAUSED' : 'PLAYING';
    }

    this.ui.setPauseVisible(this.gameState === 'PAUSED');

    if (this.gameState === 'PLAYING') {
      this.input.requestPointerLock(document.getElementById('game-canvas-container'));
    } else {
      this.input.exitPointerLock();
    }
  }

  restartMatch() {
    this.startMatch(this.gameMode);
  }

  quitToMainMenu() {
    this.gameState = 'MENU';
    this.input.exitPointerLock();
    this.ui.showMainMenu();

    // Clean up bots & practice targets
    this.botManager.bots.forEach(b => this.engine.scene.remove(b.characterModel.group));
    this.botManager.bots = [];
    if (this.practiceRange) {
      this.practiceRange.cleanup();
      this.practiceRange = null;
    }
  }

  _runLoop() {
    requestAnimationFrame(() => this._runLoop());

    const delta = this.engine.getDelta();

    if (this.gameState === 'PLAYING') {
      this._updateGameplay(delta);
    } else if (this.gameState === 'MENU') {
      this._updateMenuCamera(delta);
    }

    // Render 3D Scene
    this.engine.render();
  }

  _updateGameplay(delta) {
    // 1. Process Weapon Slot Switch Request
    const switchSlot = this.input.consumeSlotSwitch();
    if (switchSlot !== null) {
      this.weaponManager.switchSlot(switchSlot);
      // Update UI active slot pill
      [1, 2, 3].forEach((s, idx) => {
        const pill = document.getElementById(`touch-slot-${s}`);
        if (pill) {
          pill.classList.toggle('active', idx === switchSlot);
        }
      });
    }

    // 2. Process Aim Down Sights (ADS)
    this.weaponManager.setAiming(this.input.isAiming);

    // 3. Process Reload Request
    if (this.input.consumeReload()) {
      this.weaponManager.startReload();
    }

    // 4. Update Player Physics & Camera
    this.player.update(delta, this.input, this.weaponManager);

    // 5. Update Weapon Manager (Recoil recovery, tracers, animations)
    this.weaponManager.update(delta);

    // 6. Handle Firing (Continuous while trigger held)
    if (this.input.isFiring) {
      const isMoving = this.player.velocity.length() > 0.5;
      const shootableTargets = this.gameMode === 'royale'
        ? this.botManager.getShootableObjects()
        : this.practiceRange ? this.practiceRange.getShootableObjects() : [];

      const shotResult = this.weaponManager.fire(
        this.engine.camera,
        shootableTargets,
        isMoving
      );

      if (shotResult && shotResult.hits.length > 0) {
        shotResult.hits.forEach(hit => {
          hit.target.takeDamage(hit.damage, this.player);
          this.player.damageDealt += hit.damage;
          this.hud.showHitmarker(hit.isHeadshot);
          this.sound.playHitMarker(hit.isHeadshot);
        });
      }

      // If weapon is semi-auto, release firing trigger
      if (shotResult && !shotResult.weapon.isAutomatic) {
        this.input.isFiring = false;
      }
    }

    // 7. Update Safe Zone
    if (this.gameMode === 'royale') {
      this.safeZone.update(delta, this.player, this.botManager.bots);
    }

    // 8. Update AI Enemy Bots
    if (this.gameMode === 'royale') {
      this.botManager.update(delta, this.player, this.safeZone);
    } else if (this.practiceRange) {
      this.practiceRange.update(delta);
    }

    // 9. Update Loot Pickups & Proximity
    this.nearbyLoot = this.lootManager.update(delta, this.player, this.weaponManager);
    if (this.input.consumeInteract() && this.nearbyLoot) {
      this.lootManager.collectItem(this.nearbyLoot, this.player, this.weaponManager);
    }

    // 10. Update 2D Minimap
    this.minimap.update(delta, this.player, this.gameMode === 'royale' ? this.safeZone : null);

    // 11. Update HUD Elements
    const aliveBots = this.gameMode === 'royale' ? this.botManager.getAliveCount() : 0;
    this.hud.update(
      this.player,
      this.weaponManager,
      this.gameMode === 'royale' ? this.safeZone : null,
      this.nearbyLoot,
      aliveBots
    );

    // 12. Match Survival Time
    this.survivalTime = (Date.now() - this.matchStartTime) / 1000;

    // 13. Check Win / Loss Conditions
    if (this.gameMode === 'royale') {
      if (!this.player.isAlive) {
        // Player eliminated!
        const finalRank = aliveBots + 1;
        this.gameState = 'RESULTS';
        this.input.exitPointerLock();
        setTimeout(() => {
          this.ui.showMatchResults(false, finalRank, this.player.kills, this.player.damageDealt, this.survivalTime);
        }, 800);
      } else if (aliveBots === 0 && this.botManager.bots.length > 0) {
        // Victory Royale - Champion of Bharat!
        this.gameState = 'RESULTS';
        this.input.exitPointerLock();
        setTimeout(() => {
          this.ui.showMatchResults(true, 1, this.player.kills, this.player.damageDealt, this.survivalTime);
        }, 800);
      }
    }
  }

  _updateMenuCamera(delta) {
    // Cinematic slow rotating camera orbit around island center in main menu
    const time = Date.now() * 0.00035;
    const radius = 65;
    this.engine.camera.position.set(
      Math.cos(time) * radius,
      28,
      Math.sin(time) * radius
    );
    this.engine.camera.lookAt(0, 5, 0);
  }
}

// Instantiate and start game on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new BattleIndiaApp();
});
