// src/engine/GameEngine.js
// High-performance Three.js rendering engine with Low/Med/High graphics quality tiers

import * as THREE from 'three';

export class GameEngine {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    // Detect hardware tier for automatic graphics preset
    const detectedTier = this._detectDeviceTier();
    this.qualityTier = localStorage.getItem('bio_graphics_tier') || detectedTier;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.FogExp2(0xcfe2f3, 0.0035); // Atmospheric distance fog

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: this.qualityTier === 'high',
      stencil: false,
      depth: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);

    // Lighting setup
    this._setupLighting();

    // Clock
    this.clock = new THREE.Clock();
    this.maxDelta = 0.05; // Prevent physics explosion on lag spikes

    // Apply graphics settings
    this.applyQualityTier(this.qualityTier);

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
    this.onWindowResize();
  }

  _detectDeviceTier() {
    const memory = navigator.deviceMemory || 4; // RAM in GB if available
    const cores = navigator.hardwareConcurrency || 4;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (memory <= 2 || cores <= 4 || isMobile) {
      return 'low';
    } else if (memory <= 6) {
      return 'medium';
    }
    return 'high';
  }

  _setupLighting() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this.ambientLight);

    // Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.15);
    this.sunLight.position.set(70, 140, 60);
    this.sunLight.castShadow = (this.qualityTier === 'high');

    // Shadow optimizations for high tier
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 300;
    const d = 110;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.001;

    this.scene.add(this.sunLight);

    // Hemisphere light for ground bounce
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x547343, 0.4);
    this.scene.add(this.hemiLight);
  }

  applyQualityTier(tier) {
    this.qualityTier = tier;
    localStorage.setItem('bio_graphics_tier', tier);

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (tier === 'low') {
      // Optimized for low-end Android (2GB RAM): 0.8x pixel ratio, no shadows, simple fog
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
      this.scene.fog.density = 0.004;
    } else if (tier === 'medium') {
      // Balanced: 1.0x pixel ratio, soft ambient, minimal shadows
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
      this.scene.fog.density = 0.0035;
    } else {
      // High: Full native resolution, shadow maps enabled
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.sunLight.castShadow = true;
      this.scene.fog.density = 0.003;
    }

    this.renderer.setSize(width, height);
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  getDelta() {
    return Math.min(this.clock.getDelta(), this.maxDelta);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
