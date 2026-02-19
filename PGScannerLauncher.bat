@echo off
title PG Scanner - Launcher

:: Runs this in a minimized tab
if not DEFINED IS_MINIMIZED set IS_MINIMIZED=1 && start "" /min "%~dpnx0" && exit

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

:: Navigate to the folder where this .bat file lives
cd /d "%~dp0"

set PORT=8000

echo Starting local server on http://localhost:%PORT%
echo.
echo The app will open in your browser automatically.
echo Close this window to stop the server.
echo.

:: Open browser after 1 second so the server has time to start
start "" cmd /c "timeout /t 1 >nul && start http://localhost:%PORT%"

:: Start Python's built-in server (runs until window is closed)
python -m http.server %PORT%

pause
