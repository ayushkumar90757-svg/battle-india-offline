// src/environment/LootManager.js
// Handles 3D world pickups: weapons, ammo boxes, and medkits

import * as THREE from 'three';
import { WEAPON_CONFIGS } from '../weapons/WeaponConfig.js';
import { WeaponModelGenerator } from '../weapons/WeaponModelGenerator.js';

export class LootManager {
  constructor(scene, soundManager) {
    this.scene = scene;
    this.soundManager = soundManager;
    this.lootItems = []; // Active loot objects { id, type, weaponId, mesh, position, count }
    this.autoPickup = localStorage.getItem('bio_autopickup') !== 'false';

    this._initMaterials();
  }

  _initMaterials() {
    this.mats = {
      ammoBox: new THREE.MeshLambertMaterial({ color: 0x34495e }),
      ammoDecal: new THREE.MeshBasicMaterial({ color: 0xf39c12 }),
      medkitBase: new THREE.MeshLambertMaterial({ color: 0xecf0f1 }),
      medkitCross: new THREE.MeshBasicMaterial({ color: 0xe74c3c }),
      beaconGlow: new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      })
    };
  }

  populateMap(spawnPoints = []) {
    // Clear and dispose existing loot
    this.lootItems.forEach(item => {
      item.mesh.traverse(child => {
        if (child.isMesh) {
          child.geometry?.dispose();
        }
      });
      this.scene.remove(item.mesh);
    });
    this.lootItems = [];

    spawnPoints.forEach((sp, idx) => {
      const type = sp.preferredType || 'kavach_ar';
      this.spawnItem(type, sp.position, idx);
    });
  }

  spawnItem(type, position, index = 0) {
    const group = new THREE.Group();
    group.position.copy(position);

    let itemData = {
      id: `loot_${index}_${Date.now()}`,
      type: 'weapon',
      weaponId: null,
      ammoType: null,
      count: 1,
      mesh: group,
      position: position.clone(),
      name: 'Item'
    };

    if (WEAPON_CONFIGS[type]) {
      // Weapon Pickup
      const cfg = WEAPON_CONFIGS[type];
      const weaponMesh = WeaponModelGenerator.createModel(type);
      weaponMesh.scale.set(1.4, 1.4, 1.4);
      weaponMesh.rotation.x = 0.2;
      group.add(weaponMesh);

      itemData.type = 'weapon';
      itemData.weaponId = type;
      itemData.name = cfg.name;
    } else if (type.startsWith('ammo_')) {
      // Ammo Box
      const ammoType = type.replace('ammo_', '');
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), this.mats.ammoBox);
      const topStripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.42), this.mats.ammoDecal);
      group.add(box);
      group.add(topStripe);

      itemData.type = 'ammo';
      itemData.ammoType = ammoType;
      itemData.count = ammoType === 'shotgun' ? 12 : 45;
      itemData.name = `${ammoType.toUpperCase()} Ammo (+${itemData.count})`;
    } else if (type === 'medkit') {
      // First Aid Medkit
      const kit = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.25), this.mats.medkitBase);
      // Red Cross
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.02), this.mats.medkitCross);
      crossV.position.z = 0.13;
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.02), this.mats.medkitCross);
      crossH.position.z = 0.13;

      group.add(kit);
      group.add(crossV);
      group.add(crossH);

      itemData.type = 'medkit';
      itemData.count = 1;
      itemData.name = 'Tactical Medkit';
    }

    // Glowing ground circle indicator
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.65, 16),
      this.mats.beaconGlow
    );
    glowRing.rotateX(-Math.PI / 2);
    glowRing.position.y = -0.35;
    group.add(glowRing);

    this.scene.add(group);
    this.lootItems.push(itemData);
  }

  update(delta, player, weaponManager) {
    // Subtle rotation and float animation for all items
    const time = Date.now() * 0.002;
    for (let i = 0; i < this.lootItems.length; i++) {
      const item = this.lootItems[i];
      item.mesh.rotation.y += delta * 1.5;
      item.mesh.position.y = item.position.y + Math.sin(time + i) * 0.12;
    }

    if (!player || !player.isAlive) return null;

    // Check proximity to player
    let closestItem = null;
    let minDistance = 2.4;

    for (let i = 0; i < this.lootItems.length; i++) {
      const item = this.lootItems[i];
      const dist = player.position.distanceTo(item.position);

      if (dist < minDistance) {
        minDistance = dist;
        closestItem = item;
      }
    }

    return closestItem;
  }

  collectItem(item, player, weaponManager) {
    if (!item) return false;

    let collected = false;

    if (item.type === 'weapon') {
      // Find empty slot or replace current primary
      const targetSlot = weaponManager.activeSlotIndex <= 1 ? weaponManager.activeSlotIndex : 0;
      weaponManager.equipWeapon(targetSlot, item.weaponId);
      collected = true;
    } else if (item.type === 'ammo') {
      weaponManager.addAmmo(item.ammoType, item.count);
      collected = true;
    } else if (item.type === 'medkit') {
      if (player.medkits < 5) {
        player.medkits++;
        collected = true;
      }
    }

    if (collected) {
      if (this.soundManager) {
        this.soundManager.playPickup();
      }

      // Remove from scene and list
      this.scene.remove(item.mesh);
      const idx = this.lootItems.indexOf(item);
      if (idx !== -1) {
        this.lootItems.splice(idx, 1);
      }
      return true;
    }

    return false;
  }
}
