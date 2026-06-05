# Yemen Telecom - Build All Script
# Builds web app, syncs Capacitor, and optionally builds Android APK

param(
    [switch]$Android,
    [switch]$Clean,
    [switch]$Prod
)

Write-Host "=== Yemen Telecom Build Script ===" -ForegroundColor Cyan
$ErrorActionPreference = "Stop"

# 1. Clean build if requested
if ($Clean) {
    Write-Host "[1/4] Cleaning previous builds..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force -Path "dist" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force -Path "android\app\src\main\assets\public" -ErrorAction SilentlyContinue
    Write-Host "  Cleaned." -ForegroundColor Green
}

# 2. Install dependencies
Write-Host "[2/4] Ensuring dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    npm install
    Write-Host "  Dependencies installed." -ForegroundColor Green
} else {
    Write-Host "  node_modules exists." -ForegroundColor Gray
}

# 3. Build web app
Write-Host "[3/4] Building web app..." -ForegroundColor Yellow
if ($Prod) {
    $env:NODE_ENV = "production"
}
npm run build
if (-not $?) { throw "Web build failed!" }
Write-Host "  Web build complete (dist/)." -ForegroundColor Green

# 4. Sync Capacitor (Android)
Write-Host "[4/4] Syncing Capacitor Android..." -ForegroundColor Yellow
npx cap sync android
if (-not $?) { throw "Capacitor sync failed!" }
Write-Host "  Capacitor synced." -ForegroundColor Green

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Cyan

if ($Android) {
    Write-Host ""
    Write-Host "Building Android APK..." -ForegroundColor Yellow
    
    # Check Java
    $java = Get-Command java -ErrorAction SilentlyContinue
    if (-not $java) {
        Write-Host "  Java not found! Install JDK 17 from:" -ForegroundColor Red
        Write-Host "  https://adoptium.net/temurin/releases/" -ForegroundColor Red
        Write-Host "  Set JAVA_HOME environment variable after installation." -ForegroundColor Red
        return
    }

    Push-Location android
    try {
        if ($Prod) {
            ./gradlew assembleRelease
        } else {
            ./gradlew assembleDebug
        }
        if ($?) {
            Write-Host "  APK built successfully!" -ForegroundColor Green
            Get-ChildItem -Path "app\build\outputs\apk" -Recurse -Filter "*.apk" | ForEach-Object {
                Write-Host "  $($_.FullName) ($(($_.Length/1MB).ToString('0.0')) MB)" -ForegroundColor Cyan
            }
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host ""
    Write-Host "To open in Android Studio and build APK manually:" -ForegroundColor Cyan
    Write-Host "  npx cap open android" -ForegroundColor Green
}
