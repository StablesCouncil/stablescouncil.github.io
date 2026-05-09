param(
    [string]$BaseUrl = "https://stablescouncil.org/onion-resilience",
    [string]$OutDir = "$HOME\Stables_BCP_Copy"
)

$ErrorActionPreference = "Stop"

$BaseUrl = $BaseUrl.TrimEnd("/")
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$ManifestUrl = "$BaseUrl/downloads/MANIFEST.json"
$ManifestPath = Join-Path $OutDir "downloads\MANIFEST.json"
New-Item -ItemType Directory -Force -Path (Split-Path $ManifestPath) | Out-Null
Invoke-WebRequest -UseBasicParsing -Uri $ManifestUrl -OutFile $ManifestPath

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

foreach ($File in $Manifest.files) {
    $Relative = [string]$File.path
    $Target = Join-Path $OutDir ($Relative -replace "/", "\")
    New-Item -ItemType Directory -Force -Path (Split-Path $Target) | Out-Null
    Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/$Relative" -OutFile $Target
}

Write-Output "Stables BCP copy updated at $OutDir"
