# Yemen Telecom - Firebase + Android Setup Script

Write-Host "=== Yemen Telecom - Firebase & Android Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if firebase CLI is installed
$firebaseCmd = Get-Command "firebase.cmd" -ErrorAction SilentlyContinue
if (-not $firebaseCmd) {
    Write-Host "[1/5] Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
} else {
    Write-Host "[1/5] Firebase CLI already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== STEP 2: Firebase Login ===" -ForegroundColor Yellow
Write-Host "Open this URL in your browser to authenticate:" -ForegroundColor White
Write-Host "  https://accounts.google.com/o/oauth2/auth/..." -ForegroundColor Gray
firebase login --no-localhost

Write-Host ""
Write-Host "=== STEP 3: Create Firebase Project ===" -ForegroundColor Yellow
Write-Host "Run these commands AFTER login:" -ForegroundColor White
Write-Host '  firebase projects:create yemen-telecom --display-name "يمن تيليكوم"' -ForegroundColor Green
Write-Host ""

Write-Host "=== STEP 4: Initialize Firebase Services ===" -ForegroundColor Yellow
Write-Host '  firebase init hosting firestore storage' -ForegroundColor Green
Write-Host ""

Write-Host "=== STEP 5: Register Web App ===" -ForegroundColor Yellow
Write-Host "1. Go to Firebase Console: https://console.firebase.google.com" -ForegroundColor White
Write-Host "2. Project Settings > Add App > Web" -ForegroundColor White
Write-Host "3. Copy the firebaseConfig values" -ForegroundColor White
Write-Host "4. Paste them into .env file:" -ForegroundColor White
Write-Host ""

Write-Host "=== STEP 6: Generate Service Account ===" -ForegroundColor Yellow
Write-Host "1. Firebase Console > Project Settings > Service Accounts" -ForegroundColor White
Write-Host "2. Generate New Private Key (JSON)" -ForegroundColor White
Write-Host "3. Save as firebase-service-account.json in project root" -ForegroundColor White
Write-Host ""

Write-Host "=== STEP 7: Generate App Icons ===" -ForegroundColor Yellow
node scripts/generate-icons.js

Write-Host ""
Write-Host "=== STEP 8: Build & Sync Android ===" -ForegroundColor Yellow
npm run build
npx cap sync android
Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Open Android Studio and build APK:" -ForegroundColor Cyan
Write-Host "  npx cap open android" -ForegroundColor Green
