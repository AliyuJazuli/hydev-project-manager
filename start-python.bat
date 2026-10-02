@echo off
title HYDEV Project Manager
color 0A
echo.
echo  ========================================
echo      HYDEV Project Manager
echo  ========================================
echo.
echo  Starting local server...
echo.

:: Try Python 3
python -m http.server 8000
