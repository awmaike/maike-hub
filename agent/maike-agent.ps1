$ErrorActionPreference = "SilentlyContinue"
$port = 43123
$prefix = "http://127.0.0.1:$port/"
$allowedOrigin = "https://hub.maikedev.com.br"

function Get-SystemStatus {
    $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
    $os = Get-CimInstance Win32_OperatingSystem
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $gpus = Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name

    $totalRamGb = [math]::Round(($os.TotalVisibleMemorySize * 1KB) / 1GB, 2)
    $freeRamGb = [math]::Round(($os.FreePhysicalMemory * 1KB) / 1GB, 2)
    $usedRamGb = [math]::Round($totalRamGb - $freeRamGb, 2)
    $ramPercent = if ($totalRamGb -gt 0) { [math]::Round(($usedRamGb / $totalRamGb) * 100, 1) } else { 0 }

    $diskTotalGb = if ($disk.Size) { [math]::Round($disk.Size / 1GB, 2) } else { 0 }
    $diskFreeGb = if ($disk.FreeSpace) { [math]::Round($disk.FreeSpace / 1GB, 2) } else { 0 }
    $diskUsedGb = [math]::Round($diskTotalGb - $diskFreeGb, 2)
    $diskPercent = if ($diskTotalGb -gt 0) { [math]::Round(($diskUsedGb / $diskTotalGb) * 100, 1) } else { 0 }

    $boot = $os.LastBootUpTime
    $uptime = if ($boot) { (Get-Date) - $boot } else { $null }

    [ordered]@{
        online = $true
        hostname = $env:COMPUTERNAME
        username = $env:USERNAME
        os = $os.Caption
        cpu = [ordered]@{
            percent = [math]::Round($cpu.Average, 1)
            name = (Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)
        }
        ram = [ordered]@{
            percent = $ramPercent
            usedGb = $usedRamGb
            totalGb = $totalRamGb
        }
        disk = [ordered]@{
            percent = $diskPercent
            usedGb = $diskUsedGb
            totalGb = $diskTotalGb
            freeGb = $diskFreeGb
        }
        gpu = @($gpus)
        uptimeHours = if ($uptime) { [math]::Round($uptime.TotalHours, 1) } else { 0 }
        timestamp = (Get-Date).ToString("o")
        agentVersion = "1.0.0"
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "Maike Hub Agent iniciado em $prefix" -ForegroundColor Green
    Write-Host "Deixe esta janela aberta enquanto quiser ver os dados reais no Hub." -ForegroundColor Cyan
    Write-Host "Pressione Ctrl+C para encerrar." -ForegroundColor DarkGray

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $origin = $request.Headers["Origin"]
        if ($origin -eq $allowedOrigin -or [string]::IsNullOrWhiteSpace($origin)) {
            $response.Headers.Add("Access-Control-Allow-Origin", $(if ($origin) { $origin } else { $allowedOrigin }))
        }
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
        $response.Headers.Add("Cache-Control", "no-store")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        if ($request.Url.AbsolutePath -eq "/status" -and $request.HttpMethod -eq "GET") {
            $json = (Get-SystemStatus | ConvertTo-Json -Depth 6 -Compress)
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.StatusCode = 200
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }

        $response.Close()
    }
}
catch {
    Write-Host "Erro ao iniciar o agente: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Tente executar como Administrador caso o Windows bloqueie a porta local." -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
}
finally {
    if ($listener.IsListening) { $listener.Stop() }
    $listener.Close()
}
