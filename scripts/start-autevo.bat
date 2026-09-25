@echo off
setlocal enabledelayedexpansion
title Autevo - start everything

REM ===========================================================================
REM  Starts everything, in the right order:
REM
REM    1. MySQL          (Laragon)              the data
REM    2. artisan serve  (port 8000)            the API
REM    3. vite           (port 5174)            the website
REM    4. cloudflared    (api.autevo.mk)        the way in, for the phone
REM
REM  Right-click and "Run as administrator".
REM
REM  Each of the last three opens its own window. Closing one stops that piece,
REM  so leave them running. The tunnel is only needed when a phone somewhere
REM  else has to reach the API; without cloudflared installed the rest still
REM  works and this says so rather than stopping.
REM ===========================================================================

REM --- Change these if your machine is laid out differently ------------------
set "REPO=C:\laragon\www\marketplace"
set "LARAGON_DIR=C:\laragon"
set "TUNNEL=autevo"
set "PORT=8000"
set "WEBPORT=5174"
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
echo   [1/5] MySQL...
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
echo   [2/5] Clearing cached config...
pushd "%REPO%\api"
call php artisan config:clear
popd

REM --- 3. the API -----------------------------------------------------------
echo   [3/5] Starting the API on port %PORT%...
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

REM --- 4. the website -------------------------------------------------------
echo   [4/5] Starting the website on port %WEBPORT%...

REM node, like php, is on the PATH inside Laragon's own terminal and often not
REM in an Administrator prompt. Find it rather than fail.
where npm >nul 2>&1
if errorlevel 1 (
    for /d %%D in ("%LARAGON_DIR%\bin\nodejs\node-*") do set "NODEDIR=%%D"
    if defined NODEDIR (
        set "PATH=!NODEDIR!;%PATH%"
        echo         using node from !NODEDIR!
    ) else (
        echo         [-] npm is not on the PATH and none was found under
        echo             %LARAGON_DIR%\bin\nodejs. Skipping the website.
        goto tunnel
    )
)

REM Only when something is actually missing. The typefaces are served from our
REM own domain now rather than fetched from Google, so they are packages, and a
REM checkout from before that change has node_modules without them.
if not exist "%REPO%\web\node_modules\@fontsource\onest" (
    echo         installing packages, this takes a minute the first time...
    pushd "%REPO%\web"
    call npm install
    popd
)

start "Autevo website" cmd /k "cd /d %REPO%\web && npm run dev"

set /a tries=0

:waitweb
set /a tries+=1
call :isup %WEBPORT%
if not errorlevel 1 goto webup
if !tries! geq 40 goto webslow
timeout /t 1 /nobreak >nul
goto waitweb

:webslow
echo         website has not answered yet - check its window.
goto tunnel

:webup
echo         up.
start "" "http://localhost:%WEBPORT%"

REM --- 5. the tunnel --------------------------------------------------------
:tunnel
echo   [5/5] Starting the tunnel...
where cloudflared >nul 2>&1
if errorlevel 1 (
    echo         [-] cloudflared is not on the PATH, so the API is reachable
    echo             from this computer only. The website above still works.
    goto done
)
start "Autevo tunnel" cmd /k "cloudflared tunnel --url http://localhost:%PORT% run %TUNNEL%"

:done
echo.
echo   Running. Leave the windows that opened alone.
echo.
echo   Website:  http://localhost:%WEBPORT%
echo   API:      http://localhost:%PORT%/api/v1/countries
echo   Outside:  https://api.autevo.mk/api/v1/countries
echo   Codes:    findstr /C:"OTP code" "%REPO%\api\storage\logs\laravel.log"
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
