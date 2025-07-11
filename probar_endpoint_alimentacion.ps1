# Script para probar el endpoint de alimentación después de los cambios
# 🧪 PRUEBA DEL ENDPOINT DE ALIMENTACIÓN

Write-Host "🧪 PROBANDO ENDPOINT DE ALIMENTACIÓN..." -ForegroundColor Green
Write-Host ""

# Paso 1: Verificar que el backend esté corriendo
Write-Host "📋 Paso 1: Verificando que el backend esté corriendo..." -ForegroundColor Yellow
try {
    $pingResponse = Invoke-WebRequest -Uri "http://localhost:8088/api/plan-ejecucion/debug/ping" -Method GET -TimeoutSec 10
    if ($pingResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend corriendo correctamente en puerto 8088" -ForegroundColor Green
        Write-Host "   Respuesta: $($pingResponse.Content)" -ForegroundColor Blue
    }
} catch {
    Write-Host "❌ ERROR: El backend no está respondiendo en puerto 8088" -ForegroundColor Red
    Write-Host "   Por favor, asegúrate de que el backend esté corriendo." -ForegroundColor Yellow
    Write-Host "   Puedes usar: .\reiniciar_backend.ps1" -ForegroundColor Cyan
    exit 1
}

# Paso 2: Probar el endpoint de alimentación
Write-Host ""
Write-Host "📋 Paso 2: Probando el endpoint de registro de alimentación..." -ForegroundColor Yellow

# Datos de prueba
$testData = @{
    loteId = "LOTE_PRUEBA_001"
    fecha = "2025-01-10"
    cantidadAplicada = 7.5
    animalesVivos = 150
    animalesMuertos = 3
    observaciones = "Prueba automatizada - Endpoint corregido"
} | ConvertTo-Json

Write-Host "📝 Datos de prueba:" -ForegroundColor Cyan
Write-Host $testData -ForegroundColor White

try {
    Write-Host ""
    Write-Host "🚀 Enviando petición POST..." -ForegroundColor Blue
    
    $response = Invoke-WebRequest -Uri "http://localhost:8088/api/plan-ejecucion/debug/registrar-alimentacion" -Method POST -Body $testData -ContentType "application/json" -TimeoutSec 30
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ ¡ÉXITO! Endpoint funcionando correctamente" -ForegroundColor Green
        Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Blue
        Write-Host "   Respuesta del servidor:" -ForegroundColor Cyan
        Write-Host $response.Content -ForegroundColor White
        
        Write-Host ""
        Write-Host "🎉 ¡PROBLEMA RESUELTO! El sistema de alimentación ya funciona correctamente." -ForegroundColor Green
        Write-Host "   Ahora puedes usar el frontend sin problemas." -ForegroundColor Blue
    } else {
        Write-Host "⚠️  Respuesta inesperada del servidor" -ForegroundColor Yellow
        Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Blue
        Write-Host "   Respuesta: $($response.Content)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ ERROR al probar el endpoint:" -ForegroundColor Red
    Write-Host "   Mensaje: $($_.Exception.Message)" -ForegroundColor Yellow
    
    # Intentar obtener más detalles del error
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 400) {
            Write-Host "   📋 Error 400: Solicitud incorrecta" -ForegroundColor Yellow
            Write-Host "   📝 Revisa los logs del backend para más detalles" -ForegroundColor Cyan
        } elseif ($statusCode -eq 401) {
            Write-Host "   📋 Error 401: Problema de autenticación" -ForegroundColor Yellow
            Write-Host "   📝 Esto indica que el filtro JWT aún está bloqueando el endpoint" -ForegroundColor Cyan
        } elseif ($statusCode -eq 403) {
            Write-Host "   📋 Error 403: Problema de autorización" -ForegroundColor Yellow
            Write-Host "   📝 Revisa la configuración de seguridad" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
Write-Host "📋 Siguiente paso: Si el test falló, revisa los logs del backend:" -ForegroundColor Cyan
Write-Host "   cd backend && Get-Content -Path 'backend.log' -Tail 20" -ForegroundColor White 