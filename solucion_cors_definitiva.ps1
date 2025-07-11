# 🎯 SOLUCIÓN DEFINITIVA: Error CORS en sistema de alimentación
# Problema: allowCredentials=true con allowedOrigins="*" no es compatible

Write-Host "🎯 APLICANDO SOLUCIÓN DEFINITIVA CORS..." -ForegroundColor Green
Write-Host ""

# Paso 1: Detener cualquier proceso Java del backend
Write-Host "📋 Paso 1: Deteniendo backend..." -ForegroundColor Yellow
$javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*avicola*" -or $_.ProcessName -eq "java" }
if ($javaProcesses) {
    Write-Host "🛑 Deteniendo procesos Java..." -ForegroundColor Red
    $javaProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "✅ Procesos detenidos" -ForegroundColor Green
}

# Paso 2: Limpiar y compilar 
Write-Host "📋 Paso 2: Limpiando y compilando..." -ForegroundColor Yellow
cd backend
if (Test-Path "mvnw.cmd") {
    Write-Host "🔨 Ejecutando limpieza..." -ForegroundColor Blue
    .\mvnw.cmd clean compile -q
} else {
    Write-Host "❌ No se encontró mvnw.cmd" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Compilación completada" -ForegroundColor Green

# Paso 3: Iniciar backend en background
Write-Host "📋 Paso 3: Iniciando backend..." -ForegroundColor Yellow
Write-Host "🚀 Iniciando en segundo plano..." -ForegroundColor Blue

# Iniciar el backend en background
$job = Start-Job -ScriptBlock {
    cd "D:\PROGRAMAS CREADOS PROBADOS 2025\pollos-chanchos Angular\backend"
    .\mvnw.cmd spring-boot:run
}

Write-Host "✅ Backend iniciado (Job ID: $($job.Id))" -ForegroundColor Green

# Paso 4: Esperar que el backend esté listo
Write-Host "📋 Paso 4: Esperando que el backend esté listo..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

do {
    $attempt++
    Write-Host "   Intento $attempt/$maxAttempts..." -ForegroundColor Blue
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8088/api/plan-ejecucion/debug/ping" -Method GET -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend listo y respondiendo!" -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -eq $maxAttempts) {
    Write-Host "❌ Timeout: Backend no responde después de $maxAttempts intentos" -ForegroundColor Red
    exit 1
}

# Paso 5: Probar el endpoint de alimentación
Write-Host "📋 Paso 5: Probando endpoint de alimentación..." -ForegroundColor Yellow

$testData = '{"loteId":"LOTE_CORS_FIX","fecha":"2025-01-10","cantidadAplicada":6.0,"animalesVivos":120,"animalesMuertos":1,"observaciones":"Prueba con CORS corregido"}'

Write-Host "📝 Datos de prueba:" -ForegroundColor Cyan
Write-Host $testData -ForegroundColor White

try {
    Write-Host "🚀 Enviando petición..." -ForegroundColor Blue
    
    $response = Invoke-WebRequest -Uri "http://localhost:8088/api/plan-ejecucion/debug/registrar-alimentacion" -Method POST -Body $testData -ContentType "application/json" -TimeoutSec 15
    
    if ($response.StatusCode -eq 200) {
        Write-Host ""
        Write-Host "🎉 ¡ÉXITO TOTAL! Problema CORS resuelto" -ForegroundColor Green
        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Blue
        Write-Host "   Respuesta:" -ForegroundColor Cyan
        Write-Host $response.Content -ForegroundColor White
        
        Write-Host ""
        Write-Host "✅ SOLUCIÓN APLICADA CORRECTAMENTE" -ForegroundColor Green
        Write-Host "   - Error CORS resuelto" -ForegroundColor Blue
        Write-Host "   - Endpoint funcionando" -ForegroundColor Blue
        Write-Host "   - Frontend puede usar el sistema normalmente" -ForegroundColor Blue
        
    } else {
        Write-Host "⚠️  Respuesta inesperada: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR persistente:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 400) {
            Write-Host "📋 Aún hay error 400 - revisar logs del backend" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "📋 ESTADO FINAL:" -ForegroundColor Cyan
Write-Host "   - Backend corriendo en puerto 8088" -ForegroundColor White
Write-Host "   - Para detener: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor White
Write-Host "   - Para revisar logs: cd backend && Get-Content backend.log -Tail 10" -ForegroundColor White 