// src/entities/Player.js
// Third-person player entity with movement physics, health, camera follow, and collision handling

import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';

export class Player {
  constructor(scene, camera, islandMap) {
    this.scene = scene;
    this.camera = camera;
    this.map = islandMap;

    // Attributes
    this.maxHealth = 100;
    this.health = 100;
    this.maxArmor = 100;
    this.armor = 50;
    this.medkits = 2;
    this.isAlive = true;
    this.kills = 0;
    this.damageDealt = 0;

    // Position and Physics
    this.position = new THREE.Vector3(0, 5, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.moveSpeed = 6.8; // m/s
    this.sprintMultiplier = 1.0;
    this.jumpForce = 7.5;
    this.gravity = 19.5;
    this.isGrounded = false;
    this.isCrouching = false;

    // Camera angles
    this.yaw = 0; // Horizontal rotation (radians)
    this.pitch = 0.05; // Vertical rotation (radians)
    this.minPitch = -Math.PI / 2.5; // Look up limit
    this.maxPitch = Math.PI / 2.6; // Look down limit

    // Camera offset (Third-person shoulder view)
    this.cameraDistance = 3.2;
    this.cameraHeight = 1.65;
    this.shoulderOffset = 0.65;

    // Pre-allocated vectors to prevent GC allocations
    this._vForward = new THREE.Vector3();
    this._vRight = new THREE.Vector3();
    this._vMoveDir = new THREE.Vector3();
    this._vTargetLookAt = new THREE.Vector3();
    this._vDesiredCamPos = new THREE.Vector3();
    this._vCamOffset = new THREE.Vector3();
    this._camRaycaster = new THREE.Raycaster();

    // Medkit usage state
    this.isHealing = false;
    this.healProgress = 0;
    this.healDuration = 3.0;

    // Character 3D model
    this.characterModel = new CharacterModel(true);
    this.scene.add(this.characterModel.group);

    // Provide entity back-reference for hit detection
    this.characterModel.group.userData = { entity: this };

    // Set spawn point on safe terrain
    this.respawn(new THREE.Vector3(-15, 0, -15));
  }

  respawn(spawnPos) {
    const terrainY = this.map.getTerrainHeight(spawnPos.x, spawnPos.z);
    this.position.set(spawnPos.x, terrainY + 0.1, spawnPos.z);
    this.velocity.set(0, 0, 0);
    this.health = 100;
    this.armor = 50;
    this.medkits = 2;
    this.isAlive = true;
    this.kills = 0;
    this.damageDealt = 0;
    this.isHealing = false;
    this.healProgress = 0;
    this.yaw = 0;
    this.pitch = 0.05;
    this.characterModel.deathProgress = 0;
    this.characterModel.isDead = false;
    this.characterModel.group.rotation.set(0, 0, 0);
    this.characterModel.group.position.set(this.position.x, this.position.y, this.position.z);
  }

  takeDamage(amount, attacker = null, source = 'bullet') {
    if (!this.isAlive) return;

    // Absorb with armor first (60% to armor, 40% to health)
    if (this.armor > 0 && source !== 'zone') {
      const armorAbsorb = Math.min(this.armor, amount * 0.6);
      this.armor -= armorAbsorb;
      amount -= armorAbsorb;
    }

    this.health = Math.max(0, this.health - amount);
    this.characterModel.flashHit();

    if (this.health <= 0) {
      this.die(attacker);
    }
  }

  heal() {
    if (this.health >= this.maxHealth || this.medkits <= 0 || this.isHealing) return false;
    this.isHealing = true;
    this.healProgress = 0;
    return true;
  }

  die(killer = null) {
    this.isAlive = false;
    this.health = 0;
    this.characterModel.triggerDeath();
  }

  update(delta, input, weaponManager) {
    if (!this.isAlive) {
      this.characterModel.updateAnimation(delta, 0, true, 0);
      return;
    }

    // 1. Process Look Angles from Input
    const { dx, dy } = input.consumeLookDeltas();
    this.yaw -= dx; // Turn left / right
    this.pitch -= dy; // Tilt up / down
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));

    // 2. Handle Crouch Toggle
    this.isCrouching = input.isCrouching;
    this.characterModel.setCrouching(this.isCrouching);

    // 3. Handle Medkit Healing
    if (input.consumeMedkit()) {
      this.heal();
    }
    if (this.isHealing) {
      this.healProgress += delta / this.healDuration;
      if (this.healProgress >= 1.0) {
        this.health = Math.min(this.maxHealth, this.health + 50);
        this.medkits--;
        this.isHealing = false;
        this.healProgress = 0;
      }
    }

    // 4. Movement Vectors (Strictly non-inverted)
    // Forward direction on X-Z plane
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const forward = new THREE.Vector3(-sinYaw, 0, -cosYaw).normalize();
    const right = new THREE.Vector3(cosYaw, 0, -sinYaw).normalize();

    const moveDir = new THREE.Vector3(0, 0, 0);
    // input.moveForward: +1 (W/Up), -1 (S/Down)
    // input.moveRight: +1 (D/Right), -1 (A/Left)
    moveDir.addScaledVector(forward, input.moveForward);
    moveDir.addScaledVector(right, input.moveRight);

    let speed = this.moveSpeed;
    if (this.isCrouching) speed *= 0.55;
    if (weaponManager && weaponManager.isAiming) speed *= 0.65;

    const moveLength = moveDir.length();
    if (moveLength > 0.01) {
      moveDir.normalize();
      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // 5. Jump & Gravity
    if (input.isJumping && this.isGrounded && !this.isCrouching) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    this.velocity.y -= this.gravity * delta;

    // 6. Integrate Position with Terrain & Obstacle Collision
    const nextX = this.position.x + this.velocity.x * delta;
    const nextZ = this.position.z + this.velocity.z * delta;

    // Check obstacle collision in X
    if (!this.map.checkCollision(new THREE.Vector3(nextX, this.position.y, this.position.z))) {
      this.position.x = nextX;
    } else {
      this.velocity.x = 0;
    }

    // Check obstacle collision in Z
    if (!this.map.checkCollision(new THREE.Vector3(this.position.x, this.position.y, nextZ))) {
      this.position.z = nextZ;
    } else {
      this.velocity.z = 0;
    }

    // Apply Vertical Movement & Terrain Floor Check
    this.position.y += this.velocity.y * delta;
    const terrainFloor = this.map.getTerrainHeight(this.position.x, this.position.z);

    if (this.position.y <= terrainFloor) {
      this.position.y = terrainFloor;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Island Boundary Clamp
    const distFromCenter = Math.hypot(this.position.x, this.position.z);
    if (distFromCenter > 138) {
      const angle = Math.atan2(this.position.z, this.position.x);
      this.position.x = Math.cos(angle) * 138;
      this.position.z = Math.sin(angle) * 138;
    }

    // 7. Update 3D Character Model Position & Heading
    this.characterModel.group.position.set(this.position.x, this.position.y, this.position.z);
    this.characterModel.group.rotation.y = this.yaw;
    this.characterModel.updateAnimation(delta, moveLength * speed, this.isGrounded, this.pitch);

    // 8. Third-Person Over-the-Shoulder Camera Follow
    this._updateCamera(weaponManager);
  }

  _updateCamera(weaponManager) {
    const isAds = weaponManager && weaponManager.isAiming;
    const adsDist = isAds ? 1.4 : this.cameraDistance;
    const adsHeight = isAds ? 1.55 : this.cameraHeight;
    const adsShoulder = isAds ? 0.45 : this.shoulderOffset;

    // Eye pivot origin at player shoulder
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const shoulderRightX = cosYaw * adsShoulder;
    const shoulderRightZ = -sinYaw * adsShoulder;

    const targetLookAt = this._vTargetLookAt.set(
      this.position.x + shoulderRightX,
      this.position.y + adsHeight,
      this.position.z + shoulderRightZ
    );

    // Camera offset position behind shoulder based on yaw and pitch
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    const camOffsetX = sinYaw * cosPitch;
    const camOffsetY = sinPitch;
    const camOffsetZ = cosYaw * cosPitch;

    let currentDist = adsDist;

    // Camera wall collision prevention: raycast backwards from shoulder to desired camera pos
    const obstacles = this.map ? this.map.getObstacleMeshes() : [];
    if (obstacles.length > 0) {
      this._vCamOffset.set(camOffsetX, camOffsetY, camOffsetZ);
      this._camRaycaster.set(targetLookAt, this._vCamOffset);
      this._camRaycaster.far = adsDist;

      const hits = this._camRaycaster.intersectObjects(obstacles, true);
      if (hits.length > 0 && hits[0].distance < adsDist) {
        currentDist = Math.max(0.65, hits[0].distance - 0.25);
      }
    }

    const desiredCamPos = this._vDesiredCamPos.set(
      targetLookAt.x + camOffsetX * currentDist,
      targetLookAt.y + camOffsetY * currentDist,
      targetLookAt.z + camOffsetZ * currentDist
    );

    // Prevent camera clipping through ground
    const terrainHeightAtCam = this.map.getTerrainHeight(desiredCamPos.x, desiredCamPos.z);
    if (desiredCamPos.y < terrainHeightAtCam + 0.3) {
      desiredCamPos.y = terrainHeightAtCam + 0.3;
    }

    this.camera.position.copy(desiredCamPos);
    this.camera.lookAt(
      targetLookAt.x - sinYaw * 50 * cosPitch,
      targetLookAt.y - sinPitch * 50,
      targetLookAt.z - cosYaw * 50 * cosPitch
    );

    // Adjust camera FOV during ADS (zoom)
    const activeConfig = weaponManager?.getActiveConfig();
    const targetFov = isAds ? (activeConfig?.zoomFov || 40) : 65;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.2);
    this.camera.updateProjectionMatrix();

    // Attach weapon container to camera for crisp viewmodel positioning
    if (weaponManager && weaponManager.weaponContainer.parent !== this.camera) {
      this.camera.add(weaponManager.weaponContainer);
    }
  }
}
