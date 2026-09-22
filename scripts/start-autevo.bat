@echo off
setlocal enabledelayedexpansion
title Autevo - start everything

REM ===========================================================================
REM  Starts everything the phone needs, in the right order:
REM
REM    1. MySQL          (Laragon)              the data
REM    2. artisan serve  (port 8000)            the API
REM    3. cloudflared    (api.autevo.mk)        the way in from outside
REM
REM  Right-click this file and "Run as administrator" - Laragon needs it to
REM  start its services, and so does cloudflared if it is a Windows service.
REM
REM  Each of the last two opens its own window. Closing a window stops that
REM  piece, and the app stops working for everybody, so leave them be.
REM ===========================================================================

REM --- Change these if your machine is laid out differently ------------------
set "REPO=C:\laragon\www\marketplace"
set "LARAGON=C:\laragon\laragon.exe"
set "TUNNEL=autevo"
set "PORT=8000"
REM ---------------------------------------------------------------------------

echo.
echo   Autevo
echo   ======
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo   [X] Not running as administrator.
    echo       Right-click this file and choose "Run as administrator".
    echo.
    pause
    exit /b 1
)

if not exist "%REPO%\api\artisan" (
    echo   [X] Cannot find the project at %REPO%
    echo       Edit REPO at the top of this file to point at it.
    echo.
    pause
    exit /b 1
)

echo   [1/4] Starting MySQL...
if exist "%LARAGON%" (
    start "" "%LARAGON%" start
) else (
    echo         Laragon not found at %LARAGON% - start MySQL yourself.
)

REM Laragon takes a moment, and the API answering 500 because the database is
REM not up yet looks exactly like a broken app rather than a slow start. The
REM port is checked rather than a mysql binary, whose path moves with every
REM version Laragon ships.
set /a tries=0
:waitformysql
set /a tries+=1
powershell -NoProfile -Command "exit (Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -InformationLevel Quiet) ? 0 : 1" >nul 2>&1
if not errorlevel 1 (
    echo         MySQL is up.
    goto mysqlup
)
if !tries! geq 15 (
    echo         MySQL did not come up. Start it from Laragon and run this again.
    goto mysqlup
)
timeout /t 2 /nobreak >nul
goto waitformysql
:mysqlup

echo   [2/4] Clearing cached config...
pushd "%REPO%\api"
call php artisan config:clear >nul 2>&1
popd

echo   [3/4] Starting the API on port %PORT%...
start "Autevo API" cmd /k "cd /d %REPO%\api && set PHP_CLI_SERVER_WORKERS=10&& php artisan serve --host=0.0.0.0 --port=%PORT%"

REM The tunnel dials localhost, so the API has to be listening first or
REM cloudflared spends its first minute reporting a connection refused.
timeout /t 4 /nobreak >nul

echo   [4/4] Starting the tunnel...
start "Autevo tunnel" cmd /k "cloudflared tunnel --url http://localhost:%PORT% run %TUNNEL%"

echo.
echo   Two new windows opened. Leave both running.
echo.
echo   Check it worked:  https://api.autevo.mk/api/v1/countries
echo   Sign-in codes:    type api\storage\logs\laravel.log ^| findstr "OTP code"
echo.
echo   To stop everything, close both windows.
echo.
pause
