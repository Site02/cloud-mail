. "$PSScriptRoot\scripts\runtime.ps1"
Push-Location "$PSScriptRoot\mail-vue"
try {
    if (-not (Test-Path -LiteralPath node_modules)) { Invoke-CloudMailPnpm install --frozen-lockfile }
    Invoke-CloudMailPnpm dev
} finally { Pop-Location }
