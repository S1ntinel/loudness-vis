param(
    [ValidateSet('hub', 'dist', 'legacy')]
    [string]$Page = 'hub',

    [int]$Port = 4317,

    [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'

try {
    Set-Location -LiteralPath $PSScriptRoot

    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
        throw "node.exe was not found. Install Node.js and make sure it is on PATH."
    }

    $forwardArgs = @('scripts/local-demo-server.mjs', '--build', '--port', $Port, '--open', $Page)
    if ($NoOpen) {
        $forwardArgs += '--no-open'
    }

    Write-Host "[local] Launching LoudnessVis..." -ForegroundColor Cyan
    Write-Host "[local] Working directory: $PSScriptRoot" -ForegroundColor DarkGray
    Write-Host "[local] Command: node $($forwardArgs -join ' ')" -ForegroundColor DarkGray

    & node.exe @forwardArgs
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "Launcher exited with code: $exitCode"
    }
}
catch {
    Write-Host ""
    Write-Host "[local] Launch failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close this window"
    exit 1
}
