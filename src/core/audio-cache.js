import { MAX_CACHE_SIZE } from '../config/constants.js';

export class AudioCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, audioData) {
    this.cache.set(key, {
      data: audioData,
      lastUsed: Date.now()
    });
    this.manageSize();
  }

  get(key) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      entry.lastUsed = Date.now();
      return entry.data;
    }
    return null;
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }

  manageSize() {
    if (this.cache.size <= MAX_CACHE_SIZE) return;

    const sorted = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    const toRemove = sorted.slice(0, this.cache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }
}
