@echo off
echo ===================================================
echo REINICIANDO APLICACION AVICOLA - LIMPIEZA COMPLETA
echo ===================================================
echo.

echo 1. Deteniendo servicios que puedan estar usando el puerto 8088...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :8088') DO (
  echo Deteniendo proceso con PID: %%T
  taskkill /F /PID %%T
)
echo.

echo 2. Limpiando cache de localStorage...
echo Esto simulará un cierre del navegador y limpieza de datos
echo.

echo 3. Reiniciando backend...
cd backend
call mvnw spring-boot:run > backend.log 2>&1 &
cd ..
echo Backend iniciado en puerto 8088
echo.

echo 4. Esperando 5 segundos para que el backend inicie completamente...
timeout /t 5 /nobreak
echo.

echo 5. Iniciando frontend...
cd frontend
start cmd /c "npm start"
echo.

echo ===================================================
echo REINICIO COMPLETO
echo ===================================================
echo Puedes abrir ahora tu navegador en http://localhost:4200
echo Credenciales admin/admin123
echo.
echo Para ver el estado del backend: tail -f backend/backend.log
echo.
