@echo off
echo ===================================
echo LIMPIEZA DE ARCHIVOS INNECESARIOS
echo ===================================
echo.

echo 1. Eliminando archivos de diagnóstico...
del /q "diagnostico-autenticacion.js" 2>nul
del /q "diagnostico-autenticacion.html" 2>nul
del /q "diagnostico-menu.bat" 2>nul
del /q "diagnostico-rapido.bat" 2>nul
echo    [OK] Archivos de diagnóstico eliminados

echo 2. Eliminando servicios de autenticación redundantes...
del /F /Q "frontend\src\app\core\services\auth.service.ts" 2>nul
del /F /Q "frontend\src\app\core\services\emergency-auth.service.ts" 2>nul
del /F /Q "frontend\src\app\core\interceptors\auth.interceptor.simplified.ts" 2>nul
echo    [OK] Servicios de autenticación redundantes eliminados

echo 3. Limpiando archivos temporales...
rd /s /q "%TEMP%\.angular" 2>nul
rd /s /q "frontend\.angular" 2>nul
rd /s /q "frontend\node_modules\.cache" 2>nul
echo    [OK] Archivos temporales eliminados

echo.
echo ===================================
echo LIMPIEZA COMPLETADA
echo ===================================
echo.
echo SIGUIENTE PASO:
echo 1. Reiniciar el frontend con el comando:
echo    cd frontend && npm start
echo.
echo 2. Reiniciar el backend con el comando:
echo    cd backend && mvnw clean spring-boot:run
echo.

pause
