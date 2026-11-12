@echo off
rem QA Academy launcher: starts the local server (if needed) and opens the course in your browser.
title QA Academy - keep this window open while studying
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org and try again.
  pause
  exit /b 1
)

rem Server already running? Then just open the browser.
netstat -ano | findstr /r /c:":5173 .*LISTENING" >nul
if not errorlevel 1 (
  start "" "http://localhost:5173"
  exit /b 0
)

if not exist "node_modules\" (
  echo Installing dependencies - first start only, takes about a minute...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo npm install failed. See the messages above.
    pause
    exit /b 1
  )
)

rem Playwright browser for the automation labs (module 15+), kept in lab\.browsers. Quick no-op when it is already there.
echo Checking the Playwright browser (the first time it downloads about 150 MB)...
call npm run lab:setup --silent
if errorlevel 1 echo Could not install the Playwright browser now. The course still works; Playwright tasks will show how to install it.

echo.
echo   QA Academy is starting: http://localhost:5173
echo   Keep this window open while you study. Close it to stop the app.
echo.
call npm run dev -- --open
