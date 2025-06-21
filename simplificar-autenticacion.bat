@echo off
echo ===================================================
echo PROCESO COMPLETO DE SIMPLIFICACION DE AUTENTICACION
echo ===================================================
echo.
echo Este script ejecutará todos los pasos necesarios para
echo simplificar el sistema de autenticación.
echo.
echo Pasos a realizar:
echo 1. Limpieza de archivos redundantes
echo 2. Actualización del interceptor de autenticación
echo 3. Reinicio de la aplicación
echo.
echo Presione cualquier tecla para continuar o CTRL+C para cancelar...
pause > nul

cls
echo ===================================================
echo PASO 1: LIMPIEZA DE ARCHIVOS REDUNDANTES
echo ===================================================
echo.
call limpiar-sistema.bat

cls
echo ===================================================
echo PASO 2: ACTUALIZACION DEL INTERCEPTOR
echo ===================================================
echo.
call actualizar-interceptor.bat

cls
echo ===================================================
echo PASO 3: REINICIO DE LA APLICACIÓN
echo ===================================================
echo.
echo El proceso de simplificación ha sido completado.
echo.
echo Se recomienda reiniciar tanto el backend como el frontend:
echo.
echo 1. Para reiniciar el backend:
echo    cd backend && mvnw clean spring-boot:run
echo.
echo 2. Para reiniciar el frontend:
echo    cd frontend && npm start
echo.
echo Puede consultar el archivo RESUMEN-AUTENTICACION.md para
echo más detalles sobre los cambios realizados.
echo.
echo ¿Desea reiniciar el backend automáticamente? (S/N)
choice /C SN /M "Reiniciar backend: "
if %errorlevel%==1 (
    start cmd /k "cd backend && mvnw clean spring-boot:run"
)

echo.
echo ¿Desea reiniciar el frontend automáticamente? (S/N)
choice /C SN /M "Reiniciar frontend: "
if %errorlevel%==1 (
    start cmd /k "cd frontend && npm start"
)

echo.
echo ===================================================
echo PROCESO COMPLETADO
echo ===================================================
echo.
echo Por favor, revise la documentación en RESUMEN-AUTENTICACION.md
echo para más detalles sobre los cambios realizados.
echo.
pause
