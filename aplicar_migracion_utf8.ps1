# Script para aplicar migracion con codificacion UTF-8 correcta
# Ejecutar desde PowerShell

Write-Host "=== APLICANDO MIGRACION V7 CON UTF-8 ===" -ForegroundColor Green

# Verificar que MySQL este corriendo
Write-Host "1. Verificando que MySQL este funcionando..." -ForegroundColor Yellow
try {
    $mysqlProcess = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
    if ($mysqlProcess) {
        Write-Host "✅ MySQL esta ejecutandose" -ForegroundColor Green
    } else {
        Write-Host "❌ MySQL no esta ejecutandose. Inicia el servidor MySQL primero." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "⚠️ No se pudo verificar el estado de MySQL" -ForegroundColor Yellow
}

# Configurar variables
$mysqlPath = "mysql" # Cambiar si mysql no esta en PATH
$database = "avicola_db"
$username = "root" # Cambiar por tu usuario
$scriptPath = ".\aplicar_migracion_v7_utf8.sql"

# Solicitar password de MySQL
$password = Read-Host "Ingresa la contraseña de MySQL" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host "2. Aplicando migracion..." -ForegroundColor Yellow

# Ejecutar el script SQL
try {
    # Comando mysql con codificacion UTF-8
    $command = "$mysqlPath -u $username -p$plainPassword --default-character-set=utf8mb4 $database"
    
    Write-Host "Ejecutando: $command < $scriptPath" -ForegroundColor Cyan
    
    # Ejecutar el comando
    Get-Content $scriptPath | & $mysqlPath -u $username -p$plainPassword --default-character-set=utf8mb4 $database
    
    Write-Host "✅ Migracion aplicada exitosamente" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error al aplicar la migracion: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Sugerencias:" -ForegroundColor Yellow
    Write-Host "  - Verifica que MySQL este corriendo" -ForegroundColor Yellow
    Write-Host "  - Verifica usuario y contraseña" -ForegroundColor Yellow
    Write-Host "  - Verifica que la base de datos 'avicola_db' exista" -ForegroundColor Yellow
}

Write-Host "3. Verificando resultado..." -ForegroundColor Yellow
Write-Host "Revisa los resultados en MySQL Workbench o phpMyAdmin" -ForegroundColor Cyan

Read-Host "Presiona Enter para continuar..."
