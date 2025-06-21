@echo off
echo ========================================
echo CORRIGIENDO COMPONENTE USUARIOS-DIRECTO
echo ========================================
echo.

@REM Hacer respaldo del componente
mkdir "migracion-backup\frontend\src\admin" 2>nul
copy "frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts" "migracion-backup\frontend\src\admin\" /Y

echo Eliminando importación de EmergencyAuthService...
powershell -Command "(Get-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts') -replace 'import \{ EmergencyAuthService \} from ''../../../core/services/emergency-auth.service'';', '' | Set-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts' -NoNewline"

echo Eliminando referencia de EmergencyAuthService en el constructor...
powershell -Command "(Get-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts') -replace 'private emergencyAuth: EmergencyAuthService', '' | Set-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts' -NoNewline"

echo Reemplazando llamadas a emergencyAuth...
powershell -Command "(Get-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts') -replace 'this\.emergencyAuth\.', 'this.authService.' | Set-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts' -NoNewline"

echo Añadiendo tipos a los parámetros implícitos...
powershell -Command "(Get-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts') -replace 'response\)\s=>\s\{', 'response: any) => {' | Set-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts' -NoNewline"
powershell -Command "(Get-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts') -replace 'users\)\s=>\s\{', 'users: any) => {' | Set-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts' -NoNewline"
powershell -Command "(Get-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts') -replace 'error\)\s=>\s\{', 'error: any) => {' | Set-Content 'frontend\src\app\features\admin\usuarios-directo\usuarios-directo.component.ts' -NoNewline"

echo.
echo ========================================
echo CORRECCIONES COMPLETADAS
echo ========================================
echo.
echo Se han aplicado correcciones al componente usuarios-directo.component.ts
echo Se ha creado un respaldo en migracion-backup\frontend\src\admin\
echo.

pause
