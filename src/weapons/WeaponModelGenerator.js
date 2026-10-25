// src/weapons/WeaponModelGenerator.js
// Procedural low-poly 3D weapon models optimized for high FPS and mobile rendering

import * as THREE from 'three';

export class WeaponModelGenerator {
  // Shared materials for memory efficiency and fast rendering
  static getMaterials() {
    if (!WeaponModelGenerator._materials) {
      WeaponModelGenerator._materials = {
        gunmetal: new THREE.MeshLambertMaterial({ color: 0x222629 }),
        darkMetal: new THREE.MeshLambertMaterial({ color: 0x111315 }),
        gripWood: new THREE.MeshLambertMaterial({ color: 0x5a3825 }),
        camoGreen: new THREE.MeshLambertMaterial({ color: 0x3d4a34 }),
        accentOrange: new THREE.MeshLambertMaterial({ color: 0xd35400 }),
        accentGold: new THREE.MeshLambertMaterial({ color: 0xc0392b }),
        scopeLens: new THREE.MeshBasicMaterial({ color: 0x00e1d9 }),
        muzzleFlash: new THREE.MeshBasicMaterial({
          color: 0xffaa00,
          transparent: true,
          opacity: 0.85
        })
      };
    }
    return WeaponModelGenerator._materials;
  }

  static createModel(weaponId) {
    const mats = WeaponModelGenerator.getMaterials();
    const group = new THREE.Group();

    switch (weaponId) {
      case 'kavach_ar':
        WeaponModelGenerator._buildAR(group, mats);
        break;
      case 'garuda_smg':
        WeaponModelGenerator._buildSMG(group, mats);
        break;
      case 'trishul_12':
        WeaponModelGenerator._buildShotgun(group, mats);
        break;
      case 'brahmos_sr':
        WeaponModelGenerator._buildSniper(group, mats);
        break;
      case 'agni_9':
      default:
        WeaponModelGenerator._buildPistol(group, mats);
        break;
    }

    // Add a muzzle point reference for projectile/tracer spawns and muzzle flash
    const muzzlePoint = new THREE.Object3D();
    muzzlePoint.name = 'muzzlePoint';
    group.add(muzzlePoint);

    // Muzzle flash mesh (normally invisible, toggled when firing)
    const flashGeom = new THREE.ConeGeometry(0.06, 0.22, 5);
    flashGeom.rotateX(Math.PI / 2);
    const flashMesh = new THREE.Mesh(flashGeom, mats.muzzleFlash);
    flashMesh.name = 'muzzleFlashMesh';
    flashMesh.visible = false;
    muzzlePoint.add(flashMesh);

    group.castShadow = false;
    group.receiveShadow = false;
    return group;
  }

  // KAVACH-AR: Assault Rifle
  static _buildAR(group, mats) {
    // Receiver
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), mats.gunmetal);
    body.position.set(0, 0, 0);
    group.add(body);

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), mats.darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, 0.42);
    group.add(barrel);

    // Handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.25), mats.camoGreen);
    handguard.position.set(0, 0.02, 0.3);
    group.add(handguard);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.28), mats.darkMetal);
    stock.position.set(0, -0.02, -0.36);
    group.add(stock);

    // Curved magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.1), mats.gunmetal);
    mag.rotation.x = 0.22;
    mag.position.set(0, -0.16, 0.08);
    group.add(mag);

    // Pistol grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), mats.gripWood);
    grip.rotation.x = -0.3;
    grip.position.set(0, -0.12, -0.15);
    group.add(grip);

    // Red dot sight
    const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.12), mats.darkMetal);
    sightBase.position.set(0, 0.075, 0.02);
    const sightLens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 6), mats.gunmetal);
    sightLens.rotation.x = Math.PI / 2;
    sightLens.position.set(0, 0.11, 0.02);
    group.add(sightBase);
    group.add(sightLens);

    // Muzzle position
    const muzzle = group.getObjectByName('muzzlePoint');
    if (muzzle) muzzle.position.set(0, 0.03, 0.62);
  }

  // GARUDA-SMG: Submachine Gun
  static _buildSMG(group, mats) {
    // Compact receiver
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.36), mats.gunmetal);
    body.position.set(0, 0, 0);
    group.add(body);

    // Short barrel with compensator
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 6), mats.darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.26);
    group.add(barrel);

    // Straight stick magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.26, 0.06), mats.accentOrange);
    mag.position.set(0, -0.16, 0.06);
    group.add(mag);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.06), mats.darkMetal);
    grip.rotation.x = -0.25;
    grip.position.set(0, -0.1, -0.1);
    group.add(grip);

    // Wire stock
    const stockBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.2), mats.darkMetal);
    stockBar.position.set(0, -0.01, -0.25);
    group.add(stockBar);

    // Iron sights
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.02), mats.darkMetal);
    frontSight.position.set(0, 0.065, 0.16);
    group.add(frontSight);

    const muzzle = group.getObjectByName('muzzlePoint');
    if (muzzle) muzzle.position.set(0, 0.02, 0.38);
  }

  // TRISHUL-12: Shotgun
  static _buildShotgun(group, mats) {
    // Heavy receiver
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.45), mats.gunmetal);
    body.position.set(0, 0, 0);
    group.add(body);

    // Dual tube barrel
    const mainBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), mats.darkMetal);
    mainBarrel.rotation.x = Math.PI / 2;
    mainBarrel.position.set(0, 0.035, 0.4);
    group.add(mainBarrel);

    const tubeMag = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), mats.gunmetal);
    tubeMag.rotation.x = Math.PI / 2;
    tubeMag.position.set(0, -0.015, 0.38);
    group.add(tubeMag);

    // Pump slide
    const pumpGrip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.18), mats.gripWood);
    pumpGrip.position.set(0, -0.015, 0.32);
    group.add(pumpGrip);

    // Solid wood/composite stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.15, 0.32), mats.gripWood);
    stock.position.set(0, -0.04, -0.34);
    group.add(stock);

    const muzzle = group.getObjectByName('muzzlePoint');
    if (muzzle) muzzle.position.set(0, 0.035, 0.65);
  }

  // BRAHMOS-SR: Sniper Rifle
  static _buildSniper(group, mats) {
    // Heavy long receiver
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.6), mats.gunmetal);
    body.position.set(0, 0, 0);
    group.add(body);

    // Extended precision fluted barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.75, 6), mats.darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, 0.65);
    group.add(barrel);

    // Large muzzle brake
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.1), mats.accentGold);
    brake.position.set(0, 0.03, 1.05);
    group.add(brake);

    // Heavy sniper stock with cheek pad
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.4), mats.camoGreen);
    stock.position.set(0, -0.04, -0.46);
    group.add(stock);

    // Telescopic optical scope
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), mats.darkMetal);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.13, 0.02);
    group.add(scopeTube);

    // Scope front bell
    const scopeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.035, 0.08, 8), mats.gunmetal);
    scopeFront.rotation.x = Math.PI / 2;
    scopeFront.position.set(0, 0.13, 0.2);
    group.add(scopeFront);

    // Scope lens
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.044, 8), mats.scopeLens);
    lens.position.set(0, 0.13, 0.241);
    group.add(lens);

    // Bolt handle
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.03), mats.darkMetal);
    bolt.position.set(0.06, 0.04, -0.1);
    group.add(bolt);

    // Mag
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.15, 0.1), mats.darkMetal);
    mag.position.set(0, -0.12, 0.05);
    group.add(mag);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.07), mats.darkMetal);
    grip.rotation.x = -0.3;
    grip.position.set(0, -0.13, -0.2);
    group.add(grip);

    const muzzle = group.getObjectByName('muzzlePoint');
    if (muzzle) muzzle.position.set(0, 0.03, 1.12);
  }

  // AGNI-9: Tactical Pistol
  static _buildPistol(group, mats) {
    // Slide
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.065, 0.26), mats.gunmetal);
    slide.position.set(0, 0.05, 0.04);
    group.add(slide);

    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.22), mats.darkMetal);
    frame.position.set(0, 0, 0.02);
    group.add(frame);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), mats.camoGreen);
    grip.rotation.x = -0.28;
    grip.position.set(0, -0.08, -0.06);
    group.add(grip);

    // Trigger guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.07), mats.darkMetal);
    guard.position.set(0, -0.04, 0.03);
    group.add(guard);

    const muzzle = group.getObjectByName('muzzlePoint');
    if (muzzle) muzzle.position.set(0, 0.05, 0.18);
  }
}
