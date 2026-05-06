param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ForwardArgs
)

$ErrorActionPreference = 'Stop'

try {
    Set-Location -LiteralPath $PSScriptRoot

    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
        throw "uv was not found. Install uv first, then try again."
    }

    $wheel = Get-ChildItem -LiteralPath $PSScriptRoot -Filter 'loudness_vis_demo-*.whl' -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($wheel) {
        $commandArgs = @('tool', 'run', '--from', $wheel.FullName, 'loudness-vis-demo') + $ForwardArgs
        Write-Host "[uv-demo] Mode: wheel bundle" -ForegroundColor Cyan
        Write-Host "[uv-demo] Wheel: $($wheel.Name)" -ForegroundColor DarkGray
    }
    else {
        $commandArgs = @('run', 'loudness-vis-demo') + $ForwardArgs
        Write-Host "[uv-demo] Mode: project source" -ForegroundColor Cyan
    }

    Write-Host "[uv-demo] Command: uv $($commandArgs -join ' ')" -ForegroundColor DarkGray
    & uv @commandArgs
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "Launcher exited with code: $exitCode"
    }
}
catch {
    Write-Host ""
    Write-Host "[uv-demo] Launch failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close this window"
    exit 1
}
