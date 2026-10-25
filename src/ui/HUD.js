// src/ui/HUD.js
// Handles real-time combat HUD: health bars, ammo cards, crosshairs, killfeed, alerts, sniper scope

export class HUD {
  constructor() {
    this._initDOMElements();
    this.killFeedMessages = [];
  }

  _initDOMElements() {
    this.hudLayer = document.getElementById('hud-layer');
    this.hpBarFill = document.getElementById('hud-hp-fill');
    this.hpText = document.getElementById('hud-hp-text');
    this.armorBarFill = document.getElementById('hud-armor-fill');
    this.armorText = document.getElementById('hud-armor-text');

    this.aliveCount = document.getElementById('hud-alive-count');
    this.killCount = document.getElementById('hud-kill-count');
    this.zoneTimerText = document.getElementById('hud-zone-timer');
    this.zoneAlert = document.getElementById('hud-zone-alert');

    this.weaponName = document.getElementById('hud-weapon-name');
    this.ammoCurrent = document.getElementById('hud-ammo-current');
    this.ammoReserve = document.getElementById('hud-ammo-reserve');
    this.reloadRing = document.getElementById('hud-reload-ring');

    this.medkitCount = document.getElementById('hud-medkit-badge');
    this.medkitProgress = document.getElementById('hud-medkit-bar');

    this.crosshair = document.getElementById('hud-crosshair');
    this.hitmarker = document.getElementById('hud-hitmarker');
    this.sniperScope = document.getElementById('hud-sniper-scope');
    this.lootPrompt = document.getElementById('hud-loot-prompt');
    this.killFeedContainer = document.getElementById('hud-kill-feed');
  }

  update(player, weaponManager, safeZone, nearbyLoot, aliveBotCount) {
    if (!player) return;

    // 1. Health & Armor Bars
    const hpRatio = Math.max(0, player.health / player.maxHealth);
    this.hpBarFill.style.width = `${hpRatio * 100}%`;
    this.hpText.textContent = `${Math.ceil(player.health)} / 100`;

    // Dynamic color: green -> orange -> red
    if (hpRatio > 0.5) {
      this.hpBarFill.style.backgroundColor = '#2ecc71';
    } else if (hpRatio > 0.25) {
      this.hpBarFill.style.backgroundColor = '#f39c12';
    } else {
      this.hpBarFill.style.backgroundColor = '#e74c3c';
    }

    const armorRatio = Math.max(0, player.armor / player.maxArmor);
    this.armorBarFill.style.width = `${armorRatio * 100}%`;
    this.armorText.textContent = `${Math.ceil(player.armor)}`;

    // 2. Alive & Kills Count
    const totalAlive = (player.isAlive ? 1 : 0) + aliveBotCount;
    this.aliveCount.textContent = totalAlive.toString();
    this.killCount.textContent = player.kills.toString();

    // 3. Safe Zone Timer & Status
    if (safeZone) {
      const zStatus = safeZone.getStatus();
      this.zoneTimerText.textContent = zStatus.timeText;

      if (zStatus.state === 'SHRINKING') {
        this.zoneAlert.style.display = 'block';
        this.zoneAlert.textContent = 'WARNING: SAFE ZONE SHRINKING!';
      } else {
        this.zoneAlert.style.display = 'none';
      }
    }

    // 4. Weapon & Ammo
    if (weaponManager) {
      const cfg = weaponManager.getActiveConfig();
      const slot = weaponManager.getActiveSlot();

      if (cfg && slot) {
        this.weaponName.textContent = cfg.name;
        this.ammoCurrent.textContent = slot.ammo.toString();
        this.ammoReserve.textContent = `/ ${slot.reserve}`;

        // Reload ring animation
        if (weaponManager.isReloading) {
          this.reloadRing.style.display = 'block';
          const p = Math.floor(weaponManager.reloadProgress * 360);
          this.reloadRing.style.background = `conic-gradient(#ffcc00 ${p}deg, rgba(255,255,255,0.2) 0deg)`;
        } else {
          this.reloadRing.style.display = 'none';
        }

        // Sniper Scope Overlay
        if (cfg.type === 'sniper' && weaponManager.isAiming) {
          this.sniperScope.style.display = 'flex';
          this.crosshair.style.display = 'none';
        } else {
          this.sniperScope.style.display = 'none';
          this.crosshair.style.display = 'flex';
        }

        // Crosshair bloom based on movement and recoil
        const bloom = 8 + (weaponManager.recoilPitch * 350) + (player.velocity.length() * 3.5);
        this.crosshair.style.gap = `${Math.min(35, bloom)}px`;
      }
    }

    // 5. Medkit
    this.medkitCount.textContent = player.medkits.toString();
    if (player.isHealing) {
      this.medkitProgress.style.display = 'block';
      this.medkitProgress.style.width = `${player.healProgress * 100}%`;
    } else {
      this.medkitProgress.style.display = 'none';
    }

    // 6. Loot Prompt
    if (nearbyLoot) {
      this.lootPrompt.style.display = 'flex';
      this.lootPrompt.innerHTML = `<span>[TAP / E]</span> PICK UP ${nearbyLoot.name}`;
    } else {
      this.lootPrompt.style.display = 'none';
    }
  }

  showHitmarker(isHeadshot = false) {
    this.hitmarker.classList.remove('active', 'headshot');
    // Force reflow
    void this.hitmarker.offsetWidth;

    if (isHeadshot) {
      this.hitmarker.classList.add('headshot');
    }
    this.hitmarker.classList.add('active');

    setTimeout(() => {
      this.hitmarker.classList.remove('active', 'headshot');
    }, 120);
  }

  addKillFeedEntry(killer, victim, weaponName) {
    const entry = document.createElement('div');
    entry.className = 'kill-feed-entry';

    const isYou = killer === 'You';
    entry.innerHTML = `
      <span class="killer ${isYou ? 'you' : ''}">${killer}</span>
      <span class="weapon-tag">🔫 ${weaponName}</span>
      <span class="victim">${victim}</span>
    `;

    this.killFeedContainer.appendChild(entry);

    setTimeout(() => {
      entry.classList.add('fade-out');
      setTimeout(() => entry.remove(), 400);
    }, 4500);
  }
}
