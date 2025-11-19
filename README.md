# Text-to-Voice Reader

Browser extension that reads any webpage aloud using OpenAI TTS API.

## Features

- 🎯 Smart text highlighting - see what's being read
- ⏮⏭ Chunk navigation - skip forward/backward
- 🗣 6 voices - Alloy, Echo, Fable, Nova, Onyx, Shimmer
- ⚡ Speed control - 0.25x to 2.0x
- 🧠 Smart prefetch - seamless playback
- 📱 iOS compatible - works on Orion browser
- 🎵 Media controls - iOS lock screen support
- ⌨️ Keyboard shortcut - Cmd+Shift+S (Mac) / Ctrl+Shift+S (PC)

## Installation

### Chrome/Edge/Brave

**Option 1: From Release (recommended)**
1. Go to [Releases](../../releases)
2. Download `text-to-voice-extension.zip`
3. Unzip the file
4. Open `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" → select unzipped folder
7. Get API key: https://platform.openai.com/api-keys

**Option 2: From Source**
1. Clone this repo
2. Follow steps 4-7 above

### iOS Orion

1. Go to [Releases](../../releases)
2. Download `text-to-voice-extension.zip` (keep zipped)
3. Transfer to iPhone via AirDrop/Dropbox/iCloud
4. Orion → Extensions → Install from file → select zip

## Usage

1. Click extension icon
2. Enter OpenAI API key (first time)
3. Navigate to any webpage
4. Click "Read Page"
5. Use controls: ⏮ ⏸ ⏭ ⏹

**Shortcuts:**
- `Cmd/Ctrl + Shift + S` - Start reading
- Right-click selection → "Read from here"

## Settings

**Performance (Advanced Settings):**
- Conservative - 2 chunks, minimal API usage
- Balanced - 5 chunks (recommended for desktop)
- Aggressive - 15 chunks (recommended for iOS/mobile)
- All - entire page upfront

## API Cost

OpenAI TTS pricing:
- Standard: $0.015 per 1,000 characters
- HD: $0.030 per 1,000 characters

Example: 10,000 character article = $0.15 (standard)

## Browser Support

- ✅ Chrome, Edge, Brave
- ✅ iOS Orion
- ⚠️ Firefox (Manifest V3 required)
- ⚠️ Safari (not tested)

## License

MIT
