@echo off
REM Text-to-Voice Extension Packaging Script for Windows
REM Creates a zip file and copies to Dropbox

setlocal enabledelayedexpansion

set PROJECT_DIR=%~dp0..
set DROPBOX_DIR=C:\Users\Myron\Dropbox\myron\pc\ttl-extention
set ZIP_NAME=text-to-voice-extension.zip

echo.
echo 📦 Packaging Text-to-Voice Extension...
echo.

cd /d "%PROJECT_DIR%"

REM Create Dropbox directory if it doesn't exist
if not exist "%DROPBOX_DIR%" mkdir "%DROPBOX_DIR%"

REM Remove old zip if exists
if exist "%ZIP_NAME%" del /f "%ZIP_NAME%"

REM Create zip using Python
echo Creating zip archive...
python -m zipfile -c "%ZIP_NAME%" manifest.json icons src scripts/generate-icons.js

if errorlevel 1 (
    echo ❌ Error creating zip file
    pause
    exit /b 1
)

REM Copy to Dropbox
echo Copying to Dropbox...
copy /y "%ZIP_NAME%" "%DROPBOX_DIR%\%ZIP_NAME%"

if errorlevel 1 (
    echo ❌ Error copying to Dropbox
    pause
    exit /b 1
)

REM Also save timestamped version
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%mydate%_%mytime%
copy /y "%ZIP_NAME%" "%DROPBOX_DIR%\text-to-voice-extension_%TIMESTAMP%.zip"

echo.
echo ✅ Done!
echo    File: %ZIP_NAME%
echo    Location: %DROPBOX_DIR%
echo.
echo 📲 To install on iOS Orion:
echo    1. Open Dropbox on iPhone
echo    2. Find ttl-extention/%ZIP_NAME%
echo    3. Share -^> Save to Files
echo    4. Orion -^> Extensions -^> Install from file
echo.
pause
