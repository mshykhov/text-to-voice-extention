import { DEFAULT_SENTENCES_PER_CHUNK } from '../config/constants.js';
import { StateManager } from '../core/state-manager.js';
import { AudioCache } from '../core/audio-cache.js';
import { generateAudio } from '../api/openai-client.js';
import { chunkTextBySentences } from '../utils/text-chunker.js';

let prefetchAbortController = new AbortController();
let currentPlaybackOperationId = 0;
let prefetchInProgress = new Set();

const stateManager = new StateManager();
const audioCache = new AudioCache();

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

    case 'updateSettings':
      stateManager.updateSettings({ voice: message.voice, speed: message.speed });
      audioCache.clear();
      prefetchAbortController.abort();
      prefetchAbortController = new AbortController();
      prefetchInProgress.clear();
      sendResponse({ success: true });
      return false;

    case 'chunkFinished':
      handleChunkFinished();
      return false;

    case 'resumeReading':
      handleResumeReading()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'readFromSelection':
      handleReadFromSelection(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'hasLastPosition':
      sendResponse({ hasPosition: stateManager.hasLastPosition() });
      return false;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const state = stateManager.getState();
  if (!state.isPlaying || state.tabId !== tabId) return;

  const isNavigating = changeInfo.status === 'loading';
  const urlChanged = changeInfo.url !== undefined;

  if (isNavigating || urlChanged) {
    console.log('[TTS] Tab navigation detected, stopping playback:', { tabId, urlChanged, newUrl: changeInfo.url });
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
    extractedTextOffset: state.extractedTextOffset,
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

function validatePlaybackData(apiKey, text) {
  if (!apiKey) throw new Error('API key required');
  if (!text || text.length < 10) throw new Error('Not enough text');
}

function initializePlayback(chunks, positions, extractedText, extractedTextOffset, apiKey, voice, speed, tabId) {
  stateManager.startPlayback({
    text: extractedText,
    apiKey,
    voice,
    speed,
    tabId,
    chunks,
    positions,
    extractedTextOffset
  });
  audioCache.clear();
  notifyStateChange();

  const operationId = ++currentPlaybackOperationId;
  return operationId;
}

async function handleStartReading(data) {
  const { text, apiKey, voice, speed, tabId } = data;

  validatePlaybackData(apiKey, text);

  const { chunks, positions } = chunkTextBySentences(text, { defaultSentences: DEFAULT_SENTENCES_PER_CHUNK });
  const operationId = initializePlayback(chunks, positions, text, 0, apiKey, voice, speed, tabId);

  await playNextChunk(operationId);
}

async function playNextChunk(operationId) {
  const state = stateManager.getState();
  if (!state.isPlaying || operationId !== currentPlaybackOperationId) return;

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
      const chunk = stateManager.getCurrentChunk();
      audioData = await generateAudio(chunk, state.settings);

      if (operationId !== currentPlaybackOperationId) return;
    }

    prefetchAdjacentChunks(currentIndex);

    const result = await chrome.tabs.sendMessage(state.tabId, {
      action: 'playAudio',
      operationId,
      data: { audioData: Array.from(new Uint8Array(audioData)) }
    });

    if (!result || !result.success) {
      throw new Error(result?.error || 'Playback failed');
    }

  } catch (error) {
    console.error('Chunk playback error:', error);
    await handleStop();
    throw error;
  }
}

function prefetchAdjacentChunks(currentIndex) {
  const state = stateManager.getState();

  const prevIndex = currentIndex - 1;
  if (prevIndex >= 0 && !audioCache.has(prevIndex)) {
    prefetchChunk(prevIndex);
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex < state.chunks.length && !audioCache.has(nextIndex)) {
    prefetchChunk(nextIndex);
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
  playNextChunk(currentPlaybackOperationId);
}

async function handleStop() {
  const state = stateManager.getState();

  stateManager.stop();

  currentPlaybackOperationId++;

  prefetchAbortController.abort();
  prefetchAbortController = new AbortController();

  audioCache.clear();
  prefetchInProgress.clear();

  await clearHighlight();

  if (state.tabId) {
    chrome.tabs.sendMessage(state.tabId, { action: 'stop' }).catch(() => {});
  }

  notifyStateChange();
}

async function handlePause() {
  const state = stateManager.getState();

  stateManager.pause();

  if (state.tabId) {
    await chrome.tabs.sendMessage(state.tabId, { action: 'pause' });
  }

  notifyStateChange();
}

async function handleResume() {
  const state = stateManager.getState();

  stateManager.resume();

  if (state.tabId) {
    await chrome.tabs.sendMessage(state.tabId, { action: 'resume' });
  }

  notifyStateChange();
}

async function handlePreviousChunk() {
  if (!stateManager.canGoPrevious()) return;

  const state = stateManager.getState();
  if (state.tabId) {
    chrome.tabs.sendMessage(state.tabId, { action: 'stop' }).catch(() => {});
  }

  stateManager.previousChunk();

  const operationId = ++currentPlaybackOperationId;
  await playNextChunk(operationId);
}

async function handleNextChunk() {
  if (!stateManager.canGoNext()) return;

  const state = stateManager.getState();
  if (state.tabId) {
    chrome.tabs.sendMessage(state.tabId, { action: 'stop' }).catch(() => {});
  }

  stateManager.nextChunk();

  const operationId = ++currentPlaybackOperationId;
  await playNextChunk(operationId);
}

async function handleResumeReading() {
  if (!stateManager.resumePlayback()) {
    throw new Error('No saved position to resume from');
  }

  audioCache.clear();
  notifyStateChange();

  const operationId = ++currentPlaybackOperationId;
  await playNextChunk(operationId);
}

async function handleReadFromSelection(data) {
  const { selectionPosition, text, apiKey, voice, speed, tabId } = data;

  validatePlaybackData(apiKey, text);

  await handleStop();

  let extractedTextOffset = 0;
  let extractedText = text;

  if (selectionPosition !== null && selectionPosition !== undefined) {
    extractedText = text.substring(selectionPosition);
    extractedTextOffset = selectionPosition;
  }

  const { chunks, positions } = chunkTextBySentences(extractedText, { defaultSentences: DEFAULT_SENTENCES_PER_CHUNK });
  const operationId = initializePlayback(chunks, positions, extractedText, extractedTextOffset, apiKey, voice, speed, tabId);

  await playNextChunk(operationId);
}

async function handleContextMenuClick(info, tab) {
  if (info.menuItemId !== 'read-from-here' || !info.selectionText) return;

  try {
    const [textResponse, positionResponse] = await Promise.all([
      chrome.tabs.sendMessage(tab.id, { action: 'extractText' }),
      chrome.tabs.sendMessage(tab.id, { action: 'getSelectionPosition' })
    ]);

    if (!textResponse?.success || !textResponse.text) {
      console.error('Could not extract text');
      return;
    }

    const settings = await chrome.storage.sync.get(['apiKey', 'voice', 'speed']);

    if (!settings.apiKey) {
      console.error('No API key found');
      return;
    }

    await handleReadFromSelection({
      selectionPosition: positionResponse?.position,
      text: textResponse.text,
      apiKey: settings.apiKey,
      voice: settings.voice || 'alloy',
      speed: settings.speed || 1.0,
      tabId: tab.id
    });
  } catch (error) {
    console.error('Read from selection error:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'read-from-here',
    title: 'Read from here',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
