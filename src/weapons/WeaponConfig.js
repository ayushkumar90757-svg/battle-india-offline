// src/weapons/WeaponConfig.js
// Weapon data and stats for original Indian-themed fictional weapons

export const WEAPON_CONFIGS = {
  'kavach_ar': {
    id: 'kavach_ar',
    name: 'KAVACH-AR',
    type: 'ar',
    category: 'primary',
    fireRate: 0.11, // ~545 RPM
    damage: 28,
    headshotMultiplier: 1.8,
    magazineSize: 30,
    reserveAmmo: 120,
    maxReserve: 240,
    reloadTime: 2.0, // seconds
    range: 140,
    spread: 0.022,
    spreadMoveMultiplier: 2.2,
    recoilPitch: 0.015,
    recoilYaw: 0.006,
    recoilRecovery: 8.0,
    bulletSpeed: 240,
    isAutomatic: true,
    pellets: 1,
    zoomFov: 42,
    color: '#e67e22',
    description: 'Standard issue military assault rifle. Well-balanced damage and controllable recoil.'
  },

  'garuda_smg': {
    id: 'garuda_smg',
    name: 'GARUDA-SMG',
    type: 'smg',
    category: 'primary',
    fireRate: 0.075, // 800 RPM
    damage: 18,
    headshotMultiplier: 1.6,
    magazineSize: 35,
    reserveAmmo: 140,
    maxReserve: 280,
    reloadTime: 1.7,
    range: 75,
    spread: 0.035,
    spreadMoveMultiplier: 1.6,
    recoilPitch: 0.012,
    recoilYaw: 0.009,
    recoilRecovery: 9.5,
    bulletSpeed: 210,
    isAutomatic: true,
    pellets: 1,
    zoomFov: 48,
    color: '#3498db',
    description: 'High rate-of-fire submachine gun. Deadly in close-quarters encounters.'
  },

  'trishul_12': {
    id: 'trishul_12',
    name: 'TRISHUL-12',
    type: 'shotgun',
    category: 'primary',
    fireRate: 0.75, // Pump action
    damage: 15, // 15 x 8 = 120 max damage
    headshotMultiplier: 1.5,
    magazineSize: 6,
    reserveAmmo: 30,
    maxReserve: 60,
    reloadTime: 2.6,
    range: 40,
    spread: 0.075,
    spreadMoveMultiplier: 1.3,
    recoilPitch: 0.045,
    recoilYaw: 0.012,
    recoilRecovery: 6.0,
    bulletSpeed: 180,
    isAutomatic: false,
    pellets: 8,
    zoomFov: 52,
    color: '#e74c3c',
    description: 'Devastating 12-gauge tactical shotgun firing an 8-pellet buckshot spread.'
  },

  'brahmos_sr': {
    id: 'brahmos_sr',
    name: 'BRAHMOS-SR',
    type: 'sniper',
    category: 'primary',
    fireRate: 1.35, // Bolt action
    damage: 95, // 95 * 2.0 = 190 headshot (one-shot kill)
    headshotMultiplier: 2.0,
    magazineSize: 5,
    reserveAmmo: 25,
    maxReserve: 50,
    reloadTime: 2.8,
    range: 300,
    spread: 0.004,
    spreadMoveMultiplier: 4.5,
    recoilPitch: 0.055,
    recoilYaw: 0.005,
    recoilRecovery: 4.5,
    bulletSpeed: 380,
    isAutomatic: false,
    pellets: 1,
    zoomFov: 20, // High magnification scope
    color: '#9b59b6',
    description: 'High-caliber precision sniper rifle. Delivers lethal damage at extreme ranges.'
  },

  'agni_9': {
    id: 'agni_9',
    name: 'AGNI-9',
    type: 'pistol',
    category: 'secondary',
    fireRate: 0.22, // Semi-auto
    damage: 23,
    headshotMultiplier: 1.7,
    magazineSize: 12,
    reserveAmmo: 60,
    maxReserve: 120,
    reloadTime: 1.4,
    range: 65,
    spread: 0.02,
    spreadMoveMultiplier: 1.8,
    recoilPitch: 0.018,
    recoilYaw: 0.004,
    recoilRecovery: 10.0,
    bulletSpeed: 200,
    isAutomatic: false,
    pellets: 1,
    zoomFov: 50,
    color: '#2ecc71',
    description: 'Reliable semi-automatic tactical sidearm with rapid reload speed.'
  }
};
