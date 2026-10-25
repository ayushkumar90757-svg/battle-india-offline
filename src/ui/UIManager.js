// src/ui/UIManager.js
// Orchestrates Main Menu, Pause Menu, Settings Modal, Results Screen, and transitions

export class UIManager {
  constructor(gameApp) {
    this.app = gameApp;

    this._initDOMElements();
    this._attachEventListeners();
    this._loadSettingsToUI();
  }

  _initDOMElements() {
    this.mainMenu = document.getElementById('main-menu');
    this.pauseMenu = document.getElementById('pause-menu');
    this.settingsModal = document.getElementById('settings-modal');
    this.resultsModal = document.getElementById('results-modal');
    this.controlsGuideModal = document.getElementById('controls-modal');
    this.loadingScreen = document.getElementById('loading-screen');

    // Main Menu Buttons
    this.btnPlay = document.getElementById('btn-menu-play');
    this.btnPractice = document.getElementById('btn-menu-practice');
    this.btnSettings = document.getElementById('btn-menu-settings');
    this.btnControls = document.getElementById('btn-menu-controls');
    this.btnExit = document.getElementById('btn-menu-exit');

    // Pause Menu Buttons
    this.btnResume = document.getElementById('btn-pause-resume');
    this.btnRestart = document.getElementById('btn-pause-restart');
    this.btnPauseSettings = document.getElementById('btn-pause-settings');
    this.btnQuitToMenu = document.getElementById('btn-pause-quit');
    this.btnPauseTrigger = document.getElementById('btn-hud-pause');

    // Settings Controls
    this.selectGraphics = document.getElementById('set-graphics');
    this.selectBotCount = document.getElementById('set-bot-count');
    this.selectBotDiff = document.getElementById('set-bot-diff');
    this.sliderSensitivity = document.getElementById('set-sensitivity');
    this.valSensitivity = document.getElementById('val-sensitivity');
    this.sliderMasterVol = document.getElementById('set-master-vol');
    this.sliderSfxVol = document.getElementById('set-sfx-vol');
    this.checkInvertY = document.getElementById('set-invert-y');
    this.btnSettingsClose = document.getElementById('btn-settings-close');
    this.btnControlsClose = document.getElementById('btn-controls-close');

    // Results Screen Elements
    this.resultTitle = document.getElementById('results-title');
    this.resultRank = document.getElementById('results-rank');
    this.resultKills = document.getElementById('results-kills');
    this.resultDamage = document.getElementById('results-damage');
    this.resultTime = document.getElementById('results-time');
    this.btnPlayAgain = document.getElementById('btn-results-play-again');
    this.btnResultsMenu = document.getElementById('btn-results-menu');
  }

  _loadSettingsToUI() {
    if (this.selectGraphics) {
      this.selectGraphics.value = this.app.engine.qualityTier;
    }
    if (this.selectBotCount) {
      this.selectBotCount.value = this.app.botManager.botCount.toString();
    }
    if (this.selectBotDiff) {
      this.selectBotDiff.value = this.app.botManager.botDifficulty;
    }
    if (this.sliderSensitivity) {
      this.sliderSensitivity.value = this.app.input.sensitivity.toString();
      if (this.valSensitivity) this.valSensitivity.textContent = `${this.app.input.sensitivity}x`;
    }
    if (this.sliderMasterVol) {
      this.sliderMasterVol.value = this.app.sound.masterVolume.toString();
    }
    if (this.sliderSfxVol) {
      this.sliderSfxVol.value = this.app.sound.sfxVolume.toString();
    }
    if (this.checkInvertY) {
      this.checkInvertY.checked = this.app.input.invertY;
    }
  }

  _attachEventListeners() {
    // 1. Main Menu Navigation
    this.btnPlay?.addEventListener('click', () => {
      this.app.startMatch('royale');
    });

    this.btnPractice?.addEventListener('click', () => {
      this.app.startMatch('practice');
    });

    this.btnSettings?.addEventListener('click', () => {
      this.openSettings();
    });

    this.btnControls?.addEventListener('click', () => {
      this.controlsGuideModal.style.display = 'flex';
    });

    this.btnExit?.addEventListener('click', () => {
      if (confirm('Exit Battle India Offline?')) {
        window.close();
      }
    });

    // 2. Pause Menu Navigation
    this.btnPauseTrigger?.addEventListener('click', () => {
      this.app.togglePause();
    });

    this.btnResume?.addEventListener('click', () => {
      this.app.togglePause(false);
    });

    this.btnRestart?.addEventListener('click', () => {
      this.app.restartMatch();
    });

    this.btnPauseSettings?.addEventListener('click', () => {
      this.openSettings();
    });

    this.btnQuitToMenu?.addEventListener('click', () => {
      this.app.quitToMainMenu();
    });

    // 3. Settings Changes
    this.selectGraphics?.addEventListener('change', e => {
      this.app.engine.applyQualityTier(e.target.value);
    });

    this.selectBotCount?.addEventListener('change', e => {
      this.app.botManager.setBotCount(parseInt(e.target.value));
    });

    this.selectBotDiff?.addEventListener('change', e => {
      this.app.botManager.setDifficulty(e.target.value);
    });

    this.sliderSensitivity?.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      this.app.input.setSensitivity(val);
      if (this.valSensitivity) this.valSensitivity.textContent = `${val.toFixed(1)}x`;
    });

    this.sliderMasterVol?.addEventListener('input', e => {
      this.app.sound.setMasterVolume(parseFloat(e.target.value));
    });

    this.sliderSfxVol?.addEventListener('input', e => {
      this.app.sound.setSfxVolume(parseFloat(e.target.value));
    });

    this.checkInvertY?.addEventListener('change', e => {
      this.app.input.setInvertY(e.target.checked);
    });

    this.btnSettingsClose?.addEventListener('click', () => {
      this.settingsModal.style.display = 'none';
    });

    this.btnControlsClose?.addEventListener('click', () => {
      this.controlsGuideModal.style.display = 'none';
    });

    // 4. Results Screen Navigation
    this.btnPlayAgain?.addEventListener('click', () => {
      this.resultsModal.style.display = 'none';
      this.app.restartMatch();
    });

    this.btnResultsMenu?.addEventListener('click', () => {
      this.resultsModal.style.display = 'none';
      this.app.quitToMainMenu();
    });

    // Escape key pause toggle for desktop
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.app.gameState === 'PLAYING' || this.app.gameState === 'PAUSED') {
          this.app.togglePause();
        }
      }
    });
  }

  openSettings() {
    this._loadSettingsToUI();
    this.settingsModal.style.display = 'flex';
  }

  showMainMenu() {
    this.mainMenu.style.display = 'flex';
    this.pauseMenu.style.display = 'none';
    this.resultsModal.style.display = 'none';
    document.getElementById('hud-layer').style.display = 'none';
    document.getElementById('touch-controls-layer').style.display = 'none';
  }

  showHUD() {
    this.mainMenu.style.display = 'none';
    this.pauseMenu.style.display = 'none';
    this.resultsModal.style.display = 'none';
    document.getElementById('hud-layer').style.display = 'block';
    document.getElementById('touch-controls-layer').style.display = 'block';
  }

  setPauseVisible(visible) {
    this.pauseMenu.style.display = visible ? 'flex' : 'none';
  }

  showMatchResults(isVictory, rank, kills, damage, survivalTimeSeconds) {
    this.resultsModal.style.display = 'flex';

    if (isVictory) {
      this.resultTitle.textContent = 'CHAMPION OF BHARAT!';
      this.resultTitle.className = 'results-title victory';
      this.resultRank.textContent = '#1 VICTORY ROYALE';
      if (this.app.sound) this.app.sound.playVictory();
    } else {
      this.resultTitle.textContent = 'ELIMINATED';
      this.resultTitle.className = 'results-title defeat';
      this.resultRank.textContent = `RANK #${rank}`;
      if (this.app.sound) this.app.sound.playDefeat();
    }

    this.resultKills.textContent = kills.toString();
    this.resultDamage.textContent = Math.round(damage).toString();

    const mins = Math.floor(survivalTimeSeconds / 60);
    const secs = Math.floor(survivalTimeSeconds % 60);
    this.resultTime.textContent = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }

  hideLoading() {
    if (this.loadingScreen) {
      this.loadingScreen.style.opacity = '0';
      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
      }, 500);
    }
  }
}
