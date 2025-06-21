@echo off
echo =============================================
echo ACTUALIZANDO INTERCEPTOR DE AUTENTICACION
echo =============================================
echo.

echo 1. Haciendo copia de seguridad del interceptor actual...
copy "frontend\src\app\core\interceptors\auth.interceptor.ts" "frontend\src\app\core\interceptors\auth.interceptor.backup.ts" > nul
echo    [OK] Copia de seguridad creada en auth.interceptor.backup.ts

echo 2. Reemplazando con el nuevo interceptor unificado...
copy "frontend\src\app\core\interceptors\auth.interceptor.new.ts" "frontend\src\app\core\interceptors\auth.interceptor.ts" > nul
echo    [OK] Interceptor actualizado correctamente

echo.
echo =============================================
echo ACTUALIZACION COMPLETADA
echo =============================================
echo.
echo IMPORTANTE:
echo Asegurese de que el nuevo interceptor está configurado en el módulo correcto.
echo Revise el archivo "frontend\src\app\core\core.module.ts"
echo.
echo Si encuentra problemas con la autenticación, puede restaurar la versión anterior:
echo   copy "frontend\src\app\core\interceptors\auth.interceptor.backup.ts" "frontend\src\app\core\interceptors\auth.interceptor.ts"
echo.

pause
