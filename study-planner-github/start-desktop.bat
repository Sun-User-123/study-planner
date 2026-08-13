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

echo Starting the planner service and desktop app in the background...
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'server/index.js' -WorkingDirectory (Get-Location) -WindowStyle Hidden"
timeout /t 2 /nobreak >nul
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run desktop' -WorkingDirectory (Get-Location) -WindowStyle Hidden"
