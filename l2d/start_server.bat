@echo off
title NIKKE Live2D Downloader
cd /d "%~dp0"

echo ========================================================
echo   NIKKE Live2D Downloader
echo   Starting server and opening browser...
echo ========================================================
echo.

call npm run dev

pause
