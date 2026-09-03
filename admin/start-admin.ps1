$ErrorActionPreference = 'SilentlyContinue'
$adminDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$portOpen = Test-NetConnection -ComputerName localhost -Port 3010 -WarningAction SilentlyContinue -InformationLevel Quiet

if (-not $portOpen) {
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/k", "cd /d `"$adminDir`" && npm start" `
        -WindowStyle Minimized
    Start-Sleep -Seconds 3
}

Start-Process "http://localhost:3010"
