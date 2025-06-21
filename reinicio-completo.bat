@echo off
echo ===================================
echo SCRIPT DE REINICIO COMPLETO DEL SISTEMA
echo ===================================
echo.

echo 1. Parando servicios actuales...
taskkill /f /im java.exe /fi "windowtitle eq backend*" > nul 2>&1
taskkill /f /im node.exe /fi "windowtitle eq frontend*" > nul 2>&1
echo    [OK] Servicios detenidos

echo 2. Limpiando archivos temporales...
rd /s /q "%TEMP%\.angular" 2>nul
rd /s /q "frontend\.angular" 2>nul
rd /s /q "frontend\node_modules\.cache" 2>nul
echo    [OK] Archivos temporales limpiados

echo 3. Limpiando compilados del backend...
rd /s /q "backend\target" 2>nul
echo    [OK] Compilados del backend limpiados

echo 4. Reiniciando el backend...
start "backend" cmd /c "cd backend && mvnw clean spring-boot:run"
echo    [OK] Proceso de backend iniciado

echo 5. Esperando a que el backend esté disponible...
timeout /t 20 /nobreak
echo    [OK] Continuando después de espera

echo 6. Iniciando el frontend...
start "frontend" cmd /c "cd frontend && npm start"
echo    [OK] Proceso de frontend iniciado

echo.
echo ===================================
echo SISTEMA REINICIADO CORRECTAMENTE
echo ===================================
echo.
echo Información importante:
echo - Backend ejecutándose en http://localhost:8088
echo - Frontend ejecutándose en http://localhost:4200
echo.
echo Use las credenciales de admin:
echo - Usuario: admin
echo - Contraseña: admin123
echo.
echo Si persisten los problemas después del reinicio:
echo 1. Revise los logs del backend en la ventana correspondiente
echo 2. Ejecute el diagnóstico con "node diagnostico-autenticacion.js"
echo.

pause
