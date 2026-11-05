@echo off
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

if not exist "backend\venv\Scripts\python.exe" goto setup_project
if not exist "frontend\node_modules\" goto setup_project
if not exist "contracts\node_modules\" goto setup_project
goto services_ready

:setup_project
echo [!] Project dependencies not found. Running setup_and_install.bat first...
call "%SCRIPT_DIR%setup_and_install.bat"
if errorlevel 1 exit /b 1

:services_ready

echo =======================================================================
echo          SecureChain: Local Medical Records Demo
echo =======================================================================
echo Starting Hardhat, Django, and Next.js...
echo.

echo [1/3] Starting local Hardhat blockchain on http://127.0.0.1:8545 ...
start "SecureChain Hardhat" /D "%SCRIPT_DIR%contracts" cmd /k "npm run node"

timeout /t 5 /nobreak >nul

echo [2/3] Deploying audit contract...
pushd "%SCRIPT_DIR%contracts"
call npm run deploy:local
if errorlevel 1 (
    popd
    echo [ERROR] Could not deploy the audit contract. Check that Hardhat started.
    pause
    exit /b 1
)
popd

echo [3/3] Starting Django API and Next.js frontend...
start "SecureChain Django Backend" /D "%SCRIPT_DIR%backend" cmd /k "set BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545&& set BLOCKCHAIN_ACCOUNT=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&& venv\Scripts\python.exe manage.py runserver 127.0.0.1:8001"
start "SecureChain Next.js Frontend" /D "%SCRIPT_DIR%frontend" cmd /k "set NEXT_PUBLIC_API_URL=http://127.0.0.1:8001/api&& npm run dev"

echo.
echo The local demo services have been launched.
echo Access the Web Application at: http://localhost:3000
echo Access the Django API at:      http://127.0.0.1:8001/api/health/
echo Blockchain RPC:                http://127.0.0.1:8545
echo =======================================================================
exit /b 0
