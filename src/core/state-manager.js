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
      settings: {
        apiKey: '',
        voice: 'alloy',
        speed: 1.0
      }
    };
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
    this.state.settings = { ...this.state.settings, ...settings };
  }

  startPlayback(data) {
    const { text, apiKey, voice, speed, tabId, chunks, positions } = data;

    this.state.settings = { apiKey, voice, speed };
    this.state.tabId = tabId;
    this.state.extractedText = text;
    this.state.chunks = chunks;
    this.state.chunkPositions = positions;
    this.state.currentChunkIndex = 0;
    this.state.isPlaying = true;
    this.state.isPaused = false;
  }

  stop() {
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentChunkIndex = 0;
    this.state.chunks = [];
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
    if (this.state.currentChunkIndex < this.state.chunks.length - 1) {
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
