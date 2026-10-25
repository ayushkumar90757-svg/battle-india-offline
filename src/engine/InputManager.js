// src/engine/InputManager.js
// Handles keyboard, mouse pointer lock, and mobile touch inputs with zero delay

export class InputManager {
  constructor() {
    // Movement intent: [-1 to 1]
    this.moveForward = 0; // W / S / Joystick Y
    this.moveRight = 0;   // D / A / Joystick X (D = +1, A = -1)

    // Actions
    this.isFiring = false;
    this.isAiming = false;
    this.isJumping = false;
    this.isCrouching = false;
    this.reloadRequested = false;
    this.medkitRequested = false;
    this.interactRequested = false;

    // Slot switch request: null, 0, 1, 2
    this.switchSlotRequest = null;

    // Camera look deltas
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;

    // Settings
    this.sensitivity = parseFloat(localStorage.getItem('bio_sensitivity') ?? '1.0');
    this.invertY = localStorage.getItem('bio_invert_y') === 'true';

    // State
    this.isPointerLocked = false;
    this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Keyboard state map
    this.keys = {};

    this._setupKeyboardListeners();
    this._setupMouseListeners();
  }

  setSensitivity(val) {
    this.sensitivity = Math.max(0.2, Math.min(3.0, val));
    localStorage.setItem('bio_sensitivity', this.sensitivity.toString());
  }

  setInvertY(invert) {
    this.invertY = !!invert;
    localStorage.setItem('bio_invert_y', this.invertY.toString());
  }

  requestPointerLock(element = document.body) {
    if (this.isMobile) return;
    try {
      element.requestPointerLock?.();
    } catch (e) {
      console.warn('Pointer lock request error:', e);
    }
  }

  exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  _setupKeyboardListeners() {
    window.addEventListener('keydown', e => {
      // Prevent browser default on game controls
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyR'].includes(e.code)) {
        // Only prevent if not in input fields
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
        }
      }

      this.keys[e.code] = true;

      // Single-press actions
      if (e.code === 'KeyR') this.reloadRequested = true;
      if (e.code === 'KeyF' || e.code === 'Digit4') this.medkitRequested = true;
      if (e.code === 'KeyE') this.interactRequested = true;
      if (e.code === 'Digit1') this.switchSlotRequest = 0;
      if (e.code === 'Digit2') this.switchSlotRequest = 1;
      if (e.code === 'Digit3') this.switchSlotRequest = 2;
      if (e.code === 'KeyC') this.isCrouching = !this.isCrouching;

      this._updateKeyboardMovement();
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      this._updateKeyboardMovement();
    });
  }

  _updateKeyboardMovement() {
    // Forward / Backward
    let fwd = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) fwd += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) fwd -= 1;
    this.moveForward = fwd;

    // Right / Left (D = right +1, A = left -1). STRICTLY NEVER INVERTED!
    let rgt = 0;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) rgt += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) rgt -= 1;
    this.moveRight = rgt;

    // Jump
    this.isJumping = !!(this.keys['Space']);
  }

  _setupMouseListeners() {
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement !== null);
    });

    window.addEventListener('mousemove', e => {
      if (!this.isPointerLocked) return;

      const baseSensitivity = 0.0022 * this.sensitivity;
      this.lookDeltaX += e.movementX * baseSensitivity;
      this.lookDeltaY += (this.invertY ? -e.movementY : e.movementY) * baseSensitivity;
    });

    window.addEventListener('mousedown', e => {
      if (e.target.closest('#ui-layer') && !e.target.closest('#hud-clickthrough')) {
        return; // UI click, ignore game input
      }

      if (e.button === 0) { // Left click: Fire
        this.isFiring = true;
      } else if (e.button === 2) { // Right click: Aim Down Sights
        this.isAiming = true;
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) {
        this.isFiring = false;
      } else if (e.button === 2) {
        this.isAiming = false;
      }
    });

    // Disable context menu on right click for ADS
    window.addEventListener('contextmenu', e => {
      e.preventDefault();
    });
  }

  // Mobile virtual joystick input bridge
  setJoystickInput(x, y) {
    // x: -1 (left) to +1 (right)
    // y: -1 (backward) to +1 (forward)
    this.moveRight = x;
    this.moveForward = y;
  }

  // Mobile camera swipe look input bridge
  addLookDelta(dx, dy) {
    const mobileFactor = 0.0032 * this.sensitivity;
    this.lookDeltaX += dx * mobileFactor;
    this.lookDeltaY += (this.invertY ? -dy : dy) * mobileFactor;
  }

  // Consume and reset frame look deltas
  consumeLookDeltas() {
    const dx = this.lookDeltaX;
    const dy = this.lookDeltaY;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return { dx, dy };
  }

  // Consume single-frame actions
  consumeReload() {
    const val = this.reloadRequested;
    this.reloadRequested = false;
    return val;
  }

  consumeMedkit() {
    const val = this.medkitRequested;
    this.medkitRequested = false;
    return val;
  }

  consumeInteract() {
    const val = this.interactRequested;
    this.interactRequested = false;
    return val;
  }

  consumeSlotSwitch() {
    const val = this.switchSlotRequest;
    this.switchSlotRequest = null;
    return val;
  }
}
