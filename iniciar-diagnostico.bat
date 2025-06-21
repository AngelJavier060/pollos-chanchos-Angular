@echo off
echo ===== INICIANDO HERRAMIENTA DE DIAGNOSTICO COMPLETO =====
echo.

REM Verificar si estamos en el directorio correcto
if not exist "backend" (
    echo ERROR: No se encuentra la carpeta "backend". Ejecute este script desde el directorio raiz del proyecto.
    goto :end
)

REM Verificar si el backend está en ejecución
echo Verificando estado del backend...
curl -s http://localhost:8088/health > nul 2>&1
if %errorlevel% neq 0 (
    echo [!] El backend no está en ejecución. Iniciando...
    start cmd /k "title Backend Server && cd backend && java -jar target\avicola_backend-0.0.1-SNAPSHOT.jar"
    echo Backend iniciado en una nueva ventana.
) else (
    echo [✓] El backend ya está en ejecución.
)

REM Verificar si Angular Dev Server está en ejecución
echo Verificando estado del servidor Angular...
curl -s http://localhost:4200 > nul 2>&1
if %errorlevel% neq 0 (
    echo [!] El servidor Angular no está en ejecución. Iniciando...
    start cmd /k "title Angular Dev Server && cd frontend && ng serve"
    echo Angular Dev Server iniciado en una nueva ventana.
) else (
    echo [✓] El servidor Angular ya está en ejecución.
)

echo.
echo Esperando a que los servidores estén listos...
timeout /t 5 /nobreak > nul

echo.
echo ===== INSTRUCCIONES =====
echo.
echo 1. Abra un navegador y acceda a:
echo    http://localhost:4200/diagnostico
echo.
echo 2. Siga las instrucciones en pantalla para realizar el diagnóstico completo.
echo.
echo 3. Si prefiere el depurador de autenticación, acceda a:
echo    http://localhost:4200/debug-auth
echo.
echo.
echo Presione cualquier tecla para abrir automáticamente el navegador...
pause > nul

start http://localhost:4200/diagnostico

:end
