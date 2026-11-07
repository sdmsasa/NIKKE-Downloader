@echo off
title NIKKE Spine Downloader
cd /d "%~dp0"

echo ========================================================
echo   NIKKE Spine Downloader
echo   Starting server and opening browser...
echo ========================================================
echo.

call npm run dev

pause
