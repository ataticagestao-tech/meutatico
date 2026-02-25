@echo off
chcp 65001 >nul
setlocal DisableDelayedExpansion
title Tatica Gestap - Servidor Local

echo ============================================
echo    TATICA GESTAP - Servidor Local
echo    (SQLite + Python + Node.js)
echo ============================================
echo.
echo  Pre-requisitos:
echo    - Python 3.12+
echo    - Node.js 20+
echo.

REM --- Verifica Python ---
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Python nao encontrado
    echo Baixe em: https://www.python.org/downloads/
    echo IMPORTANTE: Marque "Add Python to PATH" na instalacao
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo [OK] %%i

REM --- Verifica Node ---
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js nao encontrado
    echo Baixe em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do echo [OK] Node.js %%i
echo.

REM --- Configura .env do backend ---
echo [INFO] Configurando backend\.env...
echo APP_NAME=Tatica Gestap> backend\.env
echo DEBUG=true>> backend\.env
echo API_PREFIX=/api/v1>> backend\.env
echo DATABASE_URL=sqlite+aiosqlite:///./tatica_gestap.db>> backend\.env
echo JWT_SECRET_KEY=dev-secret-key-change-in-production-min-32-chars>> backend\.env
echo SUPER_ADMIN_SECRET_KEY=dev-super-admin-secret-change-in-production>> backend\.env
echo STORAGE_BACKEND=local>> backend\.env
echo STORAGE_LOCAL_PATH=./uploads>> backend\.env
echo CORS_ORIGINS=["http://localhost:3000"]>> backend\.env
echo [OK] backend\.env configurado
echo.

REM --- Setup Python venv ---
echo ============================================
echo    Configurando Backend Python...
echo ============================================
echo.

cd backend

if not exist "venv" (
    echo [INFO] Criando virtual environment...
    python -m venv venv
    echo [OK] venv criado
) else (
    echo [OK] venv ja existe
)

echo [INFO] Instalando dependencias Python...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo [OK] Dependencias instaladas
echo.

REM --- Cria pasta uploads ---
if not exist "uploads" mkdir uploads

REM --- Migrations (cria banco SQLite) ---
echo [INFO] Criando banco de dados SQLite...
alembic upgrade head
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao criar o banco
    echo.
    pause
    exit /b 1
)
echo [OK] Banco SQLite criado
echo.

REM --- Seed ---
echo [INFO] Populando dados iniciais...
python seed.py
echo.

REM --- Inicia Backend ---
echo ============================================
echo    Iniciando Backend (porta 8000)...
echo ============================================
echo.
start "TATICA GESTAP - Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app"

cd ..

REM --- Setup Frontend ---
echo.
echo ============================================
echo    Configurando Frontend Next.js...
echo ============================================
echo.

cd frontend

if not exist "node_modules" (
    echo [INFO] Instalando dependencias npm (pode demorar)...
    call npm install
) else (
    echo [OK] node_modules ja existe
)
echo.

REM --- Inicia Frontend ---
echo ============================================
echo    Iniciando Frontend (porta 3000)...
echo ============================================
echo.
start "TATICA GESTAP - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

cd ..

REM --- Aguarda e abre navegador ---
echo.
echo Aguardando frontend compilar...
echo (Tentando conectar em localhost:3000...)
:WAIT_LOOP
timeout /t 3 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% neq 0 goto WAIT_LOOP
echo [OK] Frontend esta rodando

echo.
echo ============================================
echo.
echo    TATICA GESTAP INICIADO COM SUCESSO
echo.
echo ============================================
echo.
echo    Frontend:   http://localhost:3000
echo    API:        http://localhost:8000/api/v1
echo    API Docs:   http://localhost:8000/docs
echo.
echo  ------------------------------------------
echo.
echo    LOGIN TENANT:
echo    Email: admin@taticagestap.com.br
echo    Senha: TrocaR@123!
echo.
echo    LOGIN SUPER ADMIN (via /super-admin):
echo    Email: admin@taticagestap.com.br
echo    Senha: TrocaR@123!
echo.
echo  ------------------------------------------
echo.
echo    Banco: backend\tatica_gestap.db (SQLite)
echo    Feche as janelas para parar os servidores.
echo.
echo ============================================

start http://localhost:3000

pause
