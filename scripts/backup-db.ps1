# Yemen Telecom - Database Backup Script
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $PSScriptRoot "backups"
$env:PGPASSWORD = $env:DB_PASSWORD

# Create backup directory if not exists
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# Backup database
$backupFile = "$backupDir\yemen_telecom_$timestamp.sql"
pg_dump -U postgres -h localhost -p 5432 -d yemen_telecom -f $backupFile

if ($?) {
    Write-Host "Backup created: $backupFile" -ForegroundColor Green
    Write-Host "Size: $((Get-Item $backupFile).Length / 1KB) KB" -ForegroundColor Cyan
} else {
    Write-Host "Backup failed! Is PostgreSQL running?" -ForegroundColor Red
}
