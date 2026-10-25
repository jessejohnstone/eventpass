$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\.env'
if (Test-Path -LiteralPath $envFile -PathType Leaf) {
  Get-Content -LiteralPath $envFile | ForEach-Object {
    if ($_ -match '^\s*(APP_URL|CRON_SECRET)\s*=\s*(.*)\s*$') {
      $value = $matches[2].Trim().Trim('"').Trim("'")
      [Environment]::SetEnvironmentVariable($matches[1], $value, 'Process')
    }
  }
}

if ([string]::IsNullOrWhiteSpace($env:APP_URL)) {
  throw 'APP_URL is not available to this scheduled task.'
}

if ([string]::IsNullOrWhiteSpace($env:CRON_SECRET)) {
  throw 'CRON_SECRET is not available to this scheduled task.'
}

$uri = $env:APP_URL.TrimEnd('/') + '/api/internal/ticket-confirmations/retry'
$headers = @{ Authorization = 'Bearer ' + $env:CRON_SECRET }

Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -TimeoutSec 30 | Out-Null
