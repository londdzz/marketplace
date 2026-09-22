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
REM  Right-click and "Run as administrator".
REM
REM  The last two each open their own window. Closing one stops that piece and
REM  the app stops working for everybody, so leave them running.
REM ===========================================================================

REM --- Change these if your machine is laid out differently ------------------
set "REPO=C:\laragon\www\marketplace"
set "LARAGON_DIR=C:\laragon"
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
    goto :fail
)

if not exist "%REPO%\api\artisan" (
    echo   [X] No project at %REPO%
    echo       Edit REPO at the top of this file.
    goto :fail
)

REM --- php ------------------------------------------------------------------
REM Laragon puts php on the PATH inside its own terminal and nowhere else, so
REM an Administrator prompt usually cannot see it. Find it rather than fail.
where php >nul 2>&1
if errorlevel 1 (
    for /d %%D in ("%LARAGON_DIR%\bin\php\php-*") do set "PHPDIR=%%D"
    if defined PHPDIR (
        set "PATH=!PHPDIR!;%PATH%"
        echo   Using php from !PHPDIR!
    ) else (
        echo   [X] php is not on the PATH and none was found under
        echo       %LARAGON_DIR%\bin\php. Open Laragon's own terminal instead.
        goto :fail
    )
)

REM --- 1. MySQL -------------------------------------------------------------
REM Every label sits at column zero and outside any parenthesised block: cmd
REM parses a whole block before running it, and a label defined inside one is
REM not reliably reachable.
echo   [1/4] MySQL...
call :isup 3306
if not errorlevel 1 goto mysqlup
echo         not running - open Laragon and press "Start All".
echo         Waiting up to 60 seconds...
set /a tries=0

:waitmysql
set /a tries+=1
call :isup 3306
if not errorlevel 1 goto mysqlup
if !tries! geq 30 goto nomysql
timeout /t 2 /nobreak >nul
goto waitmysql

:nomysql
echo   [X] MySQL never came up. Start it in Laragon, then run this again.
goto fail

:mysqlup
echo         up.

REM --- 2. config ------------------------------------------------------------
echo   [2/4] Clearing cached config...
pushd "%REPO%\api"
call php artisan config:clear
popd

REM --- 3. the API -----------------------------------------------------------
echo   [3/4] Starting the API on port %PORT%...
start "Autevo API" cmd /k "cd /d %REPO%\api && set PHP_CLI_SERVER_WORKERS=10&& php artisan serve --host=0.0.0.0 --port=%PORT%"

REM The tunnel dials the API, so it has to be listening first or cloudflared
REM spends its first minute reporting a refused connection.
set /a tries=0

:waitapi
set /a tries+=1
call :isup %PORT%
if not errorlevel 1 goto apiup
if !tries! geq 15 goto apislow
timeout /t 1 /nobreak >nul
goto waitapi

:apislow
echo         API has not answered yet - starting the tunnel anyway.

:apiup

REM --- 4. the tunnel --------------------------------------------------------
echo   [4/4] Starting the tunnel...
where cloudflared >nul 2>&1
if errorlevel 1 (
    echo   [X] cloudflared is not on the PATH. Install it, then run this again.
    goto :fail
)
start "Autevo tunnel" cmd /k "cloudflared tunnel --url http://localhost:%PORT% run %TUNNEL%"

echo.
echo   Running. Two windows opened - leave both alone.
echo.
echo   Check:  https://api.autevo.mk/api/v1/countries
echo   Codes:  findstr /C:"OTP code" "%REPO%\api\storage\logs\laravel.log"
echo.
pause
exit /b 0

REM --- is something listening on a port? ------------------------------------
REM TcpClient rather than Test-NetConnection: it is faster, and it works on
REM Windows PowerShell 5.1, which has no ternary operator.
:isup
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', %1); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%

:fail
echo.
pause
exit /b 1
