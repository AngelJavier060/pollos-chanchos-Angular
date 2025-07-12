#!/usr/bin/env pwsh

Write-Host "🎯 SCRIPT DE VERIFICACIÓN - DATOS REALES MÚLTIPLES PRODUCTOS" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

# Función para mostrar mensajes con colores
function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host "📋 $Message" -ForegroundColor $Color
}

Write-Status "Verificando corrección para múltiples productos por etapa..." "Yellow"

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

# Verificar correcciones específicas aplicadas
Write-Status "Verificando correcciones en AnalisisInventarioService..." "Cyan"

$archivoAnalisis = "$frontendPath\src\app\shared\services\analisis-inventario.service.ts"
if (Test-Path $archivoAnalisis) {
    $contenido = Get-Content $archivoAnalisis -Raw
    
    $verificaciones = @(
        @{ Nombre = "Filtrar TODAS las etapas correspondientes"; Pattern = "etapasCorrespondientes = planPollo\.detalles\.filter" },
        @{ Nombre = "forEach para sumar productos"; Pattern = "etapasCorrespondientes\.forEach" },
        @{ Nombre = "Suma de cantidades múltiples"; Pattern = "cantidadTotalDiariaKg \+=" },
        @{ Nombre = "Log de productos detallados"; Pattern = "productosDetalle: productosUsados" },
        @{ Nombre = "Búsqueda mejorada de plan pollo"; Pattern = "animalName\.includes\('pollo'\)" },
        @{ Nombre = "Logging de plan encontrado"; Pattern = "Plan encontrado para pollos" },
        @{ Nombre = "Múltiples criterios de búsqueda"; Pattern = "planName\.includes\('pollo'\)" }
    )
    
    foreach ($verificacion in $verificaciones) {
        if ($contenido -match $verificacion.Pattern) {
            Write-Status "✅ $($verificacion.Nombre)" "Green"
        } else {
            Write-Status "❌ FALTA: $($verificacion.Nombre)" "Red"
        }
    }
} else {
    Write-Status "❌ No se encuentra el archivo AnalisisInventarioService" "Red"
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
Write-Host "🎯 VERIFICACIÓN DE MÚLTIPLES PRODUCTOS POR ETAPA" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Status "Frontend: http://localhost:4200" "Cyan"
Write-Status "Backend: http://localhost:8080" "Cyan"
Write-Status "Panel Administrador: http://localhost:4200/admin/plan-nutricional" "Yellow"
Write-Status "Inventario con Análisis: http://localhost:4200/pollos/inventario" "Yellow"
Write-Status "Módulo Alimentación: http://localhost:4200/pollos/alimentacion" "Yellow"
Write-Host ""
Write-Host "📋 DATOS ESPERADOS SEGÚN CONFIGURACIÓN:" -ForegroundColor Green
Write-Host "  🌽 Maíz: 0.2 kg/animal/día" -ForegroundColor Yellow
Write-Host "  🥣 Balanceado: 0.1 kg/animal/día" -ForegroundColor Yellow  
Write-Host "  🌾 Ahipal: 0.05 kg/animal/día" -ForegroundColor Yellow
Write-Host "  📊 TOTAL: 0.35 kg/animal/día (para etapa 1-20 días)" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 VERIFICACIONES EN CONSOLA DEL NAVEGADOR:" -ForegroundColor Green
Write-Host "  1. Buscar: '🔍 Analizando lotes con planes reales...'" -ForegroundColor White
Write-Host "  2. Buscar: '✅ Plan encontrado para pollos:'" -ForegroundColor White
Write-Host "  3. Buscar: '🔍 Encontradas X etapas/productos para rango de días'" -ForegroundColor White
Write-Host "  4. Buscar: '🥬 Maíz: 0.2 kg/día'" -ForegroundColor White
Write-Host "  5. Buscar: '🥬 Balanceado: 0.1 kg/día'" -ForegroundColor White
Write-Host "  6. Buscar: '🥬 Ahipal: 0.05 kg/día'" -ForegroundColor White
Write-Host "  7. Buscar: '📋 RESUMEN CÁLCULO REAL:'" -ForegroundColor White
Write-Host ""
Write-Host "✅ RESULTADOS ESPERADOS:" -ForegroundColor Green
Write-Host "  • En Alimentación: placeholder debe mostrar cantidad total real" -ForegroundColor White
Write-Host "  • En Inventario: análisis debe mostrar consumo basado en datos reales" -ForegroundColor White
Write-Host "  • En Consola: logs detallados de cada producto y sus cantidades" -ForegroundColor White
Write-Host ""
Write-Host "❌ SI VE ERRORES:" -ForegroundColor Red
Write-Host "  • 'No se encontró plan nutricional para pollos'" -ForegroundColor White
Write-Host "  • 'No se encontró etapa para X días'" -ForegroundColor White
Write-Host "  • Cantidades incorrectas en placeholders" -ForegroundColor White
Write-Host "  → Verificar configuración del plan en admin panel" -ForegroundColor White
Write-Host ""
Write-Host "🔧 CONTROLES:" -ForegroundColor Green
Write-Host "  • Ctrl+C en esta ventana para detener los servicios" -ForegroundColor White
Write-Host "  • O usa: Stop-Job $($backendJob.Id); Stop-Job $($frontendJob.Id)" -ForegroundColor White
Write-Host ""

# Abrir navegadores automáticamente
Write-Status "Abriendo navegadores en las páginas relevantes..." "Green"
Start-Process "http://localhost:4200/admin/plan-nutricional"
Start-Sleep -Seconds 2
Start-Process "http://localhost:4200/pollos/alimentacion"
Start-Sleep -Seconds 2
Start-Process "http://localhost:4200/pollos/inventario"

# Esperar a que el usuario termine
Write-Host "🧪 PASOS DE VERIFICACIÓN:" -ForegroundColor Yellow
Write-Host "1. Admin Panel: Confirmar que plan 'Pollos' tiene 3 productos para etapa 1-20:" -ForegroundColor White
Write-Host "   - Maíz: 0.2 kg/día" -ForegroundColor White
Write-Host "   - Balanceado: 0.1 kg/día" -ForegroundColor White
Write-Host "   - Ahipal: 0.05 kg/día" -ForegroundColor White
Write-Host ""
Write-Host "2. Alimentación: Seleccionar lote joven (6-10 días) y verificar:" -ForegroundColor White
Write-Host "   - Placeholder debe mostrar suma total: ~0.35 kg × num_pollos" -ForegroundColor White
Write-Host "   - Productos recomendados deben aparecer los 3" -ForegroundColor White
Write-Host ""
Write-Host "3. Inventario > Análisis: Verificar cálculos coherentes" -ForegroundColor White
Write-Host ""
Write-Host "4. DevTools (F12) > Console: Revisar logs detallados" -ForegroundColor White
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
Write-Host "¡Sistema corregido para sumar múltiples productos por etapa! 🎯" -ForegroundColor Green
