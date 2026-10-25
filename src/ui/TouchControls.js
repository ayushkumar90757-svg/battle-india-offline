// src/ui/TouchControls.js
// High-performance mobile multi-touch virtual joystick, swipe camera surface, and action buttons

export class TouchControls {
  constructor(inputManager, soundManager) {
    this.input = inputManager;
    this.sound = soundManager;

    // Active touch tracking
    this.joystickTouchId = null;
    this.lookTouchId = null;

    // Joystick geometry
    this.joystickCenter = { x: 0, y: 0 };
    this.maxJoystickRadius = 55;

    // Last look touch position
    this.lastLookPos = { x: 0, y: 0 };

    this._initElements();
    this._attachTouchListeners();
  }

  _initElements() {
    this.container = document.getElementById('touch-controls-layer');
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.lookZone = document.getElementById('look-zone');

    // Buttons
    this.btnFire = document.getElementById('btn-touch-fire');
    this.btnAim = document.getElementById('btn-touch-aim');
    this.btnJump = document.getElementById('btn-touch-jump');
    this.btnCrouch = document.getElementById('btn-touch-crouch');
    this.btnReload = document.getElementById('btn-touch-reload');
    this.btnMedkit = document.getElementById('btn-touch-medkit');
    this.btnSlot1 = document.getElementById('touch-slot-1');
    this.btnSlot2 = document.getElementById('touch-slot-2');
    this.btnSlot3 = document.getElementById('touch-slot-3');
  }

  _attachTouchListeners() {
    if (!this.container) return;

    // 1. Joystick Touch Handling (Left side of screen)
    if (this.joystickZone) {
      this.joystickZone.addEventListener('touchstart', e => {
        e.preventDefault();
        if (this.joystickTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.joystickTouchId = touch.identifier;

        // Position joystick base under thumb
        const rect = this.joystickZone.getBoundingClientRect();
        const startX = touch.clientX - rect.left;
        const startY = touch.clientY - rect.top;

        this.joystickCenter = { x: startX, y: startY };
        this.joystickBase.style.display = 'block';
        this.joystickBase.style.left = `${startX}px`;
        this.joystickBase.style.top = `${startY}px`;
        this.joystickKnob.style.transform = `translate(0px, 0px)`;
      }, { passive: false });

      this.joystickZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.joystickTouchId) {
            const rect = this.joystickZone.getBoundingClientRect();
            const curX = touch.clientX - rect.left;
            const curY = touch.clientY - rect.top;

            let dx = curX - this.joystickCenter.x;
            let dy = curY - this.joystickCenter.y;
            const dist = Math.hypot(dx, dy);

            if (dist > this.maxJoystickRadius) {
              dx = (dx / dist) * this.maxJoystickRadius;
              dy = (dy / dist) * this.maxJoystickRadius;
            }

            this.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

            // Normalized input:
            // normX: -1 (left) to +1 (right)
            // normY: +1 (forward/up) to -1 (backward/down)
            const normX = dx / this.maxJoystickRadius;
            const normY = -dy / this.maxJoystickRadius; // Invert screen Y so up is positive forward

            this.input.setJoystickInput(normX, normY);
            break;
          }
        }
      }, { passive: false });

      const endJoystick = e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystickTouchId) {
            this.joystickTouchId = null;
            this.input.setJoystickInput(0, 0);
            this.joystickKnob.style.transform = `translate(0px, 0px)`;
            this.joystickBase.style.display = 'none';
            break;
          }
        }
      };

      this.joystickZone.addEventListener('touchend', endJoystick);
      this.joystickZone.addEventListener('touchcancel', endJoystick);
    }

    // 2. Camera Look Drag Surface (Right side of screen)
    if (this.lookZone) {
      this.lookZone.addEventListener('touchstart', e => {
        e.preventDefault();
        if (this.lookTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.lookTouchId = touch.identifier;
        this.lastLookPos = { x: touch.clientX, y: touch.clientY };
      }, { passive: false });

      this.lookZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.lookTouchId) {
            const dx = touch.clientX - this.lastLookPos.x;
            const dy = touch.clientY - this.lastLookPos.y;
            this.lastLookPos = { x: touch.clientX, y: touch.clientY };

            this.input.addLookDelta(dx, dy);
            break;
          }
        }
      }, { passive: false });

      const endLook = e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.lookTouchId) {
            this.lookTouchId = null;
            break;
          }
        }
      };

      this.lookZone.addEventListener('touchend', endLook);
      this.lookZone.addEventListener('touchcancel', endLook);
    }

    // 3. Tactile Action Buttons
    this._bindButton(this.btnFire,
      () => { this.input.isFiring = true; },
      () => { this.input.isFiring = false; }
    );

    this._bindButton(this.btnAim,
      () => { this.input.isAiming = !this.input.isAiming; }
    );

    this._bindButton(this.btnJump,
      () => { this.input.isJumping = true; },
      () => { this.input.isJumping = false; }
    );

    this._bindButton(this.btnCrouch,
      () => { this.input.isCrouching = !this.input.isCrouching; }
    );

    this._bindButton(this.btnReload,
      () => { this.input.reloadRequested = true; }
    );

    this._bindButton(this.btnMedkit,
      () => { this.input.medkitRequested = true; }
    );

    this._bindButton(this.btnSlot1, () => { this.input.switchSlotRequest = 0; });
    this._bindButton(this.btnSlot2, () => { this.input.switchSlotRequest = 1; });
    this._bindButton(this.btnSlot3, () => { this.input.switchSlotRequest = 2; });
  }

  _bindButton(btn, onDown, onUp = null) {
    if (!btn) return;

    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('active');
      if (onDown) onDown();
    }, { passive: false });

    btn.addEventListener('touchend', e => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.remove('active');
      if (onUp) onUp();
    }, { passive: false });

    btn.addEventListener('touchcancel', e => {
      btn.classList.remove('active');
      if (onUp) onUp();
    });

    // Also support mouse click for UI testing
    btn.addEventListener('mousedown', e => {
      btn.classList.add('active');
      if (onDown) onDown();
    });

    btn.addEventListener('mouseup', e => {
      btn.classList.remove('active');
      if (onUp) onUp();
    });
  }
}
