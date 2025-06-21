@echo off
echo ===================================================
echo DIAGNOSTICO Y LIMPIEZA DE SISTEMA AVICOLA
echo ===================================================
echo.

echo Seleccione una opción:
echo.
echo 1. Iniciar herramienta de diagnóstico
echo 2. Limpiar token y localStorage
echo 3. Reiniciar completamente el sistema
echo 4. Salir
echo.

set /p opcion="Ingrese el número de opción: "

if "%opcion%"=="1" (
    echo.
    echo Abriendo herramienta de diagnóstico...
    start http://localhost:4200/diagnostico
    goto :end
)

if "%opcion%"=="2" (
    echo.
    echo Instrucciones para limpiar localStorage:
    echo.
    echo 1. En Chrome o Edge, abre las herramientas de desarrollador (F12)
    echo 2. Ve a la pestaña Application (Aplicación)
    echo 3. En el panel izquierdo, expande "Storage" y selecciona "Local Storage"
    echo 4. Haz clic derecho en "http://localhost:4200" y selecciona "Clear"
    echo 5. Recarga la página (F5)
    echo.
    pause
    goto :menu
)

if "%opcion%"=="3" (
    echo.
    echo Iniciando reinicio completo del sistema...
    call restart-app.bat
    goto :end
)

if "%opcion%"=="4" (
    goto :end
)

echo.
echo Opción no válida. Por favor, seleccione una opción válida.
echo.
goto :menu

:end
echo.
echo Gracias por usar el Diagnóstico Avícola
echo.
