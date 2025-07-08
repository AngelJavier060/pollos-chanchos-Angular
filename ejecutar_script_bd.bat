@echo off
echo ===================================
echo EJECUTANDO SCRIPT DE CORRECCION BD
echo ===================================

echo Conectando a MySQL...
mysql -u root -p1234 db_avicola < sistema_correccion_bd.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Script ejecutado exitosamente
    echo ✅ Tablas de corrección creadas
    echo ✅ Validaciones de alimentación insertadas
    echo ✅ Permisos de corrección configurados
) else (
    echo.
    echo ❌ Error al ejecutar el script
    echo Verifica la conexión a la base de datos
)

echo.
echo Presiona cualquier tecla para continuar...
pause > nul
