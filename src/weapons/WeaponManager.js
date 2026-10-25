// src/weapons/WeaponManager.js
// Handles weapon slots, firing, reloading, recoil, raycasts, tracers, and impacts

import * as THREE from 'three';
import { WEAPON_CONFIGS } from './WeaponConfig.js';
import { WeaponModelGenerator } from './WeaponModelGenerator.js';

export class WeaponManager {
  constructor(soundManager, objectPool) {
    this.soundManager = soundManager;
    this.pool = objectPool;

    // 3 Weapon Slots: [0: Primary, 1: Secondary, 2: Pistol/Melee]
    this.slots = [
      { id: 'kavach_ar', ammo: 30, reserve: 120 },
      { id: 'trishul_12', ammo: 6, reserve: 30 },
      { id: 'agni_9', ammo: 12, reserve: 60 }
    ];
    this.activeSlotIndex = 0;

    // State
    this.isReloading = false;
    this.reloadProgress = 0;
    this.reloadDuration = 2.0;
    this.timeSinceLastShot = 999;
    this.currentSpread = 0.02;

    // Recoil state
    this.recoilPitch = 0;
    this.recoilYaw = 0;

    // Aim Down Sights (ADS)
    this.isAiming = false;
    this.aimTransition = 0; // 0 (hip) to 1 (full ADS)

    // Three.js visual objects
    this.weaponContainer = new THREE.Group();
    this.activeModel = null;
    this.modelCache = {};

    // High performance pre-allocated tracer pool (Zero GC)
    this.tracerPool = [];
    this.activeTracers = [];
    this.tracerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe600,
      transparent: true,
      opacity: 0.95
    });
    this.tracerGeom = new THREE.CylinderGeometry(0.015, 0.015, 1, 4);
    this.tracerGeom.rotateX(Math.PI / 2);

    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(this.tracerGeom, this.tracerMaterial);
      mesh.visible = false;
      this.tracerPool.push(mesh);
    }

    // Reusable math vectors to prevent GC allocations
    this._vStartPoint = new THREE.Vector3();
    this._vEndPoint = new THREE.Vector3();
    this._vHitPoint = new THREE.Vector3();
    this._vScreenCoord = new THREE.Vector2();

    // Raycaster for hit detection
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 350;

    this._setupWeaponModels();
    this.switchSlot(0, true);
  }

  _setupWeaponModels() {
    Object.keys(WEAPON_CONFIGS).forEach(id => {
      const model = WeaponModelGenerator.createModel(id);
      model.visible = false;
      this.modelCache[id] = model;
      this.weaponContainer.add(model);
    });
  }

  getActiveConfig() {
    const slot = this.slots[this.activeSlotIndex];
    if (!slot) return null;
    return WEAPON_CONFIGS[slot.id];
  }

  getActiveSlot() {
    return this.slots[this.activeSlotIndex];
  }

  switchSlot(index, force = false) {
    if (!force && index === this.activeSlotIndex) return;
    if (index < 0 || index >= this.slots.length) return;
    if (!this.slots[index]) return;

    this.activeSlotIndex = index;
    // Always cancel active reload when switching weapons (tactical weapon swap)
    this.isReloading = false;
    this.reloadProgress = 0;

    const currentConfig = this.getActiveConfig();
    if (!currentConfig) return;

    // Update 3D model visibility
    Object.keys(this.modelCache).forEach(id => {
      this.modelCache[id].visible = (id === currentConfig.id);
    });
    this.activeModel = this.modelCache[currentConfig.id];

    // Play subtle weapon draw sound
    if (this.soundManager) {
      this.soundManager._createClick(this.soundManager.ctx?.currentTime || 0, 750, 0.05);
    }
  }

  equipWeapon(slotIndex, weaponId, ammo = null, reserve = null) {
    if (slotIndex < 0 || slotIndex >= 3) return;
    const config = WEAPON_CONFIGS[weaponId];
    if (!config) return;

    this.slots[slotIndex] = {
      id: weaponId,
      ammo: ammo !== null ? ammo : config.magazineSize,
      reserve: reserve !== null ? reserve : config.reserveAmmo
    };

    if (this.activeSlotIndex === slotIndex) {
      this.switchSlot(slotIndex, true);
    }
  }

  addAmmo(weaponType, amount) {
    // Add to all matching weapons in inventory
    this.slots.forEach(slot => {
      if (!slot) return;
      const cfg = WEAPON_CONFIGS[slot.id];
      if (cfg && cfg.type === weaponType) {
        slot.reserve = Math.min(cfg.maxReserve, slot.reserve + amount);
      }
    });
  }

  setAiming(isAiming) {
    this.isAiming = isAiming;
  }

  startReload() {
    const slot = this.getActiveSlot();
    const config = this.getActiveConfig();
    if (!slot || !config) return false;
    if (this.isReloading) return false;
    if (slot.ammo >= config.magazineSize) return false; // Already full
    if (slot.reserve <= 0) return false; // No reserve ammo

    this.isReloading = true;
    this.reloadProgress = 0;
    this.reloadDuration = config.reloadTime;

    if (this.soundManager) {
      this.soundManager.playReload();
    }
    return true;
  }

  // Firing logic triggered by player input
  canFire() {
    const slot = this.getActiveSlot();
    const config = this.getActiveConfig();
    if (!slot || !config) return false;
    if (this.isReloading) return false;
    if (this.timeSinceLastShot < config.fireRate) return false;
    if (slot.ammo <= 0) return false;
    return true;
  }

  fire(camera, shootTargets = [], isMoving = false, obstacleTargets = []) {
    const slot = this.getActiveSlot();
    const config = this.getActiveConfig();
    if (!this.canFire()) {
      // Auto-reload if empty
      if (slot && slot.ammo === 0 && slot.reserve > 0 && !this.isReloading) {
        this.startReload();
      }
      return null;
    }

    // Deduct ammo
    slot.ammo--;
    this.timeSinceLastShot = 0;

    // Apply recoil impulse
    const aimRecoilReduction = this.isAiming ? 0.55 : 1.0;
    this.recoilPitch += config.recoilPitch * aimRecoilReduction;
    this.recoilYaw += (Math.random() - 0.5) * config.recoilYaw * aimRecoilReduction;

    // Play gunshot sound
    if (this.soundManager) {
      this.soundManager.playGunshot(config.type, false, 0);
    }

    // Trigger visual muzzle flash
    this._triggerMuzzleFlash();

    // Calculate spread based on motion and ADS
    let baseSpread = config.spread;
    if (isMoving) baseSpread *= config.spreadMoveMultiplier;
    if (this.isAiming) baseSpread *= 0.35; // Pinpoint in ADS

    const hitResults = [];
    const pellets = config.pellets || 1;

    // Combine shoot targets (bots) and obstacle targets (walls, crates, terrain) for occlusion
    const allQueryTargets = obstacleTargets.length > 0
      ? [...shootTargets, ...obstacleTargets]
      : shootTargets;

    for (let p = 0; p < pellets; p++) {
      // Calculate ray direction with spread bloom
      const spreadX = (Math.random() - 0.5) * baseSpread;
      const spreadY = (Math.random() - 0.5) * baseSpread;

      this._vScreenCoord.set(spreadX, spreadY);
      this.raycaster.setFromCamera(this._vScreenCoord, camera);

      let hitPoint = this.raycaster.ray.origin.clone().add(
        this.raycaster.ray.direction.clone().multiplyScalar(config.range)
      );
      let hitTarget = null;
      let isHeadshot = false;

      if (allQueryTargets.length > 0) {
        const intersects = this.raycaster.intersectObjects(allQueryTargets, true);
        if (intersects.length > 0) {
          const firstHit = intersects[0];
          hitPoint = firstHit.point;

          // Check if object belongs to an entity or a static world obstacle
          let obj = firstHit.object;
          let entity = null;
          while (obj) {
            if (obj.userData && obj.userData.entity) {
              entity = obj.userData.entity;
              break;
            }
            obj = obj.parent;
          }

          // If entity is present and alive, it's a valid target
          if (entity && entity.takeDamage) {
            hitTarget = entity;
            // Check if head hit
            if (firstHit.object.name === 'head' || (firstHit.point.y - entity.position.y) > 1.35) {
              isHeadshot = true;
            }
          }
          // Otherwise it's a wall/terrain obstacle that occludes bullets
        }
      }

      // Spawn visual bullet tracer from weapon muzzle to impact point
      this._spawnTracer(hitPoint);

      // Record hit result
      if (hitTarget) {
        let damage = config.damage;
        if (isHeadshot) damage *= config.headshotMultiplier;
        hitResults.push({
          target: hitTarget,
          damage: Math.round(damage),
          isHeadshot,
          hitPoint
        });
      }
    }

    return {
      weapon: config,
      hits: hitResults
    };
  }

  _triggerMuzzleFlash() {
    if (!this.activeModel) return;
    const flashMesh = this.activeModel.getObjectByName('muzzleFlashMesh');
    if (flashMesh) {
      flashMesh.visible = true;
      flashMesh.rotation.z = Math.random() * Math.PI * 2;
      setTimeout(() => {
        flashMesh.visible = false;
      }, 45);
    }
  }

  _spawnTracer(endPoint) {
    const muzzle = this.activeModel?.getObjectByName('muzzlePoint');
    const startPoint = this._vStartPoint;
    if (muzzle) {
      muzzle.getWorldPosition(startPoint);
    } else {
      startPoint.copy(endPoint).sub(new THREE.Vector3(0, 0, 1));
    }

    const dist = startPoint.distanceTo(endPoint);
    if (dist < 0.5) return;

    // Borrow mesh from pre-allocated tracer pool (Zero GC)
    let tracerMesh;
    if (this.tracerPool.length > 0) {
      tracerMesh = this.tracerPool.pop();
    } else {
      tracerMesh = new THREE.Mesh(this.tracerGeom, this.tracerMaterial);
    }

    tracerMesh.visible = true;
    tracerMesh.position.copy(startPoint);
    tracerMesh.lookAt(endPoint);
    tracerMesh.scale.set(1, 1, Math.min(dist, 12));

    if (!tracerMesh.parent) {
      this.weaponContainer.parent?.add(tracerMesh);
    }

    this.activeTracers.push({
      mesh: tracerMesh,
      start: startPoint.clone(),
      end: endPoint.clone(),
      progress: 0,
      totalDist: dist
    });
  }

  update(delta) {
    this.timeSinceLastShot += delta;
    const config = this.getActiveConfig();
    const slot = this.getActiveSlot();

    // Recoil recovery
    const recoveryRate = config ? config.recoilRecovery : 8.0;
    this.recoilPitch = THREE.MathUtils.lerp(this.recoilPitch, 0, delta * recoveryRate);
    this.recoilYaw = THREE.MathUtils.lerp(this.recoilYaw, 0, delta * recoveryRate);

    // ADS transition
    const adsSpeed = 9.0;
    this.aimTransition = THREE.MathUtils.lerp(
      this.aimTransition,
      this.isAiming ? 1.0 : 0.0,
      delta * adsSpeed
    );

    // Handle reloading sequence
    if (this.isReloading && config && slot) {
      this.reloadProgress += delta / this.reloadDuration;
      if (this.reloadProgress >= 1.0) {
        // Reload complete: calculate ammo transfer
        const needed = config.magazineSize - slot.ammo;
        const available = Math.min(needed, slot.reserve);
        slot.ammo += available;
        slot.reserve -= available;

        this.isReloading = false;
        this.reloadProgress = 0;
      }
    }

    // Update active bullet tracers
    for (let i = this.activeTracers.length - 1; i >= 0; i--) {
      const tracer = this.activeTracers[i];
      tracer.progress += delta * 14.0;
      if (tracer.progress >= 1.0) {
        tracer.mesh.visible = false;
        this.tracerPool.push(tracer.mesh);
        this.activeTracers.splice(i, 1);
      } else {
        tracer.mesh.position.lerpVectors(tracer.start, tracer.end, tracer.progress);
        const remainingScale = Math.min(tracer.totalDist, 12) * (1 - tracer.progress * 0.4);
        tracer.mesh.scale.set(1, 1, Math.max(0.1, remainingScale));
      }
    }

    // Subtle weapon sway / breathing / ADS offset
    if (this.activeModel) {
      if (this.aimTransition > 0.01) {
        // ADS position: aligned with camera center
        this.activeModel.position.set(
          THREE.MathUtils.lerp(0.22, 0.0, this.aimTransition),
          THREE.MathUtils.lerp(-0.24, -0.16, this.aimTransition),
          THREE.MathUtils.lerp(-0.45, -0.32, this.aimTransition)
        );
      } else {
        // Hip-fire position: off to right shoulder
        this.activeModel.position.set(0.24, -0.25, -0.48);
      }

      // Add recoil kick to weapon model
      this.activeModel.position.z += this.recoilPitch * 0.4;
      this.activeModel.rotation.x = this.recoilPitch * 0.8;
      this.activeModel.rotation.y = this.recoilYaw * 0.8;
    }
  }
}
