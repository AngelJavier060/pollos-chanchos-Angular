@echo off
echo ========================================
echo MIGRACION A AUTHSERVICE UNIFICADO
echo ========================================
echo.
echo Este script realizará la migración de todos los componentes
echo para que utilicen únicamente AuthDirectService.
echo.
echo ATENCIÓN: Haga una copia de seguridad de su proyecto antes de continuar.
echo.
echo Presione cualquier tecla para continuar o CTRL+C para cancelar...
pause > nul

@REM Crear directorio de respaldo
mkdir "migracion-backup"
mkdir "migracion-backup\frontend"
mkdir "migracion-backup\frontend\src"

@REM Hacer respaldo de archivos clave
xcopy "frontend\src\app\core\services\*.ts" "migracion-backup\frontend\src\" /Y
xcopy "frontend\src\app\core\interceptors\*.ts" "migracion-backup\frontend\src\" /Y

echo.
echo ========================================
echo FASE 1: ACTUALIZANDO SERVICIOS TEMPORALES
echo ========================================
echo.

@REM Cambiando imports en archivos clave
powershell -Command "Get-ChildItem -Path 'frontend\src\app' -Recurse -Include '*.ts' | ForEach-Object { (Get-Content $_ -Raw) -replace 'import \{ AuthService \} from (.+);', 'import { AuthDirectService } from ''$1'' /* Migración: reemplazar import */;' | Set-Content $_ -NoNewline }"

@REM Cambiando inyección de dependencias
powershell -Command "Get-ChildItem -Path 'frontend\src\app' -Recurse -Include '*.ts' | ForEach-Object { (Get-Content $_ -Raw) -replace 'private authService: AuthService', 'private authDirectService: AuthDirectService /* Migrado */' | Set-Content $_ -NoNewline }"

@REM Cambiando llamadas a métodos
powershell -Command "Get-ChildItem -Path 'frontend\src\app' -Recurse -Include '*.ts' | ForEach-Object { (Get-Content $_ -Raw) -replace 'this\.authService\.', 'this.authDirectService. /* Migrado */' | Set-Content $_ -NoNewline }"

echo.
echo ========================================
echo FASE 2: COPIANDO NUEVO INTERCEPTOR
echo ========================================
echo.

@REM Copiar el nuevo interceptor al lugar correcto
copy "frontend\src\app\core\interceptors\auth.interceptor.new.ts" "frontend\src\app\core\interceptors\auth.interceptor.ts" /Y

echo.
echo ========================================
echo MIGRACIÓN COMPLETADA!
echo ========================================
echo.
echo Debe revisar manualmente su código para corregir cualquier
echo error restante. Los servicios originales se han reemplazado
echo por versiones compatibles que redirigen a AuthDirectService.
echo.
echo Errores comunes a buscar:
echo - Referencias a 'authService' que deberían ser 'authDirectService'
echo - Métodos que existen en el antiguo servicio pero no en el nuevo
echo - Diferencias de tipo o parámetros entre implementaciones de métodos
echo.
echo Se ha creado un respaldo de sus archivos originales en la carpeta:
echo "migracion-backup"
echo.

pause
