// src/entities/Bot.js
// Intelligent offline AI enemy bot with combat states, burst fire, strafing, and zone awareness

import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { WEAPON_CONFIGS } from '../weapons/WeaponConfig.js';

export class Bot {
  constructor(id, name, scene, islandMap, soundManager, difficulty = 'soldier') {
    this.id = id;
    this.name = name;
    this.scene = scene;
    this.map = islandMap;
    this.soundManager = soundManager;
    this.difficulty = difficulty;

    // Attributes
    this.maxHealth = 100;
    this.health = 100;
    this.isAlive = true;
    this.kills = 0;

    // Weapon
    const weaponPool = ['kavach_ar', 'garuda_smg', 'trishul_12', 'brahmos_sr', 'agni_9'];
    this.weaponId = weaponPool[Math.floor(Math.random() * weaponPool.length)];
    this.weaponConfig = WEAPON_CONFIGS[this.weaponId];
    this.currentAmmo = this.weaponConfig.magazineSize;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.shootTimer = 0;
    this.burstCount = 0;
    this.onFired = null;

    // Movement & Physics
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.moveSpeed = 5.2;
    this.targetPosition = new THREE.Vector3(0, 0, 0);
    this.currentWaypointIndex = 0;

    // AI States: 'PATROL', 'COMBAT', 'SEEK_ZONE', 'TAKE_COVER'
    this.state = 'PATROL';
    this.targetEnemy = null; // Can be player or another bot
    this.strafeDir = 1;
    this.strafeTimer = 0;
    this.thinkInterval = 0.2; // Staggered decision frequency
    this.thinkTimer = Math.random() * 0.2;

    // Setup difficulty profile
    this._applyDifficulty(difficulty);

    // 3D Character Model
    this.characterModel = new CharacterModel(false, id % 3);
    this.characterModel.group.userData = { entity: this };
    this.scene.add(this.characterModel.group);

    // Overhead Health Bar Billboard
    this._createHealthBar();
  }

  _applyDifficulty(diff) {
    if (diff === 'recruit') {
      this.accuracy = 0.50;
      this.reactionTime = 1.1;
      this.sightRange = 45;
      this.burstSize = 3;
    } else if (diff === 'veteran') {
      this.accuracy = 0.85;
      this.reactionTime = 0.4;
      this.sightRange = 75;
      this.burstSize = 5;
    } else {
      // Soldier (default)
      this.accuracy = 0.68;
      this.reactionTime = 0.7;
      this.sightRange = 60;
      this.burstSize = 4;
    }
  }

  _createHealthBar() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    this.hpCanvas = canvas;
    this.hpCtx = canvas.getContext('2d');

    this.hpTexture = new THREE.CanvasTexture(canvas);
    this.hpTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.hpTexture,
      transparent: true,
      depthTest: false
    });

    this.hpSprite = new THREE.Sprite(spriteMat);
    this.hpSprite.scale.set(1.6, 0.4, 1.0);
    this.hpSprite.position.y = 2.15;
    this.characterModel.group.add(this.hpSprite);

    this._updateHealthBarGraphic();
  }

  _updateHealthBarGraphic() {
    const ctx = this.hpCtx;
    ctx.clearRect(0, 0, 128, 32);

    // Name label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, 64, 12);

    // Background bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(14, 16, 100, 10);

    // Fill bar
    const ratio = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(16, 18, 96 * ratio, 6);

    this.hpTexture.needsUpdate = true;
  }

  spawnAt(x, z) {
    const y = this.map.getTerrainHeight(x, z);
    this.position.set(x, y, z);
    this.targetPosition.set(x, y, z);
    this.health = 100;
    this.isAlive = true;
    this.currentAmmo = this.weaponConfig.magazineSize;
    this.characterModel.isDead = false;
    this.characterModel.group.position.set(x, y, z);
    this.characterModel.group.rotation.x = 0;
    this._updateHealthBarGraphic();
  }

  takeDamage(amount, attacker = null, source = 'bullet') {
    if (!this.isAlive) return;

    this.health = Math.max(0, this.health - amount);
    this.characterModel.flashHit();
    this._updateHealthBarGraphic();

    // Aggro onto attacker if attacked
    if (attacker && attacker.isAlive && this.state !== 'SEEK_ZONE') {
      this.targetEnemy = attacker;
      this.state = 'COMBAT';
    }

    if (this.health <= 0) {
      this.die(attacker);
    }
  }

  die(killer = null) {
    this.isAlive = false;
    this.health = 0;
    this.characterModel.triggerDeath();
    this.hpSprite.visible = false;

    // Drop ammo/loot upon death
    if (this.map && Math.random() < 0.6) {
      this.map.lootSpawns.push({
        position: this.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
        preferredType: Math.random() < 0.5 ? 'medkit' : this.weaponId
      });
    }
  }

  update(delta, player, allBots = [], safeZone = null) {
    if (!this.isAlive) {
      this.characterModel.updateAnimation(delta, 0, true, 0);
      return;
    }

    // Staggered AI decision logic
    this.thinkTimer += delta;
    if (this.thinkTimer >= this.thinkInterval) {
      this.thinkTimer = 0;
      this._updateDecisions(player, allBots, safeZone);
    }

    // Execute state movement and actions
    this._executeActions(delta, safeZone);

    // Animation update
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.characterModel.updateAnimation(delta, horizontalSpeed, true, 0);
  }

  _updateDecisions(player, allBots, safeZone) {
    // 1. Zone Priority Check: If caught outside safe zone, prioritize fleeing to safe circle!
    if (safeZone && !safeZone.isInsideSafeZone(this.position)) {
      this.state = 'SEEK_ZONE';
      const targetVec = safeZone.getTargetCenterVector3(0);
      this.targetPosition.set(targetVec.x, 0, targetVec.z);
      return;
    }

    // 2. Find Potential Enemies (Player + other bots)
    let potentialTargets = [];
    if (player && player.isAlive) {
      const distToPlayer = this.position.distanceTo(player.position);
      if (distToPlayer < this.sightRange) {
        potentialTargets.push({ entity: player, dist: distToPlayer });
      }
    }

    // Other bots
    for (let i = 0; i < allBots.length; i++) {
      const other = allBots[i];
      if (other !== this && other.isAlive) {
        const dist = this.position.distanceTo(other.position);
        if (dist < this.sightRange * 0.75) {
          potentialTargets.push({ entity: other, dist });
        }
      }
    }

    if (potentialTargets.length > 0) {
      // Sort by closest target
      potentialTargets.sort((a, b) => a.dist - b.dist);
      this.targetEnemy = potentialTargets[0].entity;
      this.state = 'COMBAT';
    } else {
      // No enemies in range -> PATROL
      this.targetEnemy = null;
      if (this.state !== 'SEEK_ZONE') {
        this.state = 'PATROL';
        // Select random map waypoint if close to current target
        if (this.position.distanceTo(this.targetPosition) < 4.0 && this.map.botWaypoints.length > 0) {
          const wp = this.map.botWaypoints[Math.floor(Math.random() * this.map.botWaypoints.length)];
          this.targetPosition.copy(wp);
        }
      }
    }
  }

  _executeActions(delta, safeZone) {
    // Reload handling
    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.currentAmmo = this.weaponConfig.magazineSize;
        this.isReloading = false;
      }
      return;
    }

    if (this.state === 'COMBAT' && this.targetEnemy && this.targetEnemy.isAlive) {
      this._executeCombat(delta);
    } else {
      this._executeNavigation(delta);
    }
  }

  _executeCombat(delta) {
    const enemyPos = this.targetEnemy.position;
    const dist = this.position.distanceTo(enemyPos);

    // Rotate toward target enemy
    const dx = enemyPos.x - this.position.x;
    const dz = enemyPos.z - this.position.z;
    const targetAngle = Math.atan2(dx, dz);
    this.characterModel.group.rotation.y = THREE.MathUtils.lerp(
      this.characterModel.group.rotation.y,
      targetAngle,
      delta * 7.0
    );

    // Tactical strafing while shooting
    this.strafeTimer += delta;
    if (this.strafeTimer > 2.2) {
      this.strafeTimer = 0;
      this.strafeDir *= -1; // Change strafe direction
    }

    // Move closer if too far, or back up if too close (optimal combat distance ~ 18m)
    let moveDir = new THREE.Vector3(0, 0, 0);
    const forward = new THREE.Vector3(Math.sin(targetAngle), 0, Math.cos(targetAngle));
    const right = new THREE.Vector3(Math.cos(targetAngle), 0, -Math.sin(targetAngle));

    if (dist > 25) {
      moveDir.addScaledVector(forward, 0.7);
    } else if (dist < 10) {
      moveDir.addScaledVector(forward, -0.5);
    }
    moveDir.addScaledVector(right, this.strafeDir * 0.6);

    if (moveDir.length() > 0.01) {
      moveDir.normalize();
      this._moveInDirection(moveDir, delta, this.moveSpeed * 0.75);
    }

    // Firing logic
    this.shootTimer += delta;
    if (this.shootTimer >= this.weaponConfig.fireRate) {
      this.shootTimer = 0;
      this._fireAtTarget(this.targetEnemy, dist);
    }
  }

  _fireAtTarget(target, dist) {
    if (this.currentAmmo <= 0) {
      this.isReloading = true;
      this.reloadTimer = this.weaponConfig.reloadTime;
      return;
    }

    this.currentAmmo--;

    if (this.onFired) {
      this.onFired(this.position.x, this.position.z);
    }

    // Play gunshot sound at bot position relative to player
    if (this.soundManager) {
      const distRatio = Math.min(1.0, dist / 90);
      this.soundManager.playGunshot(this.weaponConfig.type, true, distRatio);
    }

    // Calculate hit based on accuracy and distance
    const hitChance = Math.max(0.15, this.accuracy * (1.0 - (dist / this.weaponConfig.range) * 0.5));
    if (Math.random() < hitChance) {
      const damage = Math.round(this.weaponConfig.damage * (0.8 + Math.random() * 0.4));
      target.takeDamage(damage, this, 'bullet');
    }
  }

  _executeNavigation(delta) {
    const dx = this.targetPosition.x - this.position.x;
    const dz = this.targetPosition.z - this.position.z;
    const distToTarget = Math.hypot(dx, dz);

    if (distToTarget > 1.2) {
      const moveDir = new THREE.Vector3(dx, 0, dz).normalize();
      const targetAngle = Math.atan2(dx, dz);
      this.characterModel.group.rotation.y = THREE.MathUtils.lerp(
        this.characterModel.group.rotation.y,
        targetAngle,
        delta * 6.0
      );
      this._moveInDirection(moveDir, delta, this.moveSpeed);
    } else {
      this.velocity.set(0, 0, 0);
    }
  }

  _moveInDirection(dir, delta, speed) {
    const nextX = this.position.x + dir.x * speed * delta;
    const nextZ = this.position.z + dir.z * speed * delta;

    // Obstacle avoidance
    if (!this.map.checkCollision(new THREE.Vector3(nextX, this.position.y, nextZ), 0.5)) {
      this.position.x = nextX;
      this.position.z = nextZ;
      this.velocity.set(dir.x * speed, 0, dir.z * speed);
    } else {
      // Obstacle hit: pick new evasion angle
      this.targetPosition.x += (Math.random() - 0.5) * 15;
      this.targetPosition.z += (Math.random() - 0.5) * 15;
      this.velocity.set(0, 0, 0);
    }

    // Keep to terrain height
    this.position.y = this.map.getTerrainHeight(this.position.x, this.position.z);
    this.characterModel.group.position.copy(this.position);
  }
}
