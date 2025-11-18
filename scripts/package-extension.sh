#!/bin/bash

# Text-to-Voice Extension Packaging Script
# Creates a zip file and copies to Dropbox

set -e

PROJECT_DIR="/mnt/c/Users/Myron/IdeaProjects/text-to-voice-extention"
DROPBOX_DIR="/mnt/c/Users/Myron/Dropbox/myron/pc/ttl-extention"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="text-to-voice-extension.zip"
ZIP_NAME_TIMESTAMPED="text-to-voice-extension_${TIMESTAMP}.zip"

echo "📦 Packaging Text-to-Voice Extension..."

cd "$PROJECT_DIR"

# Create Dropbox directory if it doesn't exist
mkdir -p "$DROPBOX_DIR"

# Remove old zip if exists
rm -f "$ZIP_NAME"

# Create zip using Python (works on WSL without zip command)
echo "Creating zip archive..."
python3 -m zipfile -c "$ZIP_NAME" \
  manifest.json \
  icons/ \
  src/ \
  scripts/generate-icons.js

# Copy to Dropbox with current name
echo "Copying to Dropbox..."
cp "$ZIP_NAME" "$DROPBOX_DIR/$ZIP_NAME"

# Also save timestamped version for history
cp "$ZIP_NAME" "$DROPBOX_DIR/$ZIP_NAME_TIMESTAMPED"

# Show result
ZIP_SIZE=$(ls -lh "$ZIP_NAME" | awk '{print $5}')
echo ""
echo "✅ Done!"
echo "   File: $ZIP_NAME ($ZIP_SIZE)"
echo "   Location: $DROPBOX_DIR"
echo "   Timestamped: $ZIP_NAME_TIMESTAMPED"
echo ""
echo "📲 To install on iOS Orion:"
echo "   1. Open Dropbox on iPhone"
echo "   2. Find ttl-extention/$ZIP_NAME"
echo "   3. Share → Save to Files"
echo "   4. Orion → Extensions → Install from file"
