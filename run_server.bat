@echo off
REM run_server.bat — run serve.py from the batch file's folder
cd /d "%~dp0"

REM Accept an optional port argument; default = 8000
set "PORT=%1"
if "%PORT%"=="" set "PORT=8000"

REM Prefer the py launcher on Windows if available
where py >nul 2>&1
if %errorlevel%==0 (
    py -3 serve.py %PORT%
) else (
    python serve.py %PORT%
)

pause
