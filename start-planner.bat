@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Please install Node.js 22 LTS from https://nodejs.org/ first.
  start "" https://nodejs.org/
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing dependencies. This may take a few minutes...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Please check your network and try again.
    pause
    exit /b 1
  )
)

echo Starting the planner in the background. The black window will not stay open.
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'server/index.js' -WorkingDirectory (Get-Location) -WindowStyle Hidden"
timeout /t 3 /nobreak >nul
start "" http://127.0.0.1:8787
echo Done. The planner is opening in your browser.
