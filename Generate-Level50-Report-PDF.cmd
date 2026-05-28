@echo off
setlocal
cd /d "%~dp0"

echo.
echo Nova Swarm Level 50 PDF Report
echo ==============================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js, then run this utility again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto failed
)

echo Building current Nova Swarm bundle...
call npm run build
if errorlevel 1 goto failed

echo Running Level 50 gameplay validation and implementation audit...
call npm run test:level50-analysis
if errorlevel 1 goto failed

echo Rendering PDF and Codex follow-up prompt...
call npm run report:level50-pdf
if errorlevel 1 goto failed

echo.
echo Done.
echo PDF: test-results\level50-analysis-summary.pdf
echo Prompt: test-results\level50-improvement-codex-prompt.md
echo.
start "" "%CD%\test-results\level50-analysis-summary.pdf"
pause
exit /b 0

:failed
echo.
echo The report utility failed. Check the terminal output above.
pause
exit /b 1
