$Host.UI.RawUI.WindowTitle = "Nile Insurance - Mobile Dev"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ADB  = "C:\Users\windows 10\AppData\Local\Android\Sdk\platform-tools\adb.exe"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Nile Insurance - Mobile Dev Startup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Install deps if missing ──────────────────────
$routerPath = Join-Path $Root "mobile\node_modules\expo-router"
if (-not (Test-Path $routerPath)) {
    Write-Host "[..] Installing mobile dependencies (first run)..." -ForegroundColor Yellow
    Set-Location (Join-Path $Root "mobile")
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK]  Dependencies installed." -ForegroundColor Green
    Write-Host ""
}

# ── 2. Kill anything on port 5000 or 8081 ──────────
foreach ($port in @(5000, 8081)) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "[INFO] Cleared port $port" -ForegroundColor DarkGray
    }
}
Start-Sleep -Seconds 1

# ── 3. ADB port forward ────────────────────────────
Write-Host "[1/3] USB port forwarding..." -ForegroundColor White
if (Test-Path $ADB) {
    $devices = & $ADB devices 2>&1
    if ($devices -match "device$") {
        & $ADB reverse tcp:5000 tcp:5000 2>&1 | Out-Null
        Write-Host "[OK]  adb reverse tcp:5000 tcp:5000" -ForegroundColor Green
    } else {
        Write-Host "[WARN] No authorized Android device found." -ForegroundColor Yellow
        Write-Host "       Unlock phone and approve USB debugging if prompted." -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] ADB not found - skipping port forward." -ForegroundColor Yellow
}
Write-Host ""

# ── 4. Start backend ───────────────────────────────
Write-Host "[2/3] Starting backend server..." -ForegroundColor White
$serverPath = Join-Path $Root "server"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$serverPath`" && node server.js" -WindowStyle Minimized
Start-Sleep -Seconds 3

$listening = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
    Write-Host "[ERROR] Backend did not start on port 5000." -ForegroundColor Red
    Write-Host "        Check the minimized 'cmd' window for errors." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK]  Backend on http://localhost:5000" -ForegroundColor Green
Write-Host ""

# ── 5. Start Expo ──────────────────────────────────
Write-Host "[3/3] Starting Expo - scan QR with Expo Go on your phone..." -ForegroundColor White
Write-Host ""
Write-Host "  Demo login:" -ForegroundColor DarkGray
Write-Host "    Email:    biruk@ethiotelecom.et" -ForegroundColor DarkGray
Write-Host "    Password: Insured@123" -ForegroundColor DarkGray
Write-Host ""

Set-Location (Join-Path $Root "mobile")
npx expo start
