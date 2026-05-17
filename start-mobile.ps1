$Host.UI.RawUI.WindowTitle = "Enterprise Insurance - Mobile Dev"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ADB  = "C:\Users\windows 10\AppData\Local\Android\Sdk\platform-tools\adb.exe"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Enterprise Insurance - Mobile Dev Startup" -ForegroundColor Cyan
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

# ── 3. Start MongoDB ────────────────────────────────
Write-Host "[0/3] Starting MongoDB..." -ForegroundColor White
$mongoRunning = Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue
if (-not $mongoRunning) {
    $mongodPath = "D:\bin\mongod.exe"
    $mongodConf = "D:\bin\mongod.cfg"
    if (Test-Path $mongodPath) {
        Start-Process -FilePath $mongodPath -ArgumentList "--config", $mongodConf -WindowStyle Hidden
        Start-Sleep -Seconds 4
        $mongoRunning = Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue
        if ($mongoRunning) {
            Write-Host "[OK]  MongoDB started on port 27017" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] MongoDB failed to start!" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    } else {
        Write-Host "[ERROR] mongod.exe not found at D:\bin\mongod.exe" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "[OK]  MongoDB already running on port 27017" -ForegroundColor Green
}
Write-Host ""

# ── 4. ADB: force-stop Expo Go + port forward ──────
Write-Host "[1/3] USB setup + force-stop Expo Go..." -ForegroundColor White
if (Test-Path $ADB) {
    $devices = & $ADB devices 2>&1
    if ($devices -match "device$") {
        # Force-stop Expo Go to clear any stuck native crash screen
        & $ADB shell am force-stop host.exp.exponent 2>&1 | Out-Null
        Write-Host "[OK]  Expo Go force-stopped (clears any crash screen)" -ForegroundColor Green

        # Set up port forwarding so phone's localhost hits the PC
        & $ADB reverse tcp:5000 tcp:5000 2>&1 | Out-Null
        & $ADB reverse tcp:8081 tcp:8081 2>&1 | Out-Null
        Write-Host "[OK]  adb reverse tcp:5000 and tcp:8081 set" -ForegroundColor Green
    } else {
        Write-Host "[WARN] No authorized Android device found." -ForegroundColor Yellow
        Write-Host "       Unlock phone and approve USB debugging if prompted." -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] ADB not found at expected path - skipping." -ForegroundColor Yellow
}
Write-Host ""

# ── 5. Start backend ───────────────────────────────
Write-Host "[2/3] Starting backend server..." -ForegroundColor White
$serverPath = Join-Path $Root "server"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$serverPath`" && node server.js" -WindowStyle Minimized
Start-Sleep -Seconds 4

$listening = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
    Write-Host "[ERROR] Backend did not start on port 5000." -ForegroundColor Red
    Write-Host "        Check the minimized 'cmd' window for errors." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK]  Backend on http://localhost:5000" -ForegroundColor Green
Write-Host ""

# ── 6. Start Expo ──────────────────────────────────
Write-Host "[3/3] Starting Expo dev server..." -ForegroundColor White
Write-Host ""
Write-Host "  Scan the QR code with Expo Go when it appears." -ForegroundColor Yellow
Write-Host "  If Expo Go shows 'Something went wrong', run:" -ForegroundColor Yellow
Write-Host "    adb shell am force-stop host.exp.exponent" -ForegroundColor DarkGray
Write-Host "  then scan the QR code again." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Demo login:" -ForegroundColor DarkGray
Write-Host "    Email:    biruk@ethiotelecom.et" -ForegroundColor DarkGray
Write-Host "    Password: Insured@123" -ForegroundColor DarkGray
Write-Host ""

Set-Location (Join-Path $Root "mobile")
npx expo start --clear
