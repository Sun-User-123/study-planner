param(
  [Parameter(Mandatory = $true)]
  [string]$ServerIp,
  [string]$SshUser = "root",
  [int]$SshPort = 22
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BundlePath = Join-Path $ProjectRoot "release\server-bundle.cjs"
$DistPath = Join-Path $ProjectRoot "dist"

if (-not (Test-Path -LiteralPath $BundlePath)) {
  throw "Server bundle not found: $BundlePath"
}

if (-not (Test-Path -LiteralPath $DistPath)) {
  throw "Frontend build not found: $DistPath"
}

$ArchiveName = "study-planner-deploy.tar.gz"
$LocalArchive = Join-Path $env:TEMP $ArchiveName
$RemoteArchive = "/tmp/$ArchiveName"
$RemoteDir = "/tmp/study-planner-upload"

Write-Host "Packaging project files..."
Push-Location $ProjectRoot
try {
  tar -czf $LocalArchive "release/server-bundle.cjs" "dist" "deploy"
  if ($LASTEXITCODE -ne 0) {
    throw "Packaging failed."
  }
}
finally {
  Pop-Location
}

Write-Host "Uploading to $SshUser@$ServerIp..."
Write-Host "NOTE: the password prompt will NOT show what you type. Type the password, then press Enter."
scp -P $SshPort -o StrictHostKeyChecking=accept-new $LocalArchive "${SshUser}@${ServerIp}:${RemoteArchive}"
if ($LASTEXITCODE -ne 0) {
  throw "Upload failed."
}

Write-Host "Installing and starting the server..."
Write-Host "NOTE: the password prompt will NOT show what you type again. Type the password, then press Enter."
$RemoteCommand = @(
  "set -e",
  "mkdir -p $RemoteDir",
  "rm -rf $RemoteDir/*",
  "tar -xzf $RemoteArchive -C $RemoteDir",
  "bash $RemoteDir/deploy/install-server.sh"
) -join " && "

ssh -p $SshPort -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 "${SshUser}@${ServerIp}" $RemoteCommand
if ($LASTEXITCODE -ne 0) {
  throw "Server installation failed."
}

Write-Host ""
Write-Host "Deployment completed."
Write-Host "Set the API address in the desktop app to:"
Write-Host "http://${ServerIp}:8787"
