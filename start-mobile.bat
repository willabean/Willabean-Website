@echo off
REM Willabean - mobile preview launcher
REM Self-elevates so the server can bind to your LAN IP for phone access.
REM Click Yes on the UAC prompt that appears.

cd /d "%~dp0"

REM Detect whether we are already elevated. fltmc requires admin.
fltmc >nul 2>&1
if not %errorlevel%==0 goto Elevate

REM We are admin. Run the server.
echo Mobile preview mode (admin).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
echo.
echo Server has stopped.
pause
goto :eof

:Elevate
echo Requesting admin permission...
powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
exit /b
