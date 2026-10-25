// src/entities/CharacterModel.js
// Procedural low-poly rigged character model with running, crouch, aim, and death animations

import * as THREE from 'three';

export class CharacterModel {
  static _materialsCache = null;

  static getSharedMaterials() {
    if (!CharacterModel._materialsCache) {
      CharacterModel._materialsCache = {
        // Player: Indian Commando Desert Sand / Camo Green
        playerCamo: new THREE.MeshLambertMaterial({ color: 0x556b2f }), // Olive drab
        playerVest: new THREE.MeshLambertMaterial({ color: 0x2f3e22 }), // Dark tactical vest
        playerSkin: new THREE.MeshLambertMaterial({ color: 0xb58a63 }), // Skin tone
        playerHelmet: new THREE.MeshLambertMaterial({ color: 0x3d4a34 }), // Helmet
        playerBoots: new THREE.MeshLambertMaterial({ color: 0x1a1a1a }), // Black boots
        playerBadge: new THREE.MeshBasicMaterial({ color: 0xff9933 }), // Tricolor saffron accent

        // Bot variations (Urban Grey, Commando Dark, Crimson Renegade)
        botVest1: new THREE.MeshLambertMaterial({ color: 0x4a5568 }), // Urban grey
        botVest2: new THREE.MeshLambertMaterial({ color: 0x8b0000 }), // Crimson
        botVest3: new THREE.MeshLambertMaterial({ color: 0x2d3748 }), // Midnight navy
        botHelmet: new THREE.MeshLambertMaterial({ color: 0x222222 }),
        botSkin: new THREE.MeshLambertMaterial({ color: 0xa87c53 }),
        botBoots: new THREE.MeshLambertMaterial({ color: 0x111111 }),

        // Hit indicator flash material
        hitFlash: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
      };
    }
    return CharacterModel._materialsCache;
  }

  constructor(isPlayer = false, botVariation = 0) {
    this.isPlayer = isPlayer;
    this.group = new THREE.Group();
    this.group.name = isPlayer ? 'player_character' : 'bot_character';

    // Animation tracking
    this.walkCycle = 0;
    this.isCrouching = false;
    this.isDead = false;
    this.deathProgress = 0;

    // Body parts for animation
    this.parts = {};

    this._buildMesh(botVariation);
  }

  _buildMesh(botVariation) {
    const mats = CharacterModel.getSharedMaterials();
    const vestMat = this.isPlayer
      ? mats.playerVest
      : [mats.botVest1, mats.botVest2, mats.botVest3][botVariation % 3];
    const helmetMat = this.isPlayer ? mats.playerHelmet : mats.botHelmet;
    const skinMat = this.isPlayer ? mats.playerSkin : mats.botSkin;
    const bootsMat = this.isPlayer ? mats.playerBoots : mats.botBoots;
    const pantsMat = this.isPlayer ? mats.playerCamo : mats.botVest1;

    // Root pivot for crouching
    const root = new THREE.Group();
    root.name = 'root';
    this.group.add(root);
    this.parts.root = root;

    // Pelvis / Hips
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.24), pantsMat);
    pelvis.position.y = 0.88;
    root.add(pelvis);
    this.parts.pelvis = pelvis;

    // Torso with tactical vest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.28), vestMat);
    torso.position.y = 1.22;
    root.add(torso);
    this.parts.torso = torso;

    // Indian flag patch / squad badge on player chest
    if (this.isPlayer) {
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.02), mats.playerBadge);
      badge.position.set(0.12, 1.32, 0.15);
      root.add(badge);
    }

    // Tactical Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 6), skinMat);
    neck.position.y = 1.5;
    root.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.62, 0);
    headGroup.name = 'head';
    root.add(headGroup);
    this.parts.head = headGroup;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
    head.name = 'head_box';
    headGroup.add(head);

    // Tactical Helmet
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.28), helmetMat);
    helmet.position.set(0, 0.08, 0);
    headGroup.add(helmet);

    // Visor / Goggles
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x111111 })
    );
    visor.position.set(0, 0.02, 0.13);
    headGroup.add(visor);

    // Left Arm
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.28, 1.4, 0);
    root.add(leftArmPivot);
    this.parts.leftArm = leftArmPivot;

    const leftArmUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.12), vestMat);
    leftArmUpper.position.y = -0.16;
    leftArmPivot.add(leftArmUpper);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.1), skinMat);
    leftHand.position.set(0, -0.36, 0.08);
    leftArmPivot.add(leftHand);

    // Right Arm (Weapon holding arm)
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.28, 1.4, 0);
    root.add(rightArmPivot);
    this.parts.rightArm = rightArmPivot;

    const rightArmUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.12), vestMat);
    rightArmUpper.position.y = -0.16;
    rightArmPivot.add(rightArmUpper);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.1), skinMat);
    rightHand.position.set(0, -0.36, 0.08);
    rightArmPivot.add(rightHand);

    // Character Weapon Mesh held in hands (simplified weapon proxy)
    const gunProxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.48),
      new THREE.MeshLambertMaterial({ color: 0x1c1c1c })
    );
    gunProxy.position.set(-0.12, -0.28, 0.28);
    rightArmPivot.add(gunProxy);
    this.parts.heldGun = gunProxy;

    // Left Leg
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.13, 0.85, 0);
    root.add(leftLegPivot);
    this.parts.leftLeg = leftLegPivot;

    const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.45, 0.16), pantsMat);
    leftThigh.position.y = -0.22;
    leftLegPivot.add(leftThigh);

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.22), bootsMat);
    leftBoot.position.set(0, -0.62, 0.03);
    leftLegPivot.add(leftBoot);

    // Right Leg
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.13, 0.85, 0);
    root.add(rightLegPivot);
    this.parts.rightLeg = rightLegPivot;

    const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.45, 0.16), pantsMat);
    rightThigh.position.y = -0.22;
    rightLegPivot.add(rightThigh);

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.22), bootsMat);
    rightBoot.position.set(0, -0.62, 0.03);
    rightLegPivot.add(rightBoot);

    // Performance: low shadow cost
    this.group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });
  }

  setCrouching(crouch) {
    this.isCrouching = crouch;
  }

  triggerDeath() {
    this.isDead = true;
    this.deathProgress = 0;
  }

  flashHit() {
    const mats = CharacterModel.getSharedMaterials();
    this.group.traverse(child => {
      if (child.isMesh && child.material !== mats.playerBadge) {
        const origMat = child.material;
        child.material = mats.hitFlash;
        setTimeout(() => {
          child.material = origMat;
        }, 65);
      }
    });
  }

  updateAnimation(delta, moveSpeed, isGrounded = true, aimPitch = 0) {
    if (this.isDead) {
      // Death collapse animation
      if (this.deathProgress < 1.0) {
        this.deathProgress += delta * 2.5;
        const p = Math.min(1.0, this.deathProgress);
        this.group.rotation.x = p * (Math.PI / 2.2);
        this.group.position.y = -p * 0.7;
      }
      return;
    }

    // Crouch height adjustment
    const targetRootY = this.isCrouching ? -0.45 : 0;
    this.parts.root.position.y = THREE.MathUtils.lerp(
      this.parts.root.position.y,
      targetRootY,
      delta * 12.0
    );

    // Walking / Running leg and arm swing
    if (moveSpeed > 0.1 && isGrounded) {
      const cycleSpeed = moveSpeed * 3.8;
      this.walkCycle += delta * cycleSpeed;

      const swingAngle = Math.sin(this.walkCycle) * 0.65;
      this.parts.leftLeg.rotation.x = swingAngle;
      this.parts.rightLeg.rotation.x = -swingAngle;

      // Arm counter swing
      this.parts.leftArm.rotation.x = -swingAngle * 0.75 - 0.2;
      this.parts.rightArm.rotation.x = swingAngle * 0.45 - 0.35;
    } else {
      // Idle pose with subtle breathing
      this.walkCycle += delta * 1.5;
      const breath = Math.sin(this.walkCycle) * 0.03;

      this.parts.leftLeg.rotation.x = THREE.MathUtils.lerp(this.parts.leftLeg.rotation.x, 0, delta * 10);
      this.parts.rightLeg.rotation.x = THREE.MathUtils.lerp(this.parts.rightLeg.rotation.x, 0, delta * 10);

      this.parts.leftArm.rotation.x = -0.25 + breath;
      this.parts.rightArm.rotation.x = -0.45 - breath;
      this.parts.torso.position.y = 1.22 + breath * 0.3;
    }

    // Aim pitch (torso/head angle follows crosshair up/down)
    if (this.parts.torso) {
      this.parts.torso.rotation.x = aimPitch * 0.6;
    }
    if (this.parts.head) {
      this.parts.head.rotation.x = aimPitch * 0.4;
    }
  }
}
