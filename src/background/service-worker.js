import { OFFSCREEN_DOCUMENT_PATH, DEFAULT_CHUNK_SIZE } from '../config/constants.js';
import { StateManager } from '../core/state-manager.js';
import { AudioCache } from '../core/audio-cache.js';
import { generateAudio } from '../api/openai-client.js';
import { chunkTextBySentences } from '../utils/text-chunker.js';

let creating;
let prefetchAbortController = new AbortController();
let offscreenReady = null;
let resolveOffscreenReady = null;
let currentPlaybackOperationId = 0;
let prefetchInProgress = new Set();

const stateManager = new StateManager();
const audioCache = new AudioCache();

function resetOffscreenReady() {
  offscreenReady = new Promise(resolve => {
    resolveOffscreenReady = resolve;
  });
}

resetOffscreenReady();

async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) return;

  if (creating) {
    await creating;
  } else {
    resetOffscreenReady();
    creating = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Playing TTS audio in background'
    });
    await creating;
    creating = null;
  }

  await offscreenReady;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startReading':
      handleStartReading(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => {
          console.error('Start reading error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'stop':
      handleStop()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'pause':
      handlePause()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'resume':
      handleResume()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'previousChunk':
      handlePreviousChunk()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'nextChunk':
      handleNextChunk()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getState':
      notifyStateChange();
      return false;

    case 'chunkFinished':
      handleChunkFinished();
      return false;

    case 'offscreenReady':
      if (resolveOffscreenReady) {
        resolveOffscreenReady();
        resolveOffscreenReady = null;
      }
      return false;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const state = stateManager.getState();
  if (changeInfo.status === 'loading' && state.isPlaying && state.tabId === tabId) {
    handleStop();
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const state = stateManager.getState();
  if (state.isPlaying && state.tabId === tabId) {
    handleStop();
  }
});

function notifyStateChange() {
  chrome.runtime.sendMessage({
    action: 'stateChanged',
    state: stateManager.getPublicState()
  }).catch(() => {});
}

async function highlightCurrentChunk() {
  const state = stateManager.getState();
  if (!state.tabId || state.chunks.length === 0) return;

  const position = stateManager.getCurrentPosition();

  chrome.tabs.sendMessage(state.tabId, {
    action: 'highlightText',
    extractedText: state.extractedText,
    start: position.start,
    end: position.end
  }).catch(() => {});
}

async function clearHighlight() {
  const state = stateManager.getState();
  if (!state.tabId) return;

  chrome.tabs.sendMessage(state.tabId, {
    action: 'clearHighlight'
  }).catch(() => {});
}

async function handleStartReading(data) {
  const { text, apiKey, voice, speed, tabId } = data;

  if (!apiKey) throw new Error('API key required');
  if (!text || text.length < 10) throw new Error('Not enough text');

  const { chunks, positions } = chunkTextBySentences(text, DEFAULT_CHUNK_SIZE);

  stateManager.startPlayback({ text, apiKey, voice, speed, tabId, chunks, positions });
  audioCache.clear();
  notifyStateChange();

  await playNextChunk();
}

async function playNextChunk(operationId = null) {
  const state = stateManager.getState();
  if (!state.isPlaying) return;

  if (state.currentChunkIndex >= state.chunks.length) {
    await handleStop();
    return;
  }

  notifyStateChange();
  await highlightCurrentChunk();

  try {
    let audioData;
    const currentIndex = state.currentChunkIndex;

    if (audioCache.has(currentIndex)) {
      audioData = audioCache.get(currentIndex);
    } else {
      if (operationId !== null && operationId !== currentPlaybackOperationId) return;

      const chunk = stateManager.getCurrentChunk();
      audioData = await generateAudio(chunk, state.settings);

      if (operationId !== null && operationId !== currentPlaybackOperationId) return;
    }

    prefetchNextChunks(currentIndex);

    await setupOffscreenDocument();
    const result = await sendToOffscreen({
      action: 'playAudio',
      data: { audioData: Array.from(new Uint8Array(audioData)) }
    });

    if (!result.success) {
      throw new Error(result.error || 'Playback failed');
    }

  } catch (error) {
    console.error('Chunk playback error:', error);
    await handleStop();
    throw error;
  }
}

function prefetchNextChunks(currentIndex) {
  const state = stateManager.getState();

  for (let i = 1; i <= 2; i++) {
    const nextIndex = currentIndex + i;
    if (nextIndex < state.chunks.length && !audioCache.has(nextIndex)) {
      prefetchChunk(nextIndex);
    }
  }
}

function prefetchChunk(index) {
  const state = stateManager.getState();

  if (index >= state.chunks.length || audioCache.has(index) || prefetchInProgress.has(index)) {
    return;
  }

  prefetchInProgress.add(index);

  (async () => {
    try {
      const chunk = state.chunks[index];
      const audioData = await generateAudio(chunk, state.settings, prefetchAbortController.signal);

      if (state.isPlaying && index > state.currentChunkIndex) {
        audioCache.set(index, audioData);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(`Prefetch error for chunk ${index + 1}:`, error);
      }
    } finally {
      prefetchInProgress.delete(index);
    }
  })();
}

function handleChunkFinished() {
  const state = stateManager.getState();
  if (!state.isPlaying || state.isPaused) return;

  stateManager.nextChunk();
  playNextChunk();
}

async function handleStop() {
  stateManager.stop();

  currentPlaybackOperationId++;

  prefetchAbortController.abort();
  prefetchAbortController = new AbortController();

  audioCache.clear();
  prefetchInProgress.clear();

  await clearHighlight();
  await sendToOffscreen({ action: 'stop' });

  notifyStateChange();
}

async function handlePause() {
  stateManager.pause();
  await sendToOffscreen({ action: 'pause' });
  notifyStateChange();
}

async function handleResume() {
  stateManager.resume();
  await sendToOffscreen({ action: 'resume' });
  notifyStateChange();
}

async function handlePreviousChunk() {
  if (!stateManager.canGoPrevious()) return;

  sendToOffscreen({ action: 'stop' }).catch(() => {});

  stateManager.previousChunk();

  const operationId = ++currentPlaybackOperationId;
  await playNextChunk(operationId);
}

async function handleNextChunk() {
  if (!stateManager.canGoNext()) return;

  sendToOffscreen({ action: 'stop' }).catch(() => {});

  stateManager.nextChunk();

  const operationId = ++currentPlaybackOperationId;
  await playNextChunk(operationId);
}

async function sendToOffscreen(message) {
  await setupOffscreenDocument();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout' });
    }, 10000);

    chrome.runtime.sendMessage(message, response => {
      clearTimeout(timeout);

      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      resolve(response || { success: true });
    });
  });
}
