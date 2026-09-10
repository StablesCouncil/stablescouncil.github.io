param(
    [string]$BaseUrl = "http://ipgrd3e7jwwkk7yzay4k2ft3vwbsgig62v6mdaqws3mato64hfwwr7yd.onion",
    [string]$OutDir = "$HOME\Stables_BCP_Copy",
    [string]$Proxy = ""
)

$ErrorActionPreference = "Stop"

$BaseUrl = $BaseUrl.TrimEnd("/")
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$WebArgs = @{}
if ($Proxy) {
    $WebArgs.Proxy = $Proxy
}

$ManifestUrl = "$BaseUrl/downloads/MANIFEST.json"
$ManifestPath = Join-Path $OutDir "downloads\MANIFEST.json"
New-Item -ItemType Directory -Force -Path (Split-Path $ManifestPath) | Out-Null
Invoke-WebRequest -UseBasicParsing -Uri $ManifestUrl -OutFile $ManifestPath @WebArgs

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

foreach ($File in $Manifest.files) {
    $Relative = [string]$File.path
    $Target = Join-Path $OutDir ($Relative -replace "/", "\")
    New-Item -ItemType Directory -Force -Path (Split-Path $Target) | Out-Null
    Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/$Relative" -OutFile $Target @WebArgs
    $Actual = (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash.ToUpperInvariant()
    $Expected = ([string]$File.sha256).ToUpperInvariant()
    if ($Actual -ne $Expected) {
        throw "Hash mismatch for $Relative. Expected $Expected, got $Actual."
    }
}

Write-Output "Stables BCP copy updated and verified at $OutDir"
