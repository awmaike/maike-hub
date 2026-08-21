@echo off
setlocal
cd /d "%~dp0"
echo Iniciando Maike Hub Agent...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0maike-agent.ps1"
endlocal
