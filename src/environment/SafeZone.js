// src/environment/SafeZone.js
// Battle Royale shrinking safe circle and electric blue danger zone

import * as THREE from 'three';

export class SafeZone {
  constructor(scene, soundManager) {
    this.scene = scene;
    this.soundManager = soundManager;

    // Phases definition:
    // [radius, waitTime, shrinkTime, damagePerSec]
    this.phases = [
      { wait: 20, shrink: 40, targetRadius: 95, damage: 3 },
      { wait: 15, shrink: 35, targetRadius: 55, damage: 6 },
      { wait: 10, shrink: 30, targetRadius: 22, damage: 10 },
      { wait: 5,  shrink: 25, targetRadius: 5,  damage: 15 }
    ];

    this.currentPhaseIndex = 0;
    this.state = 'WAITING'; // 'WAITING' or 'SHRINKING'
    this.timer = this.phases[0].wait;

    // Center and radius
    this.currentCenter = new THREE.Vector2(0, 0);
    this.currentRadius = 145; // Start encompassing island

    this.targetCenter = new THREE.Vector2(0, 0);
    this.targetRadius = 145;

    this.startCenter = new THREE.Vector2(0, 0);
    this.startRadius = 145;

    this.shrinkProgress = 0;

    // Damage tick accumulator
    this.damageTimer = 0;

    // 3D Visual Forcefield Cylinder
    this._createForcefieldMesh();

    // Prepare first phase target
    this._preparePhase(0);
  }

  _createForcefieldMesh() {
    const geom = new THREE.CylinderGeometry(1, 1, 45, 48, 1, true);
    this.zoneMat = new THREE.MeshBasicMaterial({
      color: 0x00bbff,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.zoneMesh = new THREE.Mesh(geom, this.zoneMat);
    this.zoneMesh.position.set(0, 20, 0);
    this.zoneMesh.scale.set(this.currentRadius, 1, this.currentRadius);
    this.scene.add(this.zoneMesh);

    // Glowing border ring on the ground
    const ringGeom = new THREE.RingGeometry(0.97, 1.0, 48);
    ringGeom.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x33e1ff,
      side: THREE.DoubleSide
    });
    this.ringMesh = new THREE.Mesh(ringGeom, this.ringMat);
    this.ringMesh.position.set(0, 0.4, 0);
    this.ringMesh.scale.set(this.currentRadius, 1, this.currentRadius);
    this.scene.add(this.ringMesh);
  }

  _preparePhase(index) {
    if (index >= this.phases.length) {
      this.state = 'FINAL';
      return;
    }

    const p = this.phases[index];
    this.startCenter.copy(this.currentCenter);
    this.startRadius = this.currentRadius;

    // Randomize next center inside current safe area
    const maxOffset = Math.max(0, this.currentRadius - p.targetRadius) * 0.65;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * maxOffset;

    this.targetCenter.set(
      this.currentCenter.x + Math.cos(angle) * dist,
      this.currentCenter.y + Math.sin(angle) * dist
    );
    this.targetRadius = p.targetRadius;

    this.state = 'WAITING';
    this.timer = p.wait;
  }

  isInsideSafeZone(pos3D) {
    const dx = pos3D.x - this.currentCenter.x;
    const dz = pos3D.z - this.currentCenter.y;
    return (dx * dx + dz * dz) <= (this.currentRadius * this.currentRadius);
  }

  getDistanceToZoneCenter(pos3D) {
    const dx = pos3D.x - this.currentCenter.x;
    const dz = pos3D.z - this.currentCenter.y;
    return Math.sqrt(dx * dx + dz * dz);
  }

  getZoneCenterVector3(y = 0) {
    return new THREE.Vector3(this.currentCenter.x, y, this.currentCenter.y);
  }

  getTargetCenterVector3(y = 0) {
    return new THREE.Vector3(this.targetCenter.x, y, this.targetCenter.y);
  }

  update(delta, player, bots = []) {
    const phase = this.phases[this.currentPhaseIndex];
    if (!phase) return;

    this.timer -= delta;

    if (this.state === 'WAITING') {
      if (this.timer <= 0) {
        // Transition to SHRINKING
        this.state = 'SHRINKING';
        this.timer = phase.shrink;
        this.shrinkProgress = 0;
        if (this.soundManager) {
          this.soundManager.playZoneAlarm();
        }
      }
    } else if (this.state === 'SHRINKING') {
      this.shrinkProgress = 1.0 - Math.max(0, this.timer / phase.shrink);

      // Smooth cubic interpolation
      const t = this.shrinkProgress;
      const smoothT = t * t * (3 - 2 * t);

      this.currentRadius = THREE.MathUtils.lerp(this.startRadius, this.targetRadius, smoothT);
      this.currentCenter.lerpVectors(this.startCenter, this.targetCenter, smoothT);

      if (this.timer <= 0) {
        // Phase complete, advance to next phase
        this.currentPhaseIndex++;
        this._preparePhase(this.currentPhaseIndex);
      }
    }

    // Update 3D mesh scale and position
    this.zoneMesh.position.x = this.currentCenter.x;
    this.zoneMesh.position.z = this.currentCenter.y;
    this.zoneMesh.scale.set(this.currentRadius, 1, this.currentRadius);

    this.ringMesh.position.x = this.currentCenter.x;
    this.ringMesh.position.z = this.currentCenter.y;
    this.ringMesh.scale.set(this.currentRadius, 1, this.currentRadius);

    // Subtle forcefield shimmer animation
    this.zoneMat.opacity = 0.22 + Math.sin(Date.now() * 0.004) * 0.08;

    // Periodic damage tick (every 1.0s)
    this.damageTimer += delta;
    if (this.damageTimer >= 1.0) {
      this.damageTimer = 0;
      const dmg = phase.damage;

      // Check player
      if (player && player.isAlive && !this.isInsideSafeZone(player.position)) {
        player.takeDamage(dmg, null, 'zone');
      }

      // Check bots
      bots.forEach(bot => {
        if (bot && bot.isAlive && !this.isInsideSafeZone(bot.position)) {
          bot.takeDamage(dmg, null, 'zone');
        }
      });
    }
  }

  // Info for HUD display
  getStatus() {
    const mins = Math.floor(Math.max(0, this.timer) / 60);
    const secs = Math.floor(Math.max(0, this.timer) % 60);
    const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    return {
      state: this.state,
      timeText: timeFormatted,
      phaseNumber: this.currentPhaseIndex + 1,
      totalPhases: this.phases.length,
      currentRadius: this.currentRadius,
      targetRadius: this.targetRadius,
      currentCenter: this.currentCenter,
      targetCenter: this.targetCenter
    };
  }
}
