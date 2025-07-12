#!/usr/bin/env pwsh

Write-Host "🚀 SCRIPT DE PRUEBA COMPLETA - INVENTARIO CON ANÁLISIS" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

# Función para mostrar mensajes con colores
function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host "📋 $Message" -ForegroundColor $Color
}

# Función para verificar si un proceso está corriendo
function Test-ProcessRunning {
    param([string]$ProcessName)
    return (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue) -ne $null
}

Write-Status "Iniciando verificación del sistema..." "Yellow"

# Verificar directorios
$frontendPath = "d:\PROGRAMAS CREADOS PROBADOS 2025\pollos-chanchos Angular\frontend"
$backendPath = "d:\PROGRAMAS CREADOS PROBADOS 2025\pollos-chanchos Angular\backend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ ERROR: No se encuentra el directorio frontend" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ ERROR: No se encuentra el directorio backend" -ForegroundColor Red
    exit 1
}

Write-Status "Directorios verificados correctamente" "Green"

# Verificar y detener procesos existentes
Write-Status "Verificando procesos existentes..." "Yellow"

$javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue
if ($javaProcesses) {
    Write-Status "Deteniendo procesos Java existentes..." "Yellow"
    $javaProcesses | Stop-Process -Force
    Start-Sleep -Seconds 3
}

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Status "Deteniendo procesos Node existentes..." "Yellow"
    $nodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 3
}

# Compilar Backend
Write-Status "Compilando backend Spring Boot..." "Cyan"
Set-Location $backendPath

try {
    $compileResult = & .\mvnw.cmd clean compile -q
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✅ Backend compilado exitosamente" "Green"
    } else {
        Write-Host "⚠️ ADVERTENCIA: Problemas en la compilación del backend" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ERROR: Fallo en la compilación del backend: $_" -ForegroundColor Red
}

# Iniciar Backend en segundo plano
Write-Status "Iniciando servidor backend..." "Cyan"
$backendJob = Start-Job -ScriptBlock {
    Set-Location "d:\PROGRAMAS CREADOS PROBADOS 2025\pollos-chanchos Angular\backend"
    & .\mvnw.cmd spring-boot:run -Dspring-boot.run.jvmArguments="-Dserver.port=8080"
}

Write-Status "Backend iniciándose (Job ID: $($backendJob.Id))..." "Yellow"

# Esperar que el backend esté listo
Write-Status "Esperando que el backend esté disponible..." "Yellow"
$maxAttempts = 30
$attempt = 0
$backendReady = $false

do {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        # Continuar intentando
    }
    
    $attempt++
    Write-Host "." -NoNewline -ForegroundColor Yellow
} while ($attempt -lt $maxAttempts)

if ($backendReady) {
    Write-Host ""
    Write-Status "✅ Backend listo en http://localhost:8080" "Green"
} else {
    Write-Host ""
    Write-Status "⚠️ Backend tardando en responder, continuando con frontend..." "Yellow"
}

# Instalar dependencias del frontend si es necesario
Set-Location $frontendPath
Write-Status "Verificando dependencias del frontend..." "Cyan"

if (-not (Test-Path "node_modules")) {
    Write-Status "Instalando dependencias de npm..." "Yellow"
    npm install --silent
}

# Iniciar Frontend
Write-Status "Iniciando servidor de desarrollo Angular..." "Cyan"
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "d:\PROGRAMAS CREADOS PROBADOS 2025\pollos-chanchos Angular\frontend"
    npm start
}

Write-Status "Frontend iniciándose (Job ID: $($frontendJob.Id))..." "Yellow"

# Esperar que el frontend esté listo
Write-Status "Esperando que Angular esté disponible..." "Yellow"
$maxAttempts = 60
$attempt = 0
$frontendReady = $false

do {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4200" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $frontendReady = $true
            break
        }
    } catch {
        # Continuar intentando
    }
    
    $attempt++
    Write-Host "." -NoNewline -ForegroundColor Yellow
} while ($attempt -lt $maxAttempts)

Write-Host ""

if ($frontendReady) {
    Write-Status "✅ Frontend listo en http://localhost:4200" "Green"
} else {
    Write-Status "⚠️ Frontend tardando en responder..." "Yellow"
}

# Mostrar resumen
Write-Host ""
Write-Host "🎯 RESUMEN DEL SISTEMA" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Status "Frontend: http://localhost:4200" "Cyan"
Write-Status "Backend: http://localhost:8080" "Cyan"
Write-Status "Ruta de Inventario: http://localhost:4200/pollos/inventario" "Yellow"
Write-Host ""
Write-Host "📋 FUNCIONALIDADES A PROBAR:" -ForegroundColor Green
Write-Host "  1. 🏠 Dashboard Principal: http://localhost:4200/pollos/dashboard" -ForegroundColor White
Write-Host "  2. 📦 Gestión de Inventario: http://localhost:4200/pollos/inventario" -ForegroundColor White
Write-Host "  3. 📊 Vista de Productos: Navegación entre productos y análisis" -ForegroundColor White
Write-Host "  4. 📈 Analytics de Consumo: Datos por semana/mes/año" -ForegroundColor White
Write-Host "  5. 🐔 Análisis por Lote: Consumo, costos y rentabilidad" -ForegroundColor White
Write-Host ""
Write-Host "🔧 CONTROLES:" -ForegroundColor Green
Write-Host "  • Ctrl+C en esta ventana para detener los servicios" -ForegroundColor White
Write-Host "  • O usa: Stop-Job $($backendJob.Id); Stop-Job $($frontendJob.Id)" -ForegroundColor White
Write-Host ""

# Abrir navegador automáticamente
Write-Status "Abriendo navegador en la página de inventario..." "Green"
Start-Process "http://localhost:4200/pollos/inventario"

# Esperar a que el usuario termine
Write-Host "Presiona CTRL+C para detener todos los servicios..." -ForegroundColor Yellow
try {
    # Mantener el script corriendo hasta que el usuario lo detenga
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Verificar estado de los jobs
        $backendState = (Get-Job -Id $backendJob.Id).State
        $frontendState = (Get-Job -Id $frontendJob.Id).State
        
        if ($backendState -eq "Failed") {
            Write-Host "❌ ERROR: Backend falló" -ForegroundColor Red
            break
        }
        
        if ($frontendState -eq "Failed") {
            Write-Host "❌ ERROR: Frontend falló" -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Status "Deteniendo servicios..." "Yellow"
} finally {
    # Cleanup
    Write-Status "Limpiando procesos..." "Yellow"
    
    try {
        Stop-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
        Remove-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    } catch {}
    
    try {
        Stop-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
        Remove-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
    } catch {}
    
    # Detener procesos Java y Node restantes
    Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Write-Status "✅ Todos los servicios detenidos" "Green"
}

Write-Host ""
Write-Host "¡Gracias por usar el sistema de análisis de inventario! 🐔" -ForegroundColor Green
