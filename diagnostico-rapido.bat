@echo off
echo ===== SISTEMA DE DIAGNÓSTICO =====
echo.

echo 1. Verificando estado del backend...
curl -s http://localhost:8088/health > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] El backend no está en ejecución en puerto 8088
    echo.
    echo Para iniciar el backend, ejecute:
    echo start-backend.bat
    echo.
) else (
    echo [OK] Backend en ejecución
)

echo.
echo 2. Verificando Angular...
cd frontend
npm --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js/NPM no encontrado
    echo Instale Node.js desde https://nodejs.org/
) else (
    echo [OK] Node.js instalado
)

echo.
echo Navegue a estas URLs:
echo.
echo - Diagnóstico completo: http://localhost:4200/diagnostico
echo - Depurador de autenticación: http://localhost:4200/debug-auth
echo - Acceso directo a usuarios: http://localhost:4200/admin/usuarios-directo
echo.
echo Para iniciar Angular, ejecute:
echo cd frontend ^&^& ng serve
echo.

echo ===== ANÁLISIS COMPLETO =====

pause
