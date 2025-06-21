@echo off
echo =============================================
echo REINICIANDO BACKEND CON CONFIGURACION CORREGIDA
echo =============================================
echo.
echo Este script reiniciara el backend con la configuracion
echo corregida para los tiempos de expiracion del token JWT.
echo.

cd backend
echo Limpiando proyecto y reiniciando...
echo.
call mvn clean spring-boot:run
