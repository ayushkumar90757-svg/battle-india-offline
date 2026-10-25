// src/ai/BotManager.js
// Orchestrates 20 AI enemy bots with staggered updates, match drop spawns, and kill feed tracking

import * as THREE from 'three';
import { Bot } from '../entities/Bot.js';

export const BOT_NAMES = [
  'Arjun', 'Vikram', 'Kabir', 'Rohan', 'Dev',
  'Aarav', 'Veer', 'Samir', 'Karan', 'Suraj',
  'Neeraj', 'Aditya', 'Manish', 'Gautam', 'Varun',
  'Kunal', 'Tariq', 'Deepak', 'Akash', 'Rishi'
];

export class BotManager {
  constructor(scene, islandMap, soundManager, minimap = null) {
    this.scene = scene;
    this.map = islandMap;
    this.soundManager = soundManager;
    this.minimap = minimap;

    this.bots = [];
    this.botCount = parseInt(localStorage.getItem('bio_bot_count') || '20');
    this.botDifficulty = localStorage.getItem('bio_bot_difficulty') || 'soldier';

    // Staggered update batch index for stable 60 FPS
    this.batchIndex = 0;
    this.batchSize = 5;

    // Elimination kill feed event listeners
    this.onKillFeedEvent = null;
  }

  setBotCount(count) {
    this.botCount = Math.max(5, Math.min(20, count));
    localStorage.setItem('bio_bot_count', this.botCount.toString());
  }

  setDifficulty(diff) {
    this.botDifficulty = diff;
    localStorage.setItem('bio_bot_difficulty', diff);
  }

  cleanup() {
    this.bots.forEach(b => {
      this.scene.remove(b.characterModel.group);
      b.dispose?.();
    });
    this.bots = [];
  }

  spawnMatchBots(player) {
    // Clean up old bots
    this.cleanup();

    const totalToSpawn = this.botCount;
    const islandRadius = 110;

    for (let i = 0; i < totalToSpawn; i++) {
      const name = BOT_NAMES[i % BOT_NAMES.length];
      const bot = new Bot(i, name, this.scene, this.map, this.soundManager, this.botDifficulty);

      // Distribute spawn points in a safe circle across the island
      const angle = (i / totalToSpawn) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
      const dist = 35 + (Math.random() * (islandRadius - 45));
      const spawnX = Math.cos(angle) * dist;
      const spawnZ = Math.sin(angle) * dist;

      bot.spawnAt(spawnX, spawnZ);

      bot.onFired = (bx, bz) => {
        if (this.minimap) {
          this.minimap.addGunfireBlip(bx, bz);
        }
      };

      // Hook death for kill feed
      const origDie = bot.die.bind(bot);
      bot.die = (killer) => {
        origDie(killer);
        this._handleBotEliminated(bot, killer);
      };

      this.bots.push(bot);
    }
  }

  _handleBotEliminated(victim, killer) {
    let killerName = 'Safe Zone';
    if (killer) {
      killerName = killer.name || (killer === window.__bio_player ? 'You' : 'Commando');
      killer.kills = (killer.kills || 0) + 1;
    }

    if (this.soundManager) {
      this.soundManager.playElimination();
    }

    if (this.onKillFeedEvent) {
      this.onKillFeedEvent({
        killer: killerName,
        victim: victim.name,
        weapon: victim.weaponConfig?.name || 'Assault Rifle'
      });
    }
  }

  getAliveCount() {
    let count = 0;
    for (let i = 0; i < this.bots.length; i++) {
      if (this.bots[i].isAlive) count++;
    }
    return count;
  }

  getShootableObjects() {
    const objects = [];
    for (let i = 0; i < this.bots.length; i++) {
      if (this.bots[i].isAlive) {
        objects.push(this.bots[i].characterModel.group);
      }
    }
    return objects;
  }

  update(delta, player, safeZone) {
    if (this.bots.length === 0) return;

    // Smooth movement physics updates for all alive bots
    // Staggered AI decision updates across 4 frames
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (bot.isAlive) {
        bot.update(delta, player, this.bots, safeZone);
      }
    }
  }
}
