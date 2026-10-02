@echo off
setlocal
cd /d "%~dp0"
set "HOST=127.0.0.1"
set "PORT=8080"

echo Starting HYDEV Project Manager at http://%HOST%:%PORT%
start "HYDEV Project Manager Server" /min cmd /c "node server.js"
timeout /t 1 /nobreak >nul
set "APP_ID="
for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$app = Get-StartApps | Where-Object { $_.Name -in @('HYDEV Project Manager', 'HYDEV PM') } | Select-Object -First 1; if ($app) { $app.AppID }"`) do set "APP_ID=%%A"
if defined APP_ID (
  start "" explorer.exe "shell:AppsFolder\%APP_ID%"
) else (
  start "" "http://%HOST%:%PORT%/"
  echo HYDEV Project Manager is opening in your browser because the installed app was not found.
)
echo Close the HYDEV Project Manager Server window to stop it.
endlocal
