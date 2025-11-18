# Text-to-Voice Extension

## Project Overview

Browser extension that converts any web page text into audio using OpenAI TTS API.

## Goal

Create a cross-browser extension (Chrome/Firefox/Safari/Orion) that allows users to listen to any web content as high-quality audio with one click.

## Core Features

- Extract readable text from any webpage
- Convert text to speech using OpenAI TTS API
- Playback controls: play, pause, resume, stop
- Multiple voice options (6 voices)
- Adjustable speed (0.75x - 1.5x)
- Quality selection (standard/HD)
- Secure API key storage
- Smart text chunking for long articles

## Architecture

**Modular Manifest V3 Structure:**
- `src/config/` - Centralized configuration
- `src/core/` - Core business logic (state, cache)
- `src/api/` - External API integration (OpenAI)
- `src/utils/` - Shared utilities (text processing, chunking)
- `src/background/` - Service worker orchestration
- `src/content/` - Content script for page interaction
- `src/popup/` - User interface
- `src/offscreen/` - Audio playback context
- `src/options/` - Settings page

## Technical Stack

- Pure JavaScript (ES6 modules)
- Chrome Extension API (Manifest V3)
- OpenAI TTS API (REST)
- Web Audio API for playback

## User Flow

1. User installs extension
2. User configures OpenAI API key in settings
3. User navigates to any webpage
4. User clicks extension icon and selects "Read Page"
5. Extension extracts text, sends to OpenAI in chunks
6. Audio plays back seamlessly across chunks
7. User controls playback via popup interface

## Best Practices

- Follow Manifest V3 standards
- Modular architecture with clear separation of concerns
- Secure credential storage via chrome.storage.sync
- Error handling at all API boundaries
- Clean text extraction (skip nav, footer, scripts)
- Efficient chunking (4000 char max per OpenAI request)
