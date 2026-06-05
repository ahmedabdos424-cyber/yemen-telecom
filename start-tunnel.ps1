param(
  [string]$port = "3000",
  [string]$authToken = ""
)

$ngrokDir = "$env:LOCALAPPDATA\Programs\ngrok"
$ngrokExe = "$ngrokDir\ngrok.exe"

# Check if ngrok is installed
if (!(Test-Path $ngrokExe)) {
  Write-Host "ngrok not found. Downloading..." -ForegroundColor Yellow
  $url = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
  $zip = "$env:TEMP\ngrok.zip"
  $wc = New-Object System.Net.WebClient
  $wc.DownloadFile($url, $zip)
  Expand-Archive -Path $zip -DestinationPath $ngrokDir -Force
  Remove-Item $zip -Force
  Write-Host "ngrok installed." -ForegroundColor Green
}

# Configure auth token if provided
if ($authToken) {
  & $ngrokExe config add-authtoken $authToken 2>&1 | Out-Null
  Write-Host "Auth token configured." -ForegroundColor Green
}

Write-Host "Starting ngrok tunnel on port $port..." -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: ngrok requires a free account." -ForegroundColor Yellow
Write-Host "1. Sign up at: https://dashboard.ngrok.com/signup" -ForegroundColor White
Write-Host "2. Get your token at: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
Write-Host "3. Run: .\start-tunnel.ps1 -authToken YOUR_TOKEN" -ForegroundColor White
Write-Host ""

& $ngrokExe http $port --log=stdout
