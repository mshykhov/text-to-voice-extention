# 📦 Packaging Guide

## Quick Package

### Linux/WSL/Mac:
```bash
npm run package
```

### Windows (CMD/PowerShell):
```bash
npm run package:win
```

## What it does:

1. Creates `text-to-voice-extension.zip` (30KB)
2. Copies to `C:\Users\Myron\Dropbox\myron\pc\ttl-extention\`
3. Saves timestamped backup (e.g., `text-to-voice-extension_20251118_164406.zip`)

## Install on iOS Orion:

1. **On iPhone:**
   - Open Dropbox app
   - Navigate to `myron/pc/ttl-extention/`
   - Tap on `text-to-voice-extension.zip`
   - Share → Save to Files

2. **In Orion Browser:**
   - Settings → Extensions
   - Tap "+" or "Install Extension"
   - Browse to Files → select the .zip
   - Grant permissions
   - Enable extension

## Manual Packaging:

If npm scripts don't work, run directly:

**Linux/WSL:**
```bash
bash scripts/package-extension.sh
```

**Windows:**
```cmd
scripts\package-extension.bat
```

## Files Included in Package:

- `manifest.json` - Extension manifest
- `icons/` - Extension icons
- `src/` - All source code
- `scripts/generate-icons.js` - Icon generator

## Files Excluded:

- `.git/`, `.claude/`, `.aim/`
- `node_modules/`
- `tests/`
- Documentation (*.md)
- Development files
