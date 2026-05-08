param(
    [ValidateSet('hub', 'dist', 'lite', 'legacy')]
    [string]$Page = 'hub',

    [int]$Port = 4317,

    [switch]$NoOpen,

    # 默认遇到端口占用会自动 fallback 到下一个可用端口；
    # 加 -Strict 则锁死端口，占用时直接报错（保留旧行为）
    [switch]$Strict
)

$ErrorActionPreference = 'Stop'

try {
    Set-Location -LiteralPath $PSScriptRoot

    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
        throw "node.exe was not found. Install Node.js and make sure it is on PATH."
    }

    # 如果用户没有显式指定 -Port 或者没用 -Strict，就让 mjs 走 fallback 模式
    $passPort = $Strict -or $PSBoundParameters.ContainsKey('Port')

    $forwardArgs = @('scripts/local-demo-server.mjs', '--build', '--open', $Page)
    if ($passPort) {
        $forwardArgs += @('--port', $Port)
    }
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
