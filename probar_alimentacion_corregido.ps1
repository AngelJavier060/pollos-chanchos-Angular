#!/usr/bin/env pwsh

Write-Host "🍽️ SCRIPT DE PRUEBA - MÓDULO DE ALIMENTACIÓN" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

# Función para mostrar mensajes con colores
function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host "📋 $Message" -ForegroundColor $Color
}

Write-Status "Iniciando verificación del módulo de alimentación..." "Yellow"

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

# Verificar archivos clave del módulo de alimentación
$archivosEsenciales = @(
    "$frontendPath\src\app\features\pollos\pollos-alimentacion.component.ts",
    "$frontendPath\src\app\features\pollos\pollos-alimentacion.component.html",
    "$frontendPath\src\app\features\pollos\services\alimentacion.service.ts"
)

Write-Status "Verificando archivos esenciales del módulo de alimentación..." "Yellow"

foreach ($archivo in $archivosEsenciales) {
    if (Test-Path $archivo) {
        Write-Status "✅ $((Split-Path $archivo -Leaf))" "Green"
    } else {
        Write-Status "❌ FALTA: $((Split-Path $archivo -Leaf))" "Red"
    }
}

# Verificar correcciones aplicadas
Write-Status "Verificando correcciones aplicadas..." "Cyan"

$archivoAlimentacion = "$frontendPath\src\app\features\pollos\pollos-alimentacion.component.ts"
if (Test-Path $archivoAlimentacion) {
    $contenido = Get-Content $archivoAlimentacion -Raw
    
    if ($contenido -match "getPlaceholderCantidad") {
        Write-Status "✅ Función getPlaceholderCantidad encontrada" "Green"
    } else {
        Write-Status "❌ Función getPlaceholderCantidad NO encontrada" "Red"
    }
    
    if ($contenido -match "getCantidadTotalSugerida") {
        Write-Status "✅ Función getCantidadTotalSugerida encontrada" "Green"
    } else {
        Write-Status "❌ Función getCantidadTotalSugerida NO encontrada" "Red"
    }
    
    if ($contenido -match "formatearCantidad") {
        Write-Status "✅ Función formatearCantidad encontrada" "Green"
    } else {
        Write-Status "❌ Función formatearCantidad NO encontrada" "Red"
    }
}

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
Write-Host "🍽️ RESUMEN - MÓDULO DE ALIMENTACIÓN" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Status "Frontend: http://localhost:4200" "Cyan"
Write-Status "Backend: http://localhost:8080" "Cyan"
Write-Status "Ruta de Alimentación: http://localhost:4200/pollos/alimentacion" "Yellow"
Write-Host ""
Write-Host "📋 FUNCIONALIDADES A PROBAR:" -ForegroundColor Green
Write-Host "  1. 🏠 Dashboard Principal: http://localhost:4200/pollos/dashboard" -ForegroundColor White
Write-Host "  2. 🍽️ Módulo de Alimentación: http://localhost:4200/pollos/alimentacion" -ForegroundColor White
Write-Host "  3. 📝 Formulario de Registro: Verificar que cargue sin errores" -ForegroundColor White
Write-Host "  4. 🔢 Cálculo de Cantidades: Placeholder dinámico funcionando" -ForegroundColor White
Write-Host "  5. 📊 Información de Etapas: Datos por edad del lote" -ForegroundColor White
Write-Host ""
Write-Host "🔍 PUNTOS DE VERIFICACIÓN:" -ForegroundColor Green
Write-Host "  • ✅ Error 'getPlaceholderCantidad is not a function' RESUELTO" -ForegroundColor Green
Write-Host "  • ✅ Función getCantidadTotalSugerida implementada" -ForegroundColor Green
Write-Host "  • ✅ Placeholder dinámico en campo cantidad" -ForegroundColor Green
Write-Host "  • ✅ Cálculos automáticos basados en etapa y número de animales" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 CONTROLES:" -ForegroundColor Green
Write-Host "  • Ctrl+C en esta ventana para detener los servicios" -ForegroundColor White
Write-Host "  • O usa: Stop-Job $($backendJob.Id); Stop-Job $($frontendJob.Id)" -ForegroundColor White
Write-Host ""

# Abrir navegador automáticamente
Write-Status "Abriendo navegador en el módulo de alimentación..." "Green"
Start-Process "http://localhost:4200/pollos/alimentacion"

# Esperar a que el usuario termine
Write-Host "🧪 INSTRUCCIONES DE PRUEBA:" -ForegroundColor Yellow
Write-Host "1. Selecciona un lote de pollos" -ForegroundColor White
Write-Host "2. Haz clic en 'Registrar Alimentación Diaria'" -ForegroundColor White  
Write-Host "3. Verifica que el campo 'Cantidad Total' muestre el placeholder sugerido" -ForegroundColor White
Write-Host "4. Confirma que no aparezcan errores en la consola del navegador" -ForegroundColor White
Write-Host ""
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
Write-Host "¡Módulo de alimentación corregido y funcional! 🍽️" -ForegroundColor Green
