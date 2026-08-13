@echo off
setlocal
powershell -NoProfile -Command "$connections = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue; if ($connections) { $connections | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force } }"
echo The planner service has been stopped.
pause
