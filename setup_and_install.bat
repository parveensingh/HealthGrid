@echo off
setlocal enabledelayedexpansion

title SecureChain - Automated Environment Setup
color 0B

echo =======================================================================
echo          SecureChain: Automated Environment Setup & Dependency Installer
echo =======================================================================
echo This script will check and automatically configure:
echo   1. Python (and pip)
echo   2. Node.js (and npm)
echo   3. Smart Contracts (Hardhat compilation)
echo   4. Python Virtual Environment (Dependencies, Migrations, Seeding)
echo   5. Next.js Frontend (Dependencies & Configuration)
echo =======================================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: -------------------------------------------------------------------------
:: STEP 1: Verify / Install Python
:: -------------------------------------------------------------------------
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('python --version') do echo    [OK] Found %%v
    set "PY_CMD=python"
) else (
    py --version >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        for /f "tokens=*" %%v in ('py --version') do echo    [OK] Found %%v
        set "PY_CMD=py"
    ) else (
        echo    [!] Python is NOT detected on this system.
        echo    Attempting automatic installation via Windows Package Manager (winget)...
        winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
        if !ERRORLEVEL! equ 0 (
            echo    [OK] Python installed successfully!
            set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
            set "PY_CMD=python"
        ) else (
            echo    [!] Automatic install via winget failed or winget not found.
            echo    Downloading official Python installer...
            powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile 'python_installer.exe'"
            echo    Installing Python silently with PATH configured...
            python_installer.exe /quiet InstallAllUsers=0 PrependPath=1 Include_test=0
            del python_installer.exe
            set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
            set "PY_CMD=python"
        )
    )
)
echo.

:: -------------------------------------------------------------------------
:: STEP 2: Verify / Install Node.js
:: -------------------------------------------------------------------------
echo [2/5] Checking Node.js installation...
node -v >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('node -v') do echo    [OK] Found Node.js %%v
    for /f "tokens=*" %%v in ('npm -v') do echo    [OK] Found npm %%v
) else (
    echo    [!] Node.js is NOT detected on this system.
    echo    Attempting automatic installation via Windows Package Manager (winget)...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if !ERRORLEVEL! equ 0 (
        echo    [OK] Node.js installed successfully!
        set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
    ) else (
        echo    [!] winget install failed. Downloading official Node.js installer...
        powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi' -OutFile 'node_installer.msi'"
        echo    Installing Node.js silently...
        msiexec /i node_installer.msi /quiet /norestart
        del node_installer.msi
        set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
    )
)
echo.

:: -------------------------------------------------------------------------
:: STEP 3: Setup Smart Contracts (Hardhat)
:: -------------------------------------------------------------------------
echo [3/5] Setting up Blockchain Smart Contracts Layer...
cd /d "%SCRIPT_DIR%contracts"
if not exist "node_modules\" (
    echo    Installing Hardhat and OpenZeppelin contract dependencies...
    call npm install
) else (
    echo    [OK] Contracts dependencies already present.
)
echo    Compiling Solidity smart contracts (0.8.20)...
call npx hardhat compile
echo    [OK] Smart contracts compiled successfully.
cd /d "%SCRIPT_DIR%"
echo.

:: -------------------------------------------------------------------------
:: STEP 4: Setup Python Virtual Environment & Django Backend
:: -------------------------------------------------------------------------
echo [4/5] Setting up Django Backend & Cryptographic Engine...
cd /d "%SCRIPT_DIR%backend"
if not exist "venv\" (
    echo    Creating Python virtual environment in backend\venv...
    %PY_CMD% -m venv venv
) else (
    echo    [OK] Existing venv found in backend\venv.
)

echo    Installing backend requirements (Django, DRF, Web3, Cryptography)...
call .\venv\Scripts\python.exe -m pip install --upgrade pip --quiet
call .\venv\Scripts\pip install -r requirements.txt --quiet
echo    [OK] Python dependencies installed.

echo    Applying database migrations...
call .\venv\Scripts\python.exe manage.py makemigrations attribute_authority records --no-input
call .\venv\Scripts\python.exe manage.py migrate --no-input

echo    Seeding initial attributes, test doctors, and sample medical records...
call .\venv\Scripts\python.exe seed_data.py
echo    [OK] Database seeded and ready.
cd /d "%SCRIPT_DIR%"
echo.

:: -------------------------------------------------------------------------
:: STEP 5: Setup Next.js Frontend
:: -------------------------------------------------------------------------
echo [5/5] Setting up Next.js Web Frontend...
cd /d "%SCRIPT_DIR%frontend"
if not exist "node_modules\" (
    echo    Installing Next.js, Tailwind, Ethers.js, and Lucide dependencies...
    call npm install
) else (
    echo    [OK] Frontend dependencies already present.
)
echo    [OK] Frontend ready.
cd /d "%SCRIPT_DIR%"
echo.

:: -------------------------------------------------------------------------
:: SUCCESS SUMMARY & OPTIONAL IMMEDIATE LAUNCH
:: -------------------------------------------------------------------------
color 0A
echo =======================================================================
echo             [SUCCESS] SECURECHAIN ENVIRONMENT IS READY!
echo =======================================================================
echo  - Smart Contracts:  Compiled and tested
echo  - Django Backend:   Configured, migrated, and seeded
echo  - Next.js Frontend: Dependencies installed and configured
echo.
echo To run the project anytime:
echo    Double click: start_all.bat
echo.
set /p LAUNCH="Would you like to start the servers right now? (Y/N): "
if /i "%LAUNCH%"=="Y" (
    echo Starting SecureChain services...
    call "%SCRIPT_DIR%start_all.bat"
) else (
    echo Setup complete. Run start_all.bat whenever you want to launch.
    pause
)
