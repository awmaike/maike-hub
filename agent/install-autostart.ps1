$ErrorActionPreference = 'Stop'

$agentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsPath = Join-Path $agentDir 'start-agent-hidden.vbs'

if (-not (Test-Path $vbsPath)) {
  throw "Arquivo start-agent-hidden.vbs não encontrado em $agentDir"
}

$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Maike Hub Agent.lnk'

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:WINDIR\System32\wscript.exe"
$shortcut.Arguments = '"' + $vbsPath + '"'
$shortcut.WorkingDirectory = $agentDir
$shortcut.WindowStyle = 7
$shortcut.Description = 'Inicia o Maike Hub Agent em segundo plano'
$shortcut.Save()

Write-Host "Autostart instalado com sucesso." -ForegroundColor Green
Write-Host "Atalho criado em: $shortcutPath"
Write-Host "O agente será iniciado automaticamente no próximo login do Windows."

Start-Process "$env:WINDIR\System32\wscript.exe" -ArgumentList ('"' + $vbsPath + '"') -WindowStyle Hidden
Write-Host "Agente iniciado agora em segundo plano." -ForegroundColor Green
