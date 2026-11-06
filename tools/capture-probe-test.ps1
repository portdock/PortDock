# PortDock Packet M0 — 실시간 캡처가 이 PC 에서 되는지 한 번에 확인한다.
# 사용: «관리자 권한으로 실행» 한 PowerShell 에서  .\tools\capture-probe-test.ps1   (저장소 루트에서)
#   -Seconds 12    한 번에 캡처할 시간(초)
#   -Exe <경로>    이미 빌드한 capture_probe.exe 를 쓴다(cargo 가 없을 때)
#   -OutDir <폴더> 결과 pcapng·로그를 둘 폴더(기본: 임시 폴더 아래 portdock-capture-probe)
# 하는 일: 캡처 두 번(A: 네트워크 어댑터만, B: 스택 전체+중복 제거) × 같은 시간 동안 127.0.0.1 TCP·ping 과
#          공유기(기본 게이트웨이) ping·curl 을 일으킨다. 읽기·듣기만 — 패킷을 위조하거나 주입하지 않는다.
# 끝나면 요약을 보여 준다. 그 요약 전체를 개발 쪽에 알려 주면 된다.
param(
  [int]$Seconds = 12,
  [string]$Exe = "",
  [string]$OutDir = (Join-Path ([IO.Path]::GetTempPath()) "portdock-capture-probe")
)
$ErrorActionPreference = "Stop"

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Write-Host "관리자 권한이 필요합니다. PowerShell 을 «관리자 권한으로 실행» 한 뒤 다시 실행하세요." -ForegroundColor Red
  exit 2
}

$root = Split-Path -Parent $PSScriptRoot
if (-not $Exe) {
  Push-Location $root
  try {
    Write-Host "빌드 중(cargo build -p portdock-capture --example capture_probe) ..."
    cargo build -p portdock-capture --example capture_probe
    if ($LASTEXITCODE -ne 0) { throw "빌드 실패" }
    $tgt = (cargo metadata --format-version 1 --no-deps | ConvertFrom-Json).target_directory
  } finally { Pop-Location }
  $Exe = Join-Path $tgt "debug\examples\capture_probe.exe"
}
if (-not (Test-Path $Exe)) { throw "capture_probe.exe 가 없습니다: $Exe" }
New-Item -ItemType Directory -Force $OutDir | Out-Null

# 기본 게이트웨이(LAN 트래픽 상대)
$gw = $null
try { $gw = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Select-Object -First 1).NextHop } catch {}
if ($gw) { Write-Host "LAN 상대(기본 게이트웨이): $gw" } else { Write-Host "기본 게이트웨이를 찾지 못했습니다 — LAN 트래픽은 건너뜁니다." -ForegroundColor Yellow }

function Invoke-Traffic([int]$Port) {
  # 127.0.0.1 TCP — 작은 HTTP 서버를 잠깐 띄워 curl 과 TcpClient 로 왕복
  $srv = Start-Job -ArgumentList $Port -ScriptBlock {
    param($p)
    $l = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $p)
    $l.Start()
    $until = (Get-Date).AddSeconds(25)
    while ((Get-Date) -lt $until) {
      if (-not $l.Pending()) { Start-Sleep -Milliseconds 50; continue }
      $c = $l.AcceptTcpClient()
      $s = $c.GetStream(); $buf = New-Object byte[] 4096
      $s.ReadTimeout = 1000
      try { [void]$s.Read($buf, 0, 4096) } catch {}
      $body = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Length: 11`r`nConnection: close`r`n`r`nportdock-ok")
      $s.Write($body, 0, $body.Length); $c.Close()
    }
    $l.Stop()
  }
  Start-Sleep -Milliseconds 700
  1..5 | ForEach-Object { & curl.exe -s -m 2 "http://127.0.0.1:$Port/" | Out-Null; Start-Sleep -Milliseconds 150 }
  & ping.exe -n 3 127.0.0.1 | Out-Null
  if ($gw) {
    & ping.exe -n 3 $gw | Out-Null
    1..2 | ForEach-Object { & curl.exe -s -m 2 "http://$gw/" | Out-Null }
  }
  Stop-Job $srv -ErrorAction SilentlyContinue; Remove-Job $srv -Force -ErrorAction SilentlyContinue
}

$results = @()
$runs = @(
  @{ Name = "A 네트워크 어댑터만"; Args = @() },
  @{ Name = "B 스택 전체 + 중복 제거"; Args = @("--all", "--dedup") }
)
$port = 15020
foreach ($r in $runs) {
  $tag = ($r.Name -split " ")[0]
  $pcap = Join-Path $OutDir "probe-$tag.pcapng"
  $log = Join-Path $OutDir "probe-$tag.log"
  $err = Join-Path $OutDir "probe-$tag.err"
  Write-Host ""
  Write-Host "=== $($r.Name) — ${Seconds}초 ===" -ForegroundColor Cyan
  $argl = @("--seconds", $Seconds, "--out", $pcap) + $r.Args
  $p = Start-Process -FilePath $Exe -ArgumentList $argl -PassThru -NoNewWindow -RedirectStandardOutput $log -RedirectStandardError $err
  Start-Sleep -Seconds 2          # 캡처가 시작될 때까지
  Invoke-Traffic -Port $port
  $port++
  [void]$p.WaitForExit(($Seconds + 30) * 1000)
  if (-not $p.HasExited) { $p.Kill(); Write-Host "캡처가 끝나지 않아 강제 종료했습니다." -ForegroundColor Red }
  $out = Get-Content $log -Encoding UTF8 -ErrorAction SilentlyContinue
  $e = Get-Content $err -Encoding UTF8 -ErrorAction SilentlyContinue
  if ($e) { Write-Host ($e -join "`n") -ForegroundColor Red }
  $line = $out | Where-Object { $_ -like "RESULT *" } | Select-Object -Last 1
  $o = [ordered]@{ Name = $r.Name; Pcap = $pcap; Exit = $p.ExitCode; Frames = 0; Loopback = 0; Unparsable = 0; Missed = 0 }
  if ($line) {
    foreach ($kv in ($line -replace "^RESULT ", "") -split " ") {
      $k, $v = $kv -split "=", 2
      switch ($k) { "frames" { $o.Frames = [int]$v } "loopback" { $o.Loopback = [int]$v } "unparsable" { $o.Unparsable = [int]$v } "missed" { $o.Missed = [int]$v } }
    }
  }
  $o.Magic = ""
  if (Test-Path $pcap) {
    $b = [IO.File]::ReadAllBytes($pcap)
    if ($b.Length -ge 4) { $o.Magic = ("{0:X2}{1:X2}{2:X2}{3:X2}" -f $b[0], $b[1], $b[2], $b[3]) }
    $o.Size = $b.Length
  }
  $results += [pscustomobject]$o
  # 통계 부분만 그대로 보여 준다
  $show = $false
  foreach ($l in $out) { if ($l -like "== 결과*") { $show = $true }; if ($show) { Write-Host $l } }
}

Write-Host ""
Write-Host "================ 요약 (이 전체를 개발 쪽에 알려 주세요) ================" -ForegroundColor Green
$results | ForEach-Object {
  Write-Host ("[{0}] 종료코드 {1} · 프레임 {2} · 127.0.0.1/::1 프레임 {3} · 해석 못 한 프레임 {4} · PktMon 누락 {5} · pcapng {6}바이트(머리 {7})" -f $_.Name, $_.Exit, $_.Frames, $_.Loopback, $_.Unparsable, $_.Missed, $_.Size, $_.Magic)
}
$a = $results[0]; $b2 = $results[1]
Write-Host ""
Write-Host ("실시간 캡처: " + $(if ($a.Frames -gt 0 -or $b2.Frames -gt 0) { "프레임을 받았습니다(되는 것으로 보임)" } else { "프레임을 받지 못했습니다(안 됨 — 위 오류를 알려 주세요)" }))
Write-Host ("루프백(127.0.0.1): A 방식 " + $(if ($a.Loopback -gt 0) { "잡힘($($a.Loopback))" } else { "안 잡힘" }) + " / B 방식 " + $(if ($b2.Loopback -gt 0) { "잡힘($($b2.Loopback))" } else { "안 잡힘" }))
Write-Host ("pcapng 머리: " + $(if ($a.Magic -eq "0A0D0D0A") { "정상(0A0D0D0A)" } else { "이상($($a.Magic))" }))
$capinfos = Get-Command capinfos.exe -ErrorAction SilentlyContinue
if (-not $capinfos) { $c = "C:\Program Files\Wireshark\capinfos.exe"; if (Test-Path $c) { $capinfos = $c } }
if ($capinfos) {
  Write-Host ""; Write-Host "capinfos 로 검증:"
  foreach ($x in $results) { if (Test-Path $x.Pcap) { & $capinfos -c -u $x.Pcap } }
}
Write-Host ""
Write-Host "다음: Wireshark 로 열어 확인하세요 —"
foreach ($x in $results) { Write-Host "  $($x.Pcap)" }
Write-Host "  · 프레임이 이더넷/IP 로 정상 해석되고 시각이 맞는지, 표시 필터 ip.addr==127.0.0.1 에 걸리는지, 인터페이스별(Interface id)로 갈리는지 봅니다."
Write-Host "  · 로그: $OutDir"
