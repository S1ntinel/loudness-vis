@echo off
setlocal
cd /d "%~dp0"

where uv >nul 2>nul
if errorlevel 1 (
  echo [uv-demo] uv was not found. Install uv first, then try again.
  pause
  exit /b 1
)

set "WHEEL="
for /f "delims=" %%F in ('dir /b /a-d /o-d "loudness_vis_demo-*.whl" 2^>nul') do if not defined WHEEL set "WHEEL=%CD%\%%F"

if defined WHEEL (
  echo [uv-demo] Mode: wheel bundle
  echo [uv-demo] Wheel: %WHEEL%
  uv tool run --from "%WHEEL%" loudness-vis-demo %*
) else (
  echo [uv-demo] Mode: project source
  uv run loudness-vis-demo %*
)

set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo [uv-demo] Launch failed with exit code %EXITCODE%.
  pause
)
exit /b %EXITCODE%
