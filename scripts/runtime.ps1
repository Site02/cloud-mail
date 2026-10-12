$ErrorActionPreference = 'Stop'
$taskNode = Get-Command node -ErrorAction SilentlyContinue
$taskNodeMajor = 0
if ($taskNode) { $taskNodeMajor = [int]((& $taskNode.Source --version).TrimStart('v').Split('.')[0]) }
if ($taskNodeMajor -lt 24) {
    $taskBundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (-not (Test-Path -LiteralPath $taskBundledNode)) { throw 'Install Node.js 24 LTS, then reopen the VS Code terminal.' }
    $env:PATH = (Split-Path -Parent $taskBundledNode) + ';' + $env:PATH
}
$taskPnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
$taskPnpmMajor = 0
if ($taskPnpmCommand) { $taskPnpmMajor = [int](((& $taskPnpmCommand.Source --version) | Select-Object -Last 1).Split('.')[0]) }
if ($taskPnpmMajor -eq 11) { $script:CloudMailPnpm = $taskPnpmCommand.Source }
else {
    $taskBundledPnpm = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
    if (-not (Test-Path -LiteralPath $taskBundledPnpm)) { throw 'Install pnpm 11 with npm install -g pnpm@11.' }
    $script:CloudMailPnpm = $taskBundledPnpm
}
function Invoke-CloudMailPnpm {
    & $script:CloudMailPnpm @args
    if ($LASTEXITCODE -ne 0) { throw 'pnpm failed. Fix the error shown above before continuing.' }
}
