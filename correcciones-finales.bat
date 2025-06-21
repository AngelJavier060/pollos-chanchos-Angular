@echo off
echo =============================================
echo CORRECCIONES FINALES Y REINICIO DE LA APLICACION
echo =============================================
echo.
echo Este script realizará las correcciones finales
echo en los archivos temporales y reiniciará la aplicación.
echo.
echo Presione cualquier tecla para continuar o CTRL+C para cancelar...
pause > nul

echo.
echo =============================================
echo FASE 1: ACTUALIZANDO TIPOS IMPLÍCITOS
echo =============================================
echo.

echo Añadiendo tipos a parámetros implícitos en usuarios-directo.component.ts...
powershell -Command "(Get-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts') -replace '(\(response\))\s=>\s\{', '(response: any) => {' | Set-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts'"
powershell -Command "(Get-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts') -replace '(\(users\))\s=>\s\{', '(users: any) => {' | Set-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts'"
powershell -Command "(Get-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts') -replace '(\(error\))\s=>\s\{', '(error: any) => {' | Set-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts'"

echo.
echo =============================================
echo FASE 2: COMPILANDO LA APLICACIÓN
echo =============================================
echo.

cd frontend
echo Instalando dependencias (puede tomar unos minutos)...
call npm install

echo.
echo Compilando la aplicación...
call npm run build

echo.
echo =============================================
echo FASE 3: LIMPIEZA FINAL
echo =============================================
echo.
echo Eliminando archivos temporales...
del /q ".angular\cache\*.*" 2>nul

echo.
echo =============================================
echo PROCESO COMPLETADO
echo =============================================
echo.
echo La aplicación ha sido corregida y compilada.
echo.
echo Para iniciar el frontend:
echo   cd frontend && npm start
echo.
echo Para iniciar el backend:
echo   cd backend && mvn clean spring-boot:run
echo.
echo Si persisten problemas, revise los errores y actualice
echo manualmente los archivos.
echo.

pause
