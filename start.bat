@echo off
REM Willabean local preview launcher.
REM Uses the PowerShell server shipped in this repo (start.ps1).
REM Requires nothing extra installed on a standard Windows 10/11 machine.

cd /d "%~dp0"

echo.
echo ============================================================
echo   Willabean -- local preview
echo   Starting server and opening your browser...
echo   Leave this window open. Close it to stop the server.
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"

echo.
echo Server stopped.
pause >nul
