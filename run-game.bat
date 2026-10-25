@echo off
title Battle India Offline - Game Server
echo ========================================================
echo        STARTING BATTLE INDIA OFFLINE
echo ========================================================
echo.
echo 1. Building production assets...
call npm run build
echo.
echo 2. Launching offline game preview...
echo    Local:   http://localhost:3000
echo.
start http://localhost:3000
call npm run preview
pause
