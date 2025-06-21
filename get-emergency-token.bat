@echo off
echo ===================================
echo Generador de Token de Emergencia
echo ===================================

echo Obteniendo token de emergencia para admin...

curl -X POST "http://localhost:8088/api/auth/login" ^
     -H "Content-Type: application/json" ^
     -H "X-Emergency-Auth: true" ^
     -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > emergency_token_response.json

echo Token guardado en emergency_token_response.json
echo.
echo Para activar el modo de emergencia, inicie sesión en:
echo http://localhost:4200/diagnostico/auth
echo.
echo Presione cualquier tecla para salir...
pause > nul
