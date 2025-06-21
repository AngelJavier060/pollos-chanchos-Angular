@echo off
echo =============================================
echo PROCESO DE MIGRACION COMPLETA DE AUTENTICACION
echo =============================================
echo.
echo Este script realizará una migración completa del sistema
echo de autenticación a usar exclusivamente AuthDirectService
echo.
echo El proceso incluye:
echo 1. Creación de respaldos
echo 2. Actualización del interceptor
echo 3. Reemplazo de servicios antiguos por redirección temporal
echo 4. Migración gradual de componentes
echo 5. Corrección de errores específicos
echo.
echo IMPORTANTE: Este proceso puede tomar varios minutos.
echo Se recomienda hacer un respaldo manual del proyecto antes de continuar.
echo.
echo Presione cualquier tecla para continuar o CTRL+C para cancelar...
pause > nul

cls
echo =============================================
echo FASE 1: COPIA DE SEGURIDAD
echo =============================================

mkdir "migracion-backup"
mkdir "migracion-backup\frontend"
mkdir "migracion-backup\frontend\src"
mkdir "migracion-backup\frontend\src\app"
mkdir "migracion-backup\frontend\src\app\core"
mkdir "migracion-backup\frontend\src\app\core\services"
mkdir "migracion-backup\frontend\src\app\core\interceptors"

echo Guardando copias de seguridad de archivos críticos...
xcopy "frontend\src\app\core\services\*.ts" "migracion-backup\frontend\src\app\core\services\" /Y
xcopy "frontend\src\app\core\interceptors\*.ts" "migracion-backup\frontend\src\app\core\interceptors\" /Y
echo Respaldo completado.

cls
echo =============================================
echo FASE 2: REEMPLAZANDO ARCHIVOS ELIMINADOS
echo =============================================

echo Creando versiones de compatibilidad de los servicios...
call limpiar-sistema.bat

echo Creando servicios temporales de redirección...
call migracion-auth-service.bat

cls
echo =============================================
echo FASE 3: ACTUALIZANDO COMPONENTES ESPECÍFICOS
echo =============================================

echo Corrigiendo componente usuarios-directo...
call corregir-usuarios-directo.bat

cls
echo =============================================
echo FASE 4: RECONSTRUYENDO LA APLICACIÓN
echo =============================================

cd frontend
echo Instalando dependencias...
call npm install
echo.

echo Compilando la aplicación...
call npm run build
echo.

echo Iniciando servidor de desarrollo...
echo.
echo La aplicación debería iniciarse en http://localhost:4200
echo Si hay errores, revise la consola e implemente las correcciones necesarias
echo.
echo Presione cualquier tecla para iniciar el servidor...
pause > nul

call npm start
