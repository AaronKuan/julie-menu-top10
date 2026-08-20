param(
  [string]$ProjectId = "julie-menu-top10",
  [string]$DisplayName = "Julie Menu Top10"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
node .\scripts\setup-firebase.mjs $ProjectId $DisplayName
