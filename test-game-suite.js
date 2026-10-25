// Automated Test & Validation Suite for Battle India Offline
import * as THREE from 'three';
import { WEAPON_CONFIGS } from './src/weapons/WeaponConfig.js';
import { WeaponModelGenerator } from './src/weapons/WeaponModelGenerator.js';
import { ObjectPool } from './src/engine/ObjectPool.js';
import { IslandMap } from './src/environment/IslandMap.js';
import { SafeZone } from './src/environment/SafeZone.js';
import { CharacterModel } from './src/entities/CharacterModel.js';

console.log('--- STARTING COMPREHENSIVE TEST SUITE ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 1. Weapon Configs Test
console.log('\n[1] Testing Weapon Configs...');
const expectedWeapons = ['kavach_ar', 'garuda_smg', 'trishul_12', 'brahmos_sr', 'agni_9'];
expectedWeapons.forEach(wId => {
  const cfg = WEAPON_CONFIGS[wId];
  assert(cfg !== undefined, `Weapon ${wId} is properly defined`);
  assert(cfg.damage > 0, `${wId} has positive damage (${cfg.damage})`);
  assert(cfg.magazineSize > 0, `${wId} has valid magazine size (${cfg.magazineSize})`);
  assert(cfg.fireRate > 0, `${wId} has valid fire rate (${cfg.fireRate}s)`);
});

// 2. Weapon Model Generator & Muzzle Positioning Test
console.log('\n[2] Testing Weapon 3D Models & Muzzle Alignment...');
expectedWeapons.forEach(wId => {
  const model = WeaponModelGenerator.createModel(wId);
  assert(model instanceof THREE.Group, `Model ${wId} creates valid THREE.Group`);
  const muzzle = model.getObjectByName('muzzlePoint');
  assert(muzzle !== undefined, `Model ${wId} has muzzlePoint Object3D`);
  assert(muzzle.position.z > 0, `Model ${wId} muzzle is positioned at barrel tip (z=${muzzle.position.z.toFixed(2)})`);
  const flash = muzzle.getObjectByName('muzzleFlashMesh');
  assert(flash !== undefined, `Model ${wId} has muzzleFlashMesh attached`);
});

// 3. Object Pool Test
console.log('\n[3] Testing Object Pool...');
let createdCount = 0;
const pool = new ObjectPool(() => {
  createdCount++;
  return { id: createdCount, active: false };
}, (obj) => {
  obj.active = true;
}, 5);

assert(pool.pool.length === 5, 'Initial pool size is 5');
const obj1 = pool.get();
assert(obj1.active === true, 'Object acquired and reset callback executed');
assert(pool.active.length === 1, 'Active list has 1 item');
pool.release(obj1);
assert(pool.active.length === 0, 'Active list has 0 items after release');
assert(pool.pool.length === 5, 'Object returned to pool');

// 4. Island Map & Collision Test
console.log('\n[4] Testing Island Map & Collisions...');
const dummyScene = new THREE.Scene();
const map = new IslandMap(dummyScene);

// Test heightmap queries across coordinates
const centerHeight = map.getTerrainHeight(0, 0);
assert(centerHeight > 5.0, `Center island elevation is high-ground (${centerHeight.toFixed(2)}m)`);
const edgeHeight = map.getTerrainHeight(130, 0);
assert(edgeHeight >= 0.1 && edgeHeight < 2.0, `Coastline elevation is gentle beach (${edgeHeight.toFixed(2)}m)`);
const oceanHeight = map.getTerrainHeight(150, 0);
assert(oceanHeight < 0, `Offshore terrain is underwater (${oceanHeight.toFixed(2)}m)`);

// Test collision query performance
assert(map.colliders.length > 50, `Map generated ${map.colliders.length} world colliders`);
assert(map.getObstacleMeshes().length > 50, `Map registered ${map.getObstacleMeshes().length} obstacle meshes for bullet occlusion`);

const noCollision = map.checkCollision(new THREE.Vector3(0, centerHeight, 0));
assert(noCollision === false, 'Open ground at center has no obstacle collision');

// 5. Safe Zone Test
console.log('\n[5] Testing Safe Zone Logic...');
const safeZone = new SafeZone(dummyScene, null);
assert(safeZone.isInsideSafeZone(new THREE.Vector3(0, 0, 0)) === true, 'Island center is initially inside safe zone');
assert(safeZone.isInsideSafeZone(new THREE.Vector3(200, 0, 200)) === false, 'Distant ocean position is outside safe zone');

// Test final stage transition
safeZone.currentPhaseIndex = safeZone.phases.length; // Force final phase
safeZone.update(0.1, null, []);
assert(safeZone.state === 'FINAL', 'SafeZone enters FINAL phase without stalling');
assert(safeZone.currentRadius === 5.0, 'Final safe zone radius is 5m');

// 6. Character Models Test
console.log('\n[6] Testing Character Model Rigs...');
const playerChar = new CharacterModel(true);
assert(playerChar.group.name === 'player_character', 'Player character rig created with correct name');
assert(playerChar.parts.torso !== undefined, 'Player torso part initialized');
assert(playerChar.parts.root !== undefined, 'Player root pivot initialized for crouch');

const botChar = new CharacterModel(false, 1);
assert(botChar.group.name === 'bot_character', 'Bot character rig created with correct name');

// Test Hit Flash
playerChar.flashHit();
assert(playerChar._flashTimeout !== null, 'Hit flash sets active timeout');

console.log(`\n========================================`);
console.log(`ALL TESTS COMPLETED: ${passedTests} / ${totalTests} PASSED`);
console.log(`========================================`);
