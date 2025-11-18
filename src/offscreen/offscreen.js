let currentAudio = null;

chrome.runtime.sendMessage({ action: 'offscreenReady' }).catch(() => {});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  try {
    if (message.action === 'playAudio') {
      if (currentAudio) {
        stopAudio();
      }

      playAudio(message.data.audioData)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.action === 'stop') {
      stopAudio();
      sendResponse({ success: true, stopped: true });
      return false;
    }

    if (message.action === 'pause') {
      pauseAudio();
      sendResponse({ success: true, paused: true });
      return false;
    }

    if (message.action === 'resume') {
      resumeAudio()
        .then(() => sendResponse({ success: true, resumed: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }

    sendResponse({ success: false, error: 'Unknown action' });
    return false;
  } catch (error) {
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

async function playAudio(audioDataArray) {
  return new Promise((resolve, reject) => {
    const audioData = new Uint8Array(audioDataArray).buffer;
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);

    currentAudio = new Audio(url);

    // Handle audio completion (sends chunkFinished event)
    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;

      chrome.runtime.sendMessage({ action: 'chunkFinished' }).catch(() => {});
    };

    currentAudio.onerror = (error) => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      reject(new Error('Playback failed'));
    };

    // Resolve immediately after play() starts, not after it ends
    currentAudio.play()
      .then(() => resolve())
      .catch(reject);
  });
}

function stopAudio() {
  if (!currentAudio) {
    return;
  }

  currentAudio.pause();
  currentAudio.onended = null;
  currentAudio.onerror = null;

  if (currentAudio.src) {
    URL.revokeObjectURL(currentAudio.src);
  }

  currentAudio = null;
}

function pauseAudio() {
  if (currentAudio) {
    currentAudio.pause();
  }
}

async function resumeAudio() {
  if (!currentAudio) {
    throw new Error('No audio to resume');
  }
  await currentAudio.play();
}
