@echo off
setlocal enabledelayedexpansion

title SecureChain - Automated Environment Setup
color 0B

echo =======================================================================
echo          SecureChain: Automated Environment Setup and Dependency Installer
echo =======================================================================
echo This script checks the required runtimes and configures:
echo   1. Python and pip environment
echo   2. Node.js and npm dependencies
echo   3. Smart Contracts (Hardhat compilation)
echo   4. Python Virtual Environment, Migrations and Seeding
echo   5. Next.js Frontend Dependencies
echo =======================================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: -------------------------------------------------------------------------
:: STEP 1: Verify Python
:: -------------------------------------------------------------------------
echo [1/5] Checking Python installation...
where python >nul 2>&1
if not errorlevel 1 set "PY_CMD=python"
if not defined PY_CMD (
    where py >nul 2>&1
    if not errorlevel 1 set "PY_CMD=py"
)
if not defined PY_CMD goto missing_python
for /f "tokens=*" %%v in ('%PY_CMD% --version') do echo    [OK] Found %%v
echo.

:: -------------------------------------------------------------------------
:: STEP 2: Verify Node.js
:: -------------------------------------------------------------------------
echo [2/5] Checking Node.js installation...
where node >nul 2>&1
if errorlevel 1 goto missing_node
where npm >nul 2>&1
if errorlevel 1 goto missing_node
for /f "tokens=*" %%v in ('node -v') do echo    [OK] Found Node.js %%v
for /f "tokens=*" %%v in ('npm -v') do echo    [OK] Found npm %%v
echo.

:: -------------------------------------------------------------------------
:: STEP 3: Setup Smart Contracts (Hardhat)
:: -------------------------------------------------------------------------
echo [3/5] Setting up Blockchain Smart Contracts Layer...
cd /d "%SCRIPT_DIR%contracts"
echo    Installing or updating Hardhat dependencies...
call npm install
if errorlevel 1 goto failed
echo    Compiling Solidity smart contracts (0.8.20)...
call npx hardhat compile
if errorlevel 1 goto failed
echo    [OK] Smart contracts compiled successfully.
cd /d "%SCRIPT_DIR%"
echo.

:: -------------------------------------------------------------------------
:: STEP 4: Setup Python Virtual Environment & Django Backend
:: -------------------------------------------------------------------------
echo [4/5] Setting up Django Backend and Encryption Engine...
cd /d "%SCRIPT_DIR%backend"
if not exist "venv\" (
    echo    Creating Python virtual environment in backend\venv...
    %PY_CMD% -m venv venv
    if errorlevel 1 goto failed
) else (
    echo    [OK] Existing venv found in backend\venv.
)

echo    Installing backend requirements (Django, DRF, Web3, Cryptography)...
call .\venv\Scripts\python.exe -m pip install --upgrade pip --quiet
if errorlevel 1 goto failed
call .\venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
if errorlevel 1 goto failed
if not exist ".env" (
    .\venv\Scripts\python.exe -c "from pathlib import Path; import secrets; Path('.env').write_text('DJANGO_SECRET_KEY='+secrets.token_urlsafe(64)+'\n', encoding='utf-8')"
    if errorlevel 1 goto failed
)
echo    [OK] Python dependencies installed.

echo    Applying database migrations...
call .\venv\Scripts\python.exe manage.py makemigrations attribute_authority records --no-input
if errorlevel 1 goto failed
call .\venv\Scripts\python.exe manage.py migrate --no-input
if errorlevel 1 goto failed

echo    Seeding demo clinicians...
call .\venv\Scripts\python.exe seed_data.py
if errorlevel 1 goto failed
echo    [OK] Database seeded and ready.
cd /d "%SCRIPT_DIR%"
echo.

:: -------------------------------------------------------------------------
:: STEP 5: Setup Next.js Frontend
:: -------------------------------------------------------------------------
echo [5/5] Setting up Next.js Web Frontend...
cd /d "%SCRIPT_DIR%frontend"
echo    Installing or updating Next.js dependencies...
call npm install
if errorlevel 1 goto failed
echo    [OK] Frontend ready.
cd /d "%SCRIPT_DIR%"
echo.

:: -------------------------------------------------------------------------
:: SUCCESS SUMMARY
:: -------------------------------------------------------------------------
color 0A
echo =======================================================================
echo             [SUCCESS] SECURECHAIN DEMO IS READY!
echo =======================================================================
echo  - Smart Contracts:  Compiled
echo  - Django Backend:   Configured, migrated, and seeded
echo  - Next.js Frontend: Dependencies installed and configured
echo.
echo To run the project anytime:
echo    Double click: start_all.bat
exit /b 0

:missing_python
echo [ERROR] Python was not found on PATH. Install Python 3.10+ and retry.
exit /b 1

:missing_node
echo [ERROR] Node.js was not found on PATH. Install Node.js 22.13+ and retry.
exit /b 1

:failed
echo [ERROR] Setup failed. Review the command output above and retry.
exit /b 1
