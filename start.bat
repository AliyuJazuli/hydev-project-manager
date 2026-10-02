@echo off
title HYDEV Project Manager
echo ============================================
echo   HYDEV Project Manager
echo ============================================
echo.
cd /d "%~dp0"

REM Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo Download it from: https://nodejs.org
    echo Install the LTS version, then run this file again.
    pause
    exit /b
)

REM If a server is already answering on 8080 (e.g. left running from a
REM previous launch), don't start a second one - just open the app.
set "SERVER_UP=0"
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri http://127.0.0.1:8080/api/health -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 set "SERVER_UP=1"

if "%SERVER_UP%"=="1" (
    echo Server already running - opening app...
) else (
    echo Starting local server in the background...
    start "HYDEV Server" /min cmd /c "node server.js"
    echo   ^(it keeps running in that minimized window - close it to stop the server^)
    timeout /t 2 /nobreak >nul
)
echo.

REM Open as an app-style window (no tabs/address bar) if Edge or Chrome is
REM installed, so it looks and feels like the installed app rather than a
REM plain browser tab. Falls back to your default browser otherwise.
set "EDGE_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_PATH%" set "EDGE_PATH=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if exist "%CHROME_PATH%" (
    start "" "%CHROME_PATH%" --app="http://localhost:8080/"
) else (
    start "" "http://localhost:8080/"
)

echo Running at: http://localhost:8080
echo You can close this window - the server stays up in its own minimized window.