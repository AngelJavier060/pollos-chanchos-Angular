@echo off
echo ===== INICIALIZANDO BACKEND =====
echo.

cd backend
echo Verificando servidor...
netstat -ano | findstr :8088
if %errorlevel% equ 0 (
    echo.
    echo [AVISO] El puerto 8088 ya está en uso. Puede haber otro servidor ejecutándose.
    echo.
    echo Para detener un proceso existente, busque el PID (último número de la línea anterior)
    echo y ejecute: taskkill /F /PID {número}
    echo.
    pause
) else (
    echo Puerto 8088 disponible
)

echo.
echo Iniciando servidor...
echo.
java -jar target\avicola_backend-0.0.1-SNAPSHOT.jar

pause
