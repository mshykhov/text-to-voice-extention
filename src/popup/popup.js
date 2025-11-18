/**
 * Popup Controller - Pure UI Layer
 * Service Worker is the single source of truth
 */

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

    // Request initial state from service worker
    this.requestStateUpdate();
  }

  cacheElements() {
    this.elements = {
      apiKeySection: document.getElementById('api-key-section'),
      settingsSection: document.getElementById('settings-section'),
      apiKeyInput: document.getElementById('api-key-input'),
      saveKeyBtn: document.getElementById('save-key-btn'),
      voiceSelect: document.getElementById('voice-select'),
      speedSlider: document.getElementById('speed-slider'),
      speedValue: document.getElementById('speed-value'),
      startBtn: document.getElementById('start-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      resumeBtn: document.getElementById('resume-btn'),
      stopBtn: document.getElementById('stop-btn'),
      prevBtn: document.getElementById('prev-btn'),
      nextBtn: document.getElementById('next-btn'),
      navControls: document.getElementById('nav-controls'),
      errorMessage: document.getElementById('error-message'),
      successMessage: document.getElementById('success-message')
    };
  }

  setupEventListeners() {
    this.elements.saveKeyBtn.addEventListener('click', () => this.saveApiKey());
    this.elements.startBtn.addEventListener('click', () => this.startReading());
    this.elements.pauseBtn.addEventListener('click', () => this.pause());
    this.elements.resumeBtn.addEventListener('click', () => this.resume());
    this.elements.stopBtn.addEventListener('click', () => this.stop());
    this.elements.prevBtn.addEventListener('click', () => this.previousChunk());
    this.elements.nextBtn.addEventListener('click', () => this.nextChunk());

    // Auto-save settings
    this.elements.voiceSelect.addEventListener('change', () => this.saveSettings());
    this.elements.speedSlider.addEventListener('input', () => {
      this.elements.speedValue.textContent = `${this.elements.speedSlider.value}x`;
    });
    this.elements.speedSlider.addEventListener('change', () => this.saveSettings());

    // Listen for state changes from service worker
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
        this.elements.apiKeySection.classList.add('hidden');
        this.elements.settingsSection.classList.remove('hidden');
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
      this.elements.apiKeySection.classList.add('hidden');
      this.elements.settingsSection.classList.remove('hidden');
    } catch (error) {
      this.showError('Failed to save API key');
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
      const speed = data.speed || defaults.speed;

      this.elements.voiceSelect.value = voice;
      this.elements.speedSlider.value = speed;
      this.elements.speedValue.textContent = `${speed}x`;

      // Save defaults if needed
      if (!data.voice || !data.speed) {
        await this.saveSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        voice: this.elements.voiceSelect.value,
        speed: parseFloat(this.elements.speedSlider.value)
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // Request state update from service worker
  requestStateUpdate() {
    chrome.runtime.sendMessage({ action: 'getState' }).catch(() => {
      // Service worker might be starting, ignore errors
    });
  }

  updateUIFromState(state) {
    if (!state || !this.elements) return;

    const { isPlaying, isPaused, currentChunkIndex, totalChunks } = state;

    // Reset start button
    this.elements.startBtn.disabled = false;
    this.elements.startBtn.textContent = '▶ Read Page';

    // Update button visibility
    this.elements.startBtn.classList.toggle('hidden', isPlaying);
    this.elements.pauseBtn.classList.toggle('hidden', !isPlaying || isPaused);
    this.elements.resumeBtn.classList.toggle('hidden', !isPlaying || !isPaused);
    this.elements.stopBtn.classList.toggle('hidden', !isPlaying);
    this.elements.navControls.classList.toggle('hidden', !isPlaying);

    // Update navigation buttons
    if (totalChunks > 0) {
      this.elements.prevBtn.disabled = currentChunkIndex === 0;
      this.elements.nextBtn.disabled = currentChunkIndex >= totalChunks - 1;
    }
  }

  async startReading() {
    this.clearMessages();

    if (!this.apiKey) {
      this.showError('Please enter and save your API key first');
      this.elements.apiKeySection.classList.remove('hidden');
      this.elements.settingsSection.classList.add('hidden');
      return;
    }

    try {
      this.elements.startBtn.disabled = true;
      this.elements.startBtn.textContent = 'Extracting text...';

      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Extract text from page
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractText' });

      if (!response || !response.success || !response.text) {
        throw new Error('Could not extract text from this page');
      }

      const text = response.text.trim();
      if (text.length < 10) {
        throw new Error('Not enough text found on this page');
      }

      // Send to service worker
      const startResponse = await chrome.runtime.sendMessage({
        action: 'startReading',
        data: {
          text,
          apiKey: this.apiKey,
          voice: this.elements.voiceSelect.value,
          speed: parseFloat(this.elements.speedSlider.value),
          tabId: tab.id // Pass tab ID for highlighting
        }
      });

      if (!startResponse || !startResponse.success) {
        throw new Error(startResponse?.error || 'Failed to start reading');
      }

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
}

// Initialize popup
new TTSPopup();
