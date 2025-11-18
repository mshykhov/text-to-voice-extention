class TTSPopup {
  constructor() {
    this.apiKey = '';
    this.init();
  }

  async init() {
    this.cacheElements();
    this.setupEventListeners();
    await this.loadApiKey();
    await this.loadSettings();
    await this.checkLastPosition();
    this.requestStateUpdate();
  }

  cacheElements() {
    this.elements = {
      apiKeySection: document.getElementById('api-key-section'),
      settingsSection: document.getElementById('settings-section'),
      controlsSection: document.getElementById('controls-section'),
      statusBar: document.getElementById('status-bar'),
      statusIndicator: document.getElementById('status-indicator'),
      statusSettings: document.getElementById('status-settings'),
      settingsIcon: document.getElementById('settings-icon'),
      settingsMenu: document.getElementById('settings-menu'),
      apiKeyInput: document.getElementById('api-key-input'),
      saveKeyBtn: document.getElementById('save-key-btn'),
      voiceSelect: document.getElementById('voice-select'),
      speedSelect: document.getElementById('speed-select'),
      startBtn: document.getElementById('start-btn'),
      resumeReadingBtn: document.getElementById('resume-reading-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      resumeBtn: document.getElementById('resume-btn'),
      stopBtn: document.getElementById('stop-btn'),
      prevBtn: document.getElementById('prev-btn'),
      nextBtn: document.getElementById('next-btn'),
      playbackControls: document.getElementById('playback-controls'),
      progressContainer: document.getElementById('progress-container'),
      progressFill: document.getElementById('progress-fill'),
      progressText: document.getElementById('progress-text'),
      errorMessage: document.getElementById('error-message'),
      successMessage: document.getElementById('success-message')
    };
  }

  setupEventListeners() {
    this.elements.saveKeyBtn.addEventListener('click', () => this.saveApiKey());
    this.elements.settingsIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSettingsMenu();
    });
    this.elements.startBtn.addEventListener('click', () => this.startReading());
    this.elements.resumeReadingBtn.addEventListener('click', () => this.resumeReading());
    this.elements.pauseBtn.addEventListener('click', () => this.pause());
    this.elements.resumeBtn.addEventListener('click', () => this.resume());
    this.elements.stopBtn.addEventListener('click', () => this.stop());
    this.elements.prevBtn.addEventListener('click', () => this.previousChunk());
    this.elements.nextBtn.addEventListener('click', () => this.nextChunk());

    this.elements.voiceSelect.addEventListener('change', () => {
      this.saveSettings();
      this.updateStatusBar();
    });
    this.elements.speedSelect.addEventListener('change', () => {
      this.saveSettings();
      this.updateStatusBar();
    });

    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = e.target.closest('.menu-item').dataset.action;
        this.handleMenuAction(action);
      });
    });

    document.addEventListener('click', () => this.closeSettingsMenu());

    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'stateChanged' && message.state) {
        this.updateUIFromState(message.state);
      }
    });
  }

  async loadApiKey() {
    try {
      const data = await chrome.storage.sync.get('apiKey');
      if (data.apiKey) {
        this.apiKey = data.apiKey;
        this.elements.apiKeyInput.value = data.apiKey;
        this.showMainUI();
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  }

  async saveApiKey() {
    const apiKey = this.elements.apiKeyInput.value.trim();

    if (!apiKey) {
      this.showError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      this.showError('Invalid API key format');
      return;
    }

    try {
      await chrome.storage.sync.set({ apiKey });
      this.apiKey = apiKey;
      this.showSuccess('API key saved!');
      this.showMainUI();
    } catch (error) {
      this.showError('Failed to save API key');
    }
  }

  showApiKeyInput() {
    this.elements.apiKeySection.classList.remove('hidden');
    this.elements.settingsSection.classList.add('hidden');
    this.elements.controlsSection.classList.add('hidden');
    this.elements.settingsIcon.classList.add('hidden');
    this.elements.statusBar.classList.add('hidden');
    this.elements.apiKeyInput.value = '';
    this.elements.apiKeyInput.focus();
  }

  showMainUI() {
    this.elements.apiKeySection.classList.add('hidden');
    this.elements.settingsSection.classList.remove('hidden');
    this.elements.controlsSection.classList.remove('hidden');
    this.elements.settingsIcon.classList.remove('hidden');
    this.elements.statusBar.classList.remove('hidden');
    this.updateStatusBar();
  }

  toggleSettingsMenu() {
    this.elements.settingsMenu.classList.toggle('hidden');
  }

  closeSettingsMenu() {
    this.elements.settingsMenu.classList.add('hidden');
  }

  handleMenuAction(action) {
    this.closeSettingsMenu();

    switch (action) {
      case 'reset-key':
        this.showApiKeyInput();
        break;
      case 'open-options':
        chrome.runtime.openOptionsPage();
        break;
    }
  }

  async loadSettings() {
    try {
      const defaults = {
        voice: 'alloy',
        speed: 1.0
      };

      const data = await chrome.storage.sync.get(['voice', 'speed']);
      const voice = data.voice || defaults.voice;
      const speed = data.speed !== undefined ? data.speed : defaults.speed;

      this.elements.voiceSelect.value = voice;
      this.elements.speedSelect.value = speed.toString();

      if (data.voice === undefined || data.speed === undefined) {
        await chrome.storage.sync.set({ voice, speed });
      }

      this.updateStatusBar();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      const voice = this.elements.voiceSelect.value;
      const speed = parseFloat(this.elements.speedSelect.value);

      await chrome.storage.sync.set({ voice, speed });

      chrome.runtime.sendMessage({
        action: 'updateSettings',
        voice,
        speed
      }).catch(() => {});
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  requestStateUpdate() {
    chrome.runtime.sendMessage({ action: 'getState' }).catch(() => {});
  }

  updateUIFromState(state) {
    if (!state || !this.elements) return;

    const { isPlaying, isPaused, currentChunkIndex, totalChunks } = state;

    this.elements.startBtn.disabled = false;
    this.elements.startBtn.textContent = '▶ Read Page';

    this.elements.startBtn.classList.toggle('hidden', isPlaying);
    this.elements.playbackControls.classList.toggle('hidden', !isPlaying);
    this.elements.progressContainer.classList.toggle('hidden', !isPlaying);
    this.elements.pauseBtn.classList.toggle('hidden', isPaused);
    this.elements.resumeBtn.classList.toggle('hidden', !isPaused);

    if (totalChunks > 0) {
      this.elements.prevBtn.disabled = currentChunkIndex === 0;
      this.elements.nextBtn.disabled = currentChunkIndex >= totalChunks - 1;

      const current = currentChunkIndex + 1;
      this.elements.progressText.textContent = `${current} / ${totalChunks}`;
      const progress = (current / totalChunks) * 100;
      this.elements.progressFill.style.width = `${progress}%`;
    }

    this.updateStatusIndicator(isPlaying, isPaused);
    this.checkLastPosition(isPlaying);
  }

  updateStatusIndicator(isPlaying, isPaused) {
    this.elements.statusIndicator.className = 'status-indicator';

    if (isPlaying && isPaused) {
      this.elements.statusIndicator.textContent = '● Paused';
      this.elements.statusIndicator.classList.add('paused');
    } else if (isPlaying) {
      this.elements.statusIndicator.textContent = '● Playing';
      this.elements.statusIndicator.classList.add('playing');
    } else {
      this.elements.statusIndicator.textContent = '● Ready';
      this.elements.statusIndicator.classList.add('ready');
    }
  }

  updateStatusBar() {
    const voice = this.elements.voiceSelect.value;
    const speed = this.elements.speedSelect.value;

    const voiceName = voice.charAt(0).toUpperCase() + voice.slice(1);
    const speedValue = parseFloat(speed);
    const speedDisplay = speedValue % 1 === 0 ? `${speedValue}.0` : speed;
    this.elements.statusSettings.textContent = `${voiceName} ${speedDisplay}x`;
  }

  async startReading() {
    this.clearMessages();

    if (!this.apiKey) {
      this.showError('Please enter and save your API key first');
      this.showApiKeyInput();
      return;
    }

    try {
      this.elements.startBtn.disabled = true;
      this.elements.startBtn.textContent = 'Loading...';

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractText' });

      if (!response || !response.success || !response.text) {
        throw new Error('Could not extract text from this page');
      }

      const text = response.text.trim();
      if (text.length < 10) {
        throw new Error('Not enough text found on this page');
      }

      const startResponse = await chrome.runtime.sendMessage({
        action: 'startReading',
        data: {
          text,
          apiKey: this.apiKey,
          voice: this.elements.voiceSelect.value,
          speed: parseFloat(this.elements.speedSelect.value),
          tabId: tab.id
        }
      });

      if (!startResponse || !startResponse.success) {
        throw new Error(startResponse?.error || 'Failed to start reading');
      }

      await this.checkLastPosition();

    } catch (error) {
      console.error('Start reading error:', error);
      this.showError(error.message);
      this.elements.startBtn.disabled = false;
      this.elements.startBtn.textContent = '▶ Read Page';
    }
  }

  async stop() {
    chrome.runtime.sendMessage({ action: 'stop' }).catch(() => {});
  }

  async pause() {
    chrome.runtime.sendMessage({ action: 'pause' }).catch(() => {});
  }

  async resume() {
    chrome.runtime.sendMessage({ action: 'resume' }).catch(() => {});
  }

  async previousChunk() {
    chrome.runtime.sendMessage({ action: 'previousChunk' }).catch(() => {});
  }

  async nextChunk() {
    chrome.runtime.sendMessage({ action: 'nextChunk' }).catch(() => {});
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.classList.remove('hidden');
    setTimeout(() => this.clearMessages(), 5000);
  }

  showSuccess(message) {
    this.elements.successMessage.textContent = message;
    this.elements.successMessage.classList.remove('hidden');
    setTimeout(() => this.clearMessages(), 3000);
  }

  clearMessages() {
    this.elements.errorMessage.classList.add('hidden');
    this.elements.successMessage.classList.add('hidden');
  }

  async checkLastPosition(isPlaying = false) {
    if (isPlaying) {
      this.elements.resumeReadingBtn.classList.add('hidden');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ action: 'hasLastPosition' });
      if (response && response.hasPosition) {
        this.elements.resumeReadingBtn.classList.remove('hidden');
        this.elements.resumeReadingBtn.disabled = false;
      } else {
        this.elements.resumeReadingBtn.classList.add('hidden');
      }
    } catch (error) {
      console.error('Check last position error:', error);
      this.elements.resumeReadingBtn.classList.add('hidden');
    }
  }

  async resumeReading() {
    this.clearMessages();

    try {
      this.elements.resumeReadingBtn.disabled = true;

      const response = await chrome.runtime.sendMessage({ action: 'resumeReading' });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to resume reading');
      }

      await this.checkLastPosition();
    } catch (error) {
      console.error('Resume reading error:', error);
      this.showError(error.message);
      this.elements.resumeReadingBtn.disabled = false;
    }
  }
}

new TTSPopup();
