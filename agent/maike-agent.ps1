$ErrorActionPreference = "SilentlyContinue"
$port = 43123
$prefix = "http://127.0.0.1:$port/"
$allowedOrigin = "https://hub.maikedev.com.br"

function Get-SystemStatus {
    $cpuInfo = Get-CimInstance Win32_Processor | Select-Object -First 1
    $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
    $os = Get-CimInstance Win32_OperatingSystem
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object { [ordered]@{ name=$_.Name; vramGb=if($_.AdapterRAM){[math]::Round($_.AdapterRAM/1GB,1)}else{0}; driver=$_.DriverVersion } })
    $net = @(Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { [ordered]@{ name=$_.Name; description=$_.InterfaceDescription; speed=$_.LinkSpeed; mac=$_.MacAddress } })
    $ipv4 = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -ExpandProperty IPAddress)
    $processes = @(Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 8 | ForEach-Object { [ordered]@{ name=$_.ProcessName; pid=$_.Id; ramMb=[math]::Round($_.WorkingSet64/1MB,1); cpuSeconds=if($_.CPU){[math]::Round($_.CPU,1)}else{0} } })
    $services = @(Get-Service | Where-Object Status -eq 'Running' | Select-Object -First 20 | ForEach-Object { [ordered]@{ name=$_.Name; displayName=$_.DisplayName; status=$_.Status.ToString() } })

    $totalRamGb = [math]::Round(($os.TotalVisibleMemorySize * 1KB) / 1GB, 2)
    $freeRamGb = [math]::Round(($os.FreePhysicalMemory * 1KB) / 1GB, 2)
    $usedRamGb = [math]::Round($totalRamGb - $freeRamGb, 2)
    $ramPercent = if ($totalRamGb -gt 0) { [math]::Round(($usedRamGb / $totalRamGb) * 100, 1) } else { 0 }
    $diskTotalGb = if ($disk.Size) { [math]::Round($disk.Size / 1GB, 2) } else { 0 }
    $diskFreeGb = if ($disk.FreeSpace) { [math]::Round($disk.FreeSpace / 1GB, 2) } else { 0 }
    $diskUsedGb = [math]::Round($diskTotalGb - $diskFreeGb, 2)
    $diskPercent = if ($diskTotalGb -gt 0) { [math]::Round(($diskUsedGb / $diskTotalGb) * 100, 1) } else { 0 }
    $uptime = if ($os.LastBootUpTime) { (Get-Date) - $os.LastBootUpTime } else { $null }

    [ordered]@{
        online=$true; hostname=$env:COMPUTERNAME; username=$env:USERNAME; os=$os.Caption
        cpu=[ordered]@{ percent=[math]::Round($cpu.Average,1); name=$cpuInfo.Name; cores=$cpuInfo.NumberOfCores; threads=$cpuInfo.NumberOfLogicalProcessors }
        ram=[ordered]@{ percent=$ramPercent; usedGb=$usedRamGb; totalGb=$totalRamGb }
        disk=[ordered]@{ percent=$diskPercent; usedGb=$diskUsedGb; totalGb=$diskTotalGb; freeGb=$diskFreeGb }
        gpu=$gpus; network=[ordered]@{ adapters=$net; ipv4=$ipv4 }
        processes=$processes; services=$services
        uptimeHours=if($uptime){[math]::Round($uptime.TotalHours,1)}else{0}
        timestamp=(Get-Date).ToString("o"); agentVersion="1.1.0"
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
    while ($listener.IsListening) {
        $context=$listener.GetContext(); $request=$context.Request; $response=$context.Response
        $origin=$request.Headers["Origin"]
        if($origin -eq $allowedOrigin -or [string]::IsNullOrWhiteSpace($origin)){ $response.Headers.Add("Access-Control-Allow-Origin", $(if($origin){$origin}else{$allowedOrigin})) }
        $response.Headers.Add("Access-Control-Allow-Methods","GET, OPTIONS"); $response.Headers.Add("Access-Control-Allow-Headers","Content-Type"); $response.Headers.Add("Cache-Control","no-store")
        if($request.HttpMethod -eq "OPTIONS"){ $response.StatusCode=204; $response.Close(); continue }
        if($request.Url.AbsolutePath -eq "/status" -and $request.HttpMethod -eq "GET"){
            $json=(Get-SystemStatus | ConvertTo-Json -Depth 8 -Compress); $bytes=[Text.Encoding]::UTF8.GetBytes($json)
            $response.StatusCode=200; $response.ContentType="application/json; charset=utf-8"; $response.ContentLength64=$bytes.Length; $response.OutputStream.Write($bytes,0,$bytes.Length)
        } else { $response.StatusCode=404 }
        $response.Close()
    }
} finally { if($listener.IsListening){$listener.Stop()}; $listener.Close() }
