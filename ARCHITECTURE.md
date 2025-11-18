# Architecture

## Overview

Text-to-Voice extension follows a modular architecture with clear separation of concerns.

## Directory Structure

```
src/
├── config/           # Configuration constants
├── core/             # Core business logic
├── api/              # External API integration
├── utils/            # Shared utilities
├── background/       # Service worker orchestration
├── content/          # Page interaction
├── popup/            # User interface
├── offscreen/        # Audio playback
└── options/          # Settings page
```

## Module Responsibilities

### `src/config/constants.js`
- Centralized configuration
- Default model, chunk size, cache size

### `src/core/state-manager.js`
- Playback state management
- State transitions (play, pause, stop)
- Chunk navigation

### `src/core/audio-cache.js`
- LRU (Least Recently Used) cache
- Efficient memory management
- Automatic eviction

### `src/api/openai-client.js`
- OpenAI TTS API integration
- Audio generation
- Error handling

### `src/utils/text-chunker.js`
- Text chunking by sentences
- Position tracking

### `src/utils/text-processor.js`
- Text normalization
- Text cleaning
- Position mapping

### `src/background/service-worker.js`
- Orchestration layer
- Message routing
- Offscreen document management
- Prefetching logic

### `src/content/content-script.js`
- Page text extraction
- CSS Highlights API
- Auto-scrolling
- **Note:** Contains inline utility functions (cleanText, normalizeText, findOriginalPosition) due to Chrome extension content script limitations with ES6 imports

### `src/popup/popup.js`
- User interface controller
- Settings management
- State synchronization

### `src/offscreen/offscreen.js`
- Audio playback
- Web Audio API

### `src/options/options.js`
- API key management
- Settings persistence

## Design Principles

1. **Single Responsibility** - Each module has one clear purpose
2. **Modularity** - Code is organized into reusable modules
3. **Testability** - All modules export functions for unit testing
4. **Maintainability** - Clear structure makes code easy to understand
5. **Scalability** - Easy to add new features without breaking existing code

## Data Flow

1. **User action** → popup.js
2. **Extract text** → content-script.js
3. **Chunk text** → utils/text-chunker.js
4. **Update state** → core/state-manager.js
5. **Generate audio** → api/openai-client.js
6. **Cache audio** → core/audio-cache.js
7. **Play audio** → offscreen/offscreen.js
8. **Highlight text** → content-script.js

## Testing

Each module has corresponding unit tests in `tests/`:
- `test-text-chunker.js`
- `test-text-processor.js`
- `test-audio-cache.js`

Run tests: `npm test`
