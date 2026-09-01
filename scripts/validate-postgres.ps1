param([switch]$KeepTemporaryFiles)

$ErrorActionPreference = 'Stop'
if (-not $env:POSTGRES_DATABASE_URL) { Write-Error 'POSTGRES_DATABASE_URL is required; no database credential is committed or inferred.'; exit 2 }
$projectRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $projectRoot 'apps/api'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('missionlive-postgres-' + [Guid]::NewGuid().ToString('N'))
try {
  New-Item -ItemType Directory -Force -Path (Join-Path $tempRoot 'prisma/migrations/00000000000000_init') | Out-Null
  $schema = Get-Content -Raw (Join-Path $apiRoot 'prisma/schema.prisma')
  $schema = $schema.Replace('provider = "sqlite"', 'provider = "postgresql"').Replace('url      = env("DATABASE_URL")', 'url      = env("POSTGRES_DATABASE_URL")')
  Set-Content -Path (Join-Path $tempRoot 'prisma/schema.prisma') -Value $schema -Encoding utf8
  Set-Content -Path (Join-Path $tempRoot 'prisma/migrations/migration_lock.toml') -Value "provider = 'postgresql'`n" -Encoding utf8
  $migrationPath = Join-Path $tempRoot 'prisma/migrations/00000000000000_init/migration.sql'
  Push-Location $apiRoot
  try { npm exec -- prisma migrate diff --from-empty --to-schema-datamodel (Join-Path $tempRoot 'prisma/schema.prisma') --script | Set-Content -Path $migrationPath -Encoding utf8; if ($LASTEXITCODE -ne 0) { throw 'Could not generate PostgreSQL migration.' }; npm exec -- prisma migrate deploy --schema (Join-Path $tempRoot 'prisma/schema.prisma'); if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL migration deployment failed.' } } finally { Pop-Location }
  Write-Output 'PostgreSQL schema migration and clean deployment succeeded.'
} finally {
  if (-not $KeepTemporaryFiles -and (Test-Path -LiteralPath $tempRoot)) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
