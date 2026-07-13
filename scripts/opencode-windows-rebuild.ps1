param(
    [string]$RepoPath = (Get-Location).Path,
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [switch]$SkipPackage
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section([string]$Title) {
    Write-Host "`n=== $Title ==="
}

function Test-Command([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $cmd) {
        throw "$Name is not installed or not available on PATH"
    }
    return $cmd.Source
}

$repo = (Resolve-Path $RepoPath).Path
$packageJson = Join-Path $repo 'package.json'

if (-not (Test-Path $packageJson)) {
    throw "No package.json found at $repo"
}

Write-Section 'Environment verification'
$node = Test-Command 'node'
$npm = Test-Command 'npm'
$python = Test-Command 'python'
$git = Test-Command 'git'
Write-Host "node: $node"
Write-Host "npm: $npm"
Write-Host "python: $python"
Write-Host "git: $git"

$package = Get-Content $packageJson -Raw | ConvertFrom-Json
$hasElectronBuilder = $false
$dependencies = $null
$devDependencies = $null
if ($null -ne $package.dependencies) { $dependencies = $package.dependencies }
if ($null -ne $package.devDependencies) { $devDependencies = $package.devDependencies }

if ($null -ne $dependencies -and $dependencies.PSObject.Properties.Name -contains 'electron-builder') { $hasElectronBuilder = $true }
if ($null -ne $dependencies -and $dependencies.PSObject.Properties.Name -contains 'electron') { $hasElectronBuilder = $true }
if ($null -ne $devDependencies -and $devDependencies.PSObject.Properties.Name -contains 'electron-builder') { $hasElectronBuilder = $true }
if ($null -ne $devDependencies -and $devDependencies.PSObject.Properties.Name -contains 'electron') { $hasElectronBuilder = $true }

if (-not $hasElectronBuilder) {
    Write-Host "This workspace does not look like an OpenCode Desktop Electron package project."
    Write-Host "No electron/electron-builder markers were found in package.json."
    exit 2
}

Write-Section 'Install dependencies'
if (-not $SkipInstall) {
    if (Test-Path (Join-Path $repo 'package-lock.json')) {
        & npm ci
    } else {
        & npm install
    }
} else {
    Write-Host 'Skipping install because -SkipInstall was provided.'
}

Write-Section 'Build'
if (-not $SkipBuild) {
    & npm run build
} else {
    Write-Host 'Skipping build because -SkipBuild was provided.'
}

Write-Section 'Package'
if (-not $SkipPackage) {
    if ($package.scripts.package) {
        & npm run package
    } elseif ($hasElectronBuilder) {
        & npx electron-builder
    } else {
        Write-Host 'No packaging script was found.'
        exit 3
    }
} else {
    Write-Host 'Skipping package because -SkipPackage was provided.'
}

Write-Section 'Packaging output verification'
$artifacts = @('app.asar', 'app.asar.backup', 'out', 'dist\win-unpacked', 'release')
foreach ($artifact in $artifacts) {
    $path = Join-Path $repo $artifact
    if (Test-Path $path) {
        Write-Host "FOUND $artifact"
    } else {
        Write-Host "MISSING $artifact"
    }
}

Write-Host "`nRebuild script completed. If the expected packaged outputs are missing, the build did not produce a runnable desktop artifact."
