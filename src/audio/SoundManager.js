// src/audio/SoundManager.js
// Procedural Web Audio API sound synthesis - 100% offline, zero network requests, zero latency

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.masterVolume = parseFloat(localStorage.getItem('bio_vol_master') ?? '0.8');
    this.sfxVolume = parseFloat(localStorage.getItem('bio_vol_sfx') ?? '0.9');
    this.isMuted = false;
    this.initialized = false;

    // Pre-bound handler for unlocking audio context on user gesture
    this.unlockHandler = () => this.init();
    window.addEventListener('click', this.unlockHandler, { once: true });
    window.addEventListener('touchstart', this.unlockHandler, { once: true });
    window.addEventListener('keydown', this.unlockHandler, { once: true });
  }

  init() {
    if (this.initialized && this.ctx && this.ctx.state === 'running') return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('bio_vol_master', this.masterVolume.toString());
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('bio_vol_sfx', this.sfxVolume.toString());
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  // Synthesize gunshot sounds based on weapon profile
  playGunshot(weaponType = 'ar', isBot = false, distRatio = 1.0) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const vol = (isBot ? 0.35 : 0.85) * Math.max(0.05, 1.0 - distRatio * 0.85);

    // Filter node for distance dampening
    const distFilter = this.ctx.createBiquadFilter();
    distFilter.type = 'lowpass';
    distFilter.frequency.setValueAtTime(Math.max(400, 12000 * (1.0 - distRatio * 0.7)), t);

    const gunGain = this.ctx.createGain();
    gunGain.gain.setValueAtTime(vol, t);
    gunGain.connect(distFilter);
    distFilter.connect(this.sfxGain);

    if (weaponType === 'ar') {
      // KAVACH-AR: snappy crack + punchy transient
      this._createTransient(t, 160, 45, 0.12, gunGain);
      this._createNoiseBurst(t, 0.09, 3200, 600, gunGain);
    } else if (weaponType === 'smg') {
      // GARUDA-SMG: rapid high-pitch pop
      this._createTransient(t, 220, 70, 0.08, gunGain);
      this._createNoiseBurst(t, 0.06, 4500, 1200, gunGain);
    } else if (weaponType === 'shotgun') {
      // TRISHUL-12: heavy percussive boom + thick noise
      this._createTransient(t, 90, 30, 0.28, gunGain, 1.3);
      this._createNoiseBurst(t, 0.22, 2400, 200, gunGain, 1.2);
    } else if (weaponType === 'sniper') {
      // BRAHMOS-SR: supersonic thunderclap + reverberant tail
      this._createTransient(t, 120, 25, 0.38, gunGain, 1.4);
      this._createNoiseBurst(t, 0.35, 5500, 300, gunGain, 1.4);
    } else {
      // AGNI-9: tactical pistol pop
      this._createTransient(t, 190, 60, 0.11, gunGain);
      this._createNoiseBurst(t, 0.07, 3800, 900, gunGain);
    }
  }

  _createTransient(startTime, startFreq, endFreq, duration, destGain, boost = 1.0) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), startTime + duration);

    gain.gain.setValueAtTime(0.7 * boost, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(destGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  _createNoiseBurst(startTime, duration, highCut, lowCut, destGain, boost = 1.0) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    if (bufferSize <= 0) return;

    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-4 * (i / bufferSize));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((highCut + lowCut) / 2, startTime);
    filter.Q.setValueAtTime(0.7, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8 * boost, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destGain);

    noise.start(startTime);
    noise.stop(startTime + duration + 0.01);
  }

  // Hitmarker sound: crisp ding (higher pitch on headshot)
  playHitMarker(isHeadshot = false) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isHeadshot ? 'triangle' : 'sine';
    const freq = isHeadshot ? 1760 : 980; // A6 or B5
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.08);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Reload mechanical sounds: mag out, mag in, bolt slide
  playReload() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Mag out click at t
    this._createClick(t, 900, 0.04);
    // Mag in click at t + 0.55s
    this._createClick(t + 0.55, 1100, 0.05);
    // Bolt rack slide at t + 1.1s
    this._createClick(t + 1.1, 1400, 0.06);
  }

  _createClick(startTime, freq, duration) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, startTime + duration);

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  // Footstep sound: subtle rustle/step
  playFootstep() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.07);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Item pickup chime
  playPickup() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.06); // E5
    osc.frequency.setValueAtTime(783.99, t + 0.12); // G5

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  // Medkit heal sound
  playMedkit() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.46);
  }

  // Safe zone warning alarm
  playZoneAlarm() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(480, t + 0.3);
    osc.frequency.linearRampToValueAtTime(320, t + 0.6);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.66);
  }

  // Elimination chime (kill feed alert)
  playElimination() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.22, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.19);
    });
  }

  // Victory Fanfare
  playVictory() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const victoryNotes = [
      { f: 523.25, d: 0.15, offset: 0 },
      { f: 659.25, d: 0.15, offset: 0.15 },
      { f: 783.99, d: 0.15, offset: 0.3 },
      { f: 1046.5, d: 0.5, offset: 0.45 }
    ];

    victoryNotes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t + n.offset);

      gain.gain.setValueAtTime(0.35, t + n.offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.offset + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + n.offset);
      osc.stop(t + n.offset + n.d + 0.05);
    });
  }

  // Defeat Chime
  playDefeat() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const defeatNotes = [
      { f: 440, d: 0.25, offset: 0 },
      { f: 415.3, d: 0.25, offset: 0.25 },
      { f: 392, d: 0.5, offset: 0.5 }
    ];

    defeatNotes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, t + n.offset);

      gain.gain.setValueAtTime(0.25, t + n.offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.offset + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + n.offset);
      osc.stop(t + n.offset + n.d + 0.05);
    });
  }
}
