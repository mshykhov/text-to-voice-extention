import { validateSettings } from '../utils/validators.js';

export class StateManager {
  constructor() {
    this.state = {
      chunks: [],
      chunkPositions: [],
      currentChunkIndex: 0,
      isPlaying: false,
      isPaused: false,
      tabId: null,
      extractedText: '',
      extractedTextOffset: 0,
      settings: {
        apiKey: '',
        voice: 'alloy',
        speed: 1.0
      }
    };
    this.lastStopPosition = null;
  }

  getState() {
    return this.state;
  }

  getPublicState() {
    return {
      isPlaying: this.state.isPlaying,
      isPaused: this.state.isPaused,
      currentChunkIndex: this.state.currentChunkIndex,
      totalChunks: this.state.chunks.length
    };
  }

  updateSettings(settings) {
    const validation = validateSettings(settings);
    if (!validation.valid) {
      throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
    }
    this.state.settings = { ...this.state.settings, ...settings };
  }

  startPlayback(data) {
    const { text, apiKey, voice, speed, tabId, chunks, positions, extractedTextOffset = 0 } = data;

    this.updateSettings({ voice, speed });
    this.state.settings.apiKey = apiKey;
    this.state.tabId = tabId;
    this.state.extractedText = text;
    this.state.extractedTextOffset = extractedTextOffset;
    this.state.chunks = chunks;
    this.state.chunkPositions = positions;
    this.state.currentChunkIndex = 0;
    this.state.isPlaying = true;
    this.state.isPaused = false;

    this.lastStopPosition = null;
  }

  stop() {
    if (this.state.chunks.length > 0 && this.state.currentChunkIndex < this.state.chunks.length) {
      this.lastStopPosition = {
        chunkIndex: this.state.currentChunkIndex,
        extractedText: this.state.extractedText,
        extractedTextOffset: this.state.extractedTextOffset,
        chunks: this.state.chunks,
        positions: this.state.chunkPositions,
        tabId: this.state.tabId
      };
    }

    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentChunkIndex = 0;
    this.state.chunks = [];
  }

  hasLastPosition() {
    return this.lastStopPosition !== null;
  }

  resumePlayback() {
    if (!this.lastStopPosition) return false;

    const { chunkIndex, extractedText, extractedTextOffset, chunks, positions, tabId } = this.lastStopPosition;

    this.state.extractedText = extractedText;
    this.state.extractedTextOffset = extractedTextOffset || 0;
    this.state.chunks = chunks;
    this.state.chunkPositions = positions;
    this.state.currentChunkIndex = chunkIndex;
    this.state.tabId = tabId;
    this.state.isPlaying = true;
    this.state.isPaused = false;

    this.lastStopPosition = null;

    return true;
  }

  pause() {
    if (this.state.isPlaying && !this.state.isPaused) {
      this.state.isPaused = true;
    }
  }

  resume() {
    if (this.state.isPlaying && this.state.isPaused) {
      this.state.isPaused = false;
    }
  }

  nextChunk() {
    if (this.state.currentChunkIndex < this.state.chunks.length) {
      this.state.currentChunkIndex++;
      this.state.isPaused = false;
      return true;
    }
    return false;
  }

  previousChunk() {
    if (this.state.currentChunkIndex > 0) {
      this.state.currentChunkIndex--;
      this.state.isPaused = false;
      return true;
    }
    return false;
  }

  getCurrentChunk() {
    return this.state.chunks[this.state.currentChunkIndex];
  }

  getCurrentPosition() {
    return this.state.chunkPositions[this.state.currentChunkIndex];
  }

  canGoNext() {
    return this.state.currentChunkIndex < this.state.chunks.length - 1;
  }

  canGoPrevious() {
    return this.state.currentChunkIndex > 0;
  }
}
