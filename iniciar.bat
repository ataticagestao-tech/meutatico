@echo off
chcp 65001 >nul
title Tatica Gestap - Servidor Local

echo ============================================
echo    TATICA GESTAP - Iniciando Servidor Local
echo ============================================
echo.

:: Verifica se Docker está rodando
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Docker nao esta rodando!
    echo.
    echo Por favor, inicie o Docker Desktop e tente novamente.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker detectado
echo.

:: Copia .env se nao existir
if not exist ".env" (
    echo [INFO] Criando arquivo .env a partir do .env.example...
    copy .env.example .env >nul
    echo [OK] Arquivo .env criado
) else (
    echo [OK] Arquivo .env ja existe
)

echo.
echo ============================================
echo    Subindo containers (PostgreSQL, Redis,
echo    Backend FastAPI, Frontend Next.js)...
echo ============================================
echo.

:: Sobe tudo com Docker Compose
docker compose up --build -d

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao iniciar os containers.
    echo Verifique se as portas 3000, 5432, 6379 e 8000 estao livres.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo    Aguardando servicos ficarem prontos...
echo ============================================
echo.

:: Aguarda backend ficar pronto (healthcheck)
echo Aguardando banco de dados...
timeout /t 10 /nobreak >nul

echo Aguardando backend (migrations + startup)...
timeout /t 15 /nobreak >nul

:: Executa seed para popular dados iniciais
echo.
echo ============================================
echo    Executando seed (dados iniciais)...
echo ============================================
echo.
docker compose exec backend python seed.py

echo.
echo ============================================
echo    Aguardando frontend compilar...
echo ============================================
echo.
timeout /t 10 /nobreak >nul

echo.
echo ============================================
echo.
echo    TATICA GESTAP INICIADO COM SUCESSO!
echo.
echo ============================================
echo.
echo    Frontend:   http://localhost:3000
echo    API:        http://localhost:8000/api/v1
echo    API Docs:   http://localhost:8000/docs
echo.
echo  ──────────────────────────────────────────
echo.
echo    LOGIN TENANT (usuario normal):
echo    Email: admin@taticagestap.com.br
echo    Senha: TrocaR@123!
echo.
echo    LOGIN SUPER ADMIN:
echo    Email: admin@taticagestap.com.br
echo    Senha: TrocaR@123!
echo    (acessar via /super-admin)
echo.
echo  ──────────────────────────────────────────
echo.
echo    Para parar: execute  parar.bat
echo    Ou:  docker compose down
echo.
echo ============================================
echo.

:: Abre o navegador
start http://localhost:3000

pause
