@echo off
chcp 65001 >nul
title Tatica Gestap - Parando Servidor

echo ============================================
echo    TATICA GESTAP - Parando Servidor
echo ============================================
echo.

docker compose down

echo.
echo [OK] Todos os containers foram parados.
echo.

pause
