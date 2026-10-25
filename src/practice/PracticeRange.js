// src/practice/PracticeRange.js
// Dedicated offline shooting range with static and moving target dummies, weapon racks, and damage stats

import * as THREE from 'three';

export class PracticeRange {
  constructor(scene, soundManager) {
    this.scene = scene;
    this.soundManager = soundManager;
    this.targets = [];
    this.targetObjects = [];
    this.damageTexts = [];

    this._setupTargets();
  }

  _setupTargets() {
    const distances = [15, 30, 50, 75];

    // Shared target materials
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
    const bullseyeMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    const headMat = new THREE.MeshLambertMaterial({ color: 0x34495e });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });

    distances.forEach((dist, idx) => {
      // 2 Targets per distance line (one static, one moving)
      const offsets = [-4, 4];
      offsets.forEach((xOffset, oIdx) => {
        const group = new THREE.Group();
        const baseZ = -dist;
        const baseX = xOffset;
        group.position.set(baseX, 1.5, baseZ);

        // Stand pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), poleMat);
        pole.position.y = -0.7;
        group.add(pole);

        // Silhouette Body
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.12), bodyMat);
        group.add(torso);

        // Bullseye Red Circle
        const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 16), bullseyeMat);
        bullseye.rotation.x = Math.PI / 2;
        group.add(bullseye);

        // Silhouette Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.12), headMat);
        head.name = 'head';
        head.position.y = 0.65;
        group.add(head);

        // Distance text billboard on base
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${dist}m`, 32, 22);

        const textTex = new THREE.CanvasTexture(canvas);
        const distSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex }));
        distSprite.position.set(0, -1.3, 0);
        distSprite.scale.set(1.2, 0.6, 1);
        group.add(distSprite);

        const targetData = {
          group,
          isMoving: oIdx === 1,
          moveCenter: baseX,
          moveRange: 3.5,
          moveSpeed: 1.8 + idx * 0.4,
          movePhase: idx * 1.5,
          baseZ,
          health: 100,
          maxHealth: 100,
          takeDamage: (amount, attacker) => {
            if (this.soundManager) {
              this.soundManager.playHitMarker(amount > 40);
            }
            // Flash effect
            torso.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            setTimeout(() => {
              torso.material = bodyMat;
            }, 60);
          }
        };

        group.userData = { entity: targetData };
        this.scene.add(group);
        this.targets.push(targetData);
        this.targetObjects.push(group);
      });
    });
  }

  update(delta) {
    const time = Date.now() * 0.001;
    for (let i = 0; i < this.targets.length; i++) {
      const t = this.targets[i];
      if (t.isMoving) {
        t.group.position.x = t.moveCenter + Math.sin(time * t.moveSpeed + t.movePhase) * t.moveRange;
      }
    }
  }

  getShootableObjects() {
    return this.targetObjects;
  }

  cleanup() {
    this.targetObjects.forEach(obj => {
      obj.traverse(child => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        } else if (child.isSprite) {
          child.material?.map?.dispose();
          child.material?.dispose();
        }
      });
      this.scene.remove(obj);
    });
    this.targets = [];
    this.targetObjects = [];
  }
}
