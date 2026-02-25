@echo off
title TATICA GESTAP - Servidor
color 0A

echo ========================================
echo   TATICA GESTAP - Iniciando Sistema
echo ========================================
echo.

:: Backend
echo [1/2] Iniciando Backend (porta 8000)...
cd /d "c:\Users\izabe\OneDrive\Desktop\PROGRAMACAO\CENTRAL TATICA\tatica-gestap\backend"
start "TATICA Backend" cmd /k "cd /d \"c:\Users\izabe\OneDrive\Desktop\PROGRAMAÇÃO\CENTRAL TATICA\tatica-gestap\backend\" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Aguardar backend subir
timeout /t 3 /nobreak >nul

:: Frontend
echo [2/2] Iniciando Frontend (porta 3000)...
start "TATICA Frontend" cmd /k "cd /d \"c:\Users\izabe\OneDrive\Desktop\PROGRAMAÇÃO\CENTRAL TATICA\tatica-gestap\frontend\" && npx next dev -p 3000"

:: Aguardar frontend subir
timeout /t 8 /nobreak >nul

:: Abrir navegador
echo.
echo [OK] Abrindo navegador...
start http://localhost:3000

echo.
echo ========================================
echo   Sistema iniciado com sucesso!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
