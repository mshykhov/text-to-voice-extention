# Text-to-Voice Reader

A minimalist browser extension that reads any webpage aloud using OpenAI TTS API.

## Features

✨ **Minimalist Design** - Clean, simple interface with only essential controls
🎯 **Smart Text Highlighting** - See exactly what's being read on the page
⏮⏭ **Chunk Navigation** - Skip forward/backward through text sections
🎛 **Essential Controls** - Play, Pause, Stop, Previous, Next
🗣 **5 Voices** - Choose from Alloy, Echo, Nova, Onyx, Shimmer
⚡ **Speed Control** - 0.5x to 2.0x playback speed
🧠 **Smart Caching** - Prefetches next chunks for seamless playback
📱 **Background Playback** - Works even when popup is closed
🔍 **Smart Text Extraction** - Automatically finds main content, skips navigation/ads

## Quick Start

1. **Install Extension**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this folder

2. **Setup API Key**
   - Click extension icon
   - Enter your OpenAI API key
   - Click "Save"
   - Get your key at: https://platform.openai.com/api-keys

3. **Use**
   - Navigate to any webpage
   - Click extension icon
   - Click "▶ Read Page"
   - Use controls to navigate (⏮, ⏸, ⏭)

## Architecture

```
text-to-voice-extension/
├── manifest.json
├── src/
│   ├── config/
│   │   └── constants.js          # Centralized configuration
│   ├── core/
│   │   ├── state-manager.js      # Playback state management
│   │   └── audio-cache.js        # LRU cache implementation
│   ├── api/
│   │   └── openai-client.js      # OpenAI API integration
│   ├── utils/
│   │   ├── text-chunker.js       # Text chunking logic
│   │   └── text-processor.js     # Text normalization
│   ├── background/
│   │   └── service-worker.js     # Orchestration layer
│   ├── content/
│   │   └── content-script.js     # Text extraction & highlighting
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── offscreen/
│   │   ├── offscreen.html
│   │   └── offscreen.js
│   └── options/
│       ├── options.html
│       ├── options.css
│       └── options.js
├── tests/
│   ├── test-text-chunker.js
│   ├── test-text-processor.js
│   └── test-audio-cache.js
└── icons/
```

## Key Improvements

### 1. Minimalist UI
- Removed clutter (model selection, chunk size slider)
- Fixed settings: TTS-1 model, 3 sentences per chunk
- Clean, focused interface
- Auto-hide API key section when configured

### 2. Chunk Navigation
- ⏮ Previous button - go back to previous chunk
- ⏭ Next button - skip to next chunk
- Smart state management - buttons disabled at boundaries
- Seamless playback when navigating

### 3. Text Highlighting
- Current chunk highlighted on page with subtle purple background
- Auto-scroll to highlighted text
- Smart text matching (handles whitespace differences)
- Auto-cleanup when playback stops

### 4. Improved Cache Management
- Limited to 3 chunks max (prevents memory issues)
- LRU (Least Recently Used) eviction
- Prefetches next 2 chunks for smooth playback
- Auto-cleanup on stop/navigation

### 5. Robust Stop/Pause Handling
- Complete state reset on stop
- Cache cleared properly
- Highlighting removed
- No memory leaks

## Testing

### Run Unit Tests
```bash
node tests/test-text-chunker.js
node tests/test-text-processor.js
node tests/test-audio-cache.js
```

Tests cover:
- ✅ Text chunking by sentences
- ✅ Text normalization and cleaning
- ✅ LRU cache eviction
- ✅ Position tracking

### Manual Testing Checklist

**Basic Playback:**
- [ ] Start reading - audio plays
- [ ] Pause - audio pauses
- [ ] Resume - audio resumes
- [ ] Stop - audio stops, state resets

**Navigation:**
- [ ] Next button works (skips to next chunk)
- [ ] Previous button works (goes back to previous chunk)
- [ ] Buttons disabled at first/last chunk
- [ ] Navigation updates progress correctly

**Text Highlighting:**
- [ ] Current chunk highlighted on page
- [ ] Highlight moves when navigating chunks
- [ ] Highlight cleared when stopped
- [ ] Auto-scrolls to highlighted text

**UI/UX:**
- [ ] Progress bar updates correctly
- [ ] Progress text shows "Chunk X / Y"
- [ ] Start button disabled during playback
- [ ] Controls appear/disappear correctly

**Edge Cases:**
- [ ] Works with very short text
- [ ] Works with very long articles
- [ ] Handles pages with complex layouts
- [ ] Works when popup is closed
- [ ] Recovers from API errors gracefully

## Debugging

### Console Logs

**Content Script (Page):**
```bash
F12 → Console → Filter: "[TTS Content Script]"
```

**Service Worker (Background):**
```bash
chrome://extensions/ → "service worker" link
```

**Offscreen (Audio Player):**
```bash
chrome://extensions/ → "offscreen.html" link
```

### Common Issues

**No text extracted:**
- Check content script console for selector info
- Page might have unusual structure
- Add custom selector in `content-script.js`

**Highlighting doesn't work:**
- Text might have changed since extraction
- Complex page layouts can cause issues
- Check content script console for errors

**Audio doesn't play:**
- Check service worker created offscreen document
- Verify OpenAI API key is valid
- Check network tab for API errors

**Navigation buttons don't work:**
- Check service worker console for errors
- Verify chunk state is correct
- Test with longer text (more chunks)

## Configuration

### Default Settings
Configuration in `src/config/constants.js`:
```javascript
DEFAULT_MODEL = 'tts-1'      // Cheapest, fastest
DEFAULT_CHUNK_SIZE = 3       // 3 sentences per chunk
MAX_CACHE_SIZE = 2           // Max 2 chunks in memory
```

### User Settings (Stored)
- API Key
- Voice (alloy, echo, nova, onyx, shimmer)
- Speed (0.5x - 2.0x)

## API Usage

**Cost per chunk:**
- TTS-1: ~$0.015 per 1000 chars
- Typical article: 5000 chars = ~$0.075

**Tips to reduce costs:**
- Use TTS-1 (not TTS-1-HD)
- Increase chunk size (fewer API calls)
- Cache works great for navigation

## Browser Compatibility

- ✅ Chrome
- ✅ Edge
- ⚠️ Firefox (needs Manifest V3 support)
- ⚠️ Safari (needs testing)

## License

MIT
