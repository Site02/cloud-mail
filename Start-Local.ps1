param([switch]$SkipBuild)
. "$PSScriptRoot\scripts\runtime.ps1"
if (Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 8787 is already in use. If Cloud Mail is running, open http://127.0.0.1:8787; otherwise stop the other server first.'
}
Push-Location $PSScriptRoot
try {
    if (-not $SkipBuild) {
        Push-Location mail-vue
        try { Invoke-CloudMailPnpm install --frozen-lockfile; Invoke-CloudMailPnpm run build } finally { Pop-Location }
        Push-Location mail-worker
        try { Invoke-CloudMailPnpm install --frozen-lockfile } finally { Pop-Location }
    }
    & node scripts/local.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Local server failed; inspect the error above.' }
} finally { Pop-Location }
