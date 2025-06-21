@echo off
echo ======================================================
echo Reiniciando la aplicación Angular con autenticación unificada
echo ======================================================
echo.

echo 1. Deteniendo procesos activos...
taskkill /F /IM node.exe >nul 2>&1

echo 2. Limpiando caché...
cd frontend
if exist .angular\cache rmdir /s /q .angular\cache

echo 3. Reinstalando dependencias si es necesario...
call npm install

echo 4. Iniciando la aplicación Angular...
start cmd /k "cd frontend && npm start"

echo 5. Iniciando el backend en una nueva ventana...
cd ..
start cmd /k "cd backend && ..\start-backend.bat"

echo.
echo ======================================================
echo Aplicación iniciada!
echo - Frontend: http://localhost:4200
echo - Backend: http://localhost:8080
echo ======================================================

timeout /t 5
