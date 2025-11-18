/**
 * Options Page Controller
 * Manages API key configuration and validation
 */

class OptionsController {
  constructor() {
    this.elements = {};
    this.init();
  }

  async init() {
    this.cacheElements();
    this.setupEventListeners();
    await this.loadApiKey();
  }

  cacheElements() {
    this.elements = {
      apiKeyInput: document.getElementById('api-key'),
      toggleVisibilityBtn: document.getElementById('toggle-visibility'),
      saveBtn: document.getElementById('save-btn'),
      validateBtn: document.getElementById('validate-btn'),
      clearBtn: document.getElementById('clear-btn'),
      errorMessage: document.getElementById('error-message'),
      successMessage: document.getElementById('success-message')
    };
  }

  setupEventListeners() {
    this.elements.saveBtn.addEventListener('click', () => this.handleSave());
    this.elements.validateBtn.addEventListener('click', () => this.handleValidate());
    this.elements.clearBtn.addEventListener('click', () => this.handleClear());
    this.elements.toggleVisibilityBtn.addEventListener('click', () => this.toggleVisibility());

    // Save on Enter key
    this.elements.apiKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSave();
      }
    });
  }

  async loadApiKey() {
    try {
      const { apiKey } = await chrome.storage.sync.get('apiKey');
      if (apiKey) {
        this.elements.apiKeyInput.value = apiKey;
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  }

  async handleSave() {
    this.clearMessages();

    const apiKey = this.elements.apiKeyInput.value.trim();

    if (!apiKey) {
      this.showError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      this.showError('Invalid API key format. OpenAI keys start with "sk-"');
      return;
    }

    try {
      // Save to storage
      await chrome.storage.sync.set({ apiKey });

      // Notify background service worker
      await chrome.runtime.sendMessage({
        action: 'setApiKey',
        data: { apiKey }
      });

      this.showSuccess('API key saved successfully!');
    } catch (error) {
      console.error('Error saving API key:', error);
      this.showError('Failed to save API key: ' + error.message);
    }
  }

  async handleValidate() {
    this.clearMessages();

    const apiKey = this.elements.apiKeyInput.value.trim();

    if (!apiKey) {
      this.showError('Please enter an API key');
      return;
    }

    try {
      this.elements.validateBtn.disabled = true;
      this.elements.validateBtn.textContent = 'Validating...';

      const response = await chrome.runtime.sendMessage({
        action: 'validateApiKey',
        data: { apiKey }
      });

      if (response.success && response.isValid) {
        this.showSuccess('API key is valid!');
      } else {
        this.showError('API key is invalid or not working. Please check your key.');
      }
    } catch (error) {
      console.error('Error validating API key:', error);
      this.showError('Failed to validate API key: ' + error.message);
    } finally {
      this.elements.validateBtn.disabled = false;
      this.elements.validateBtn.textContent = 'Validate Key';
    }
  }

  async handleClear() {
    if (!confirm('Are you sure you want to clear your API key?')) {
      return;
    }

    try {
      await chrome.storage.sync.remove('apiKey');
      this.elements.apiKeyInput.value = '';
      this.showSuccess('API key cleared');
    } catch (error) {
      console.error('Error clearing API key:', error);
      this.showError('Failed to clear API key: ' + error.message);
    }
  }

  toggleVisibility() {
    const input = this.elements.apiKeyInput;
    const btn = this.elements.toggleVisibilityBtn;

    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = 'Hide';
    } else {
      input.type = 'password';
      btn.textContent = 'Show';
    }
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

// Initialize options page
new OptionsController();
