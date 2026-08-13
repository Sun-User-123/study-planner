@echo off
if "%~1"=="" (
  echo Usage: run-deploy.bat YOUR_SERVER_IP
  pause
  exit /b 1
)

echo When the password prompt appears, type the password and press Enter.
echo The password will not be displayed while you type.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-to-server.ps1" %*
if errorlevel 1 (
  echo.
  echo Deployment failed. Review the message above.
)
pause
