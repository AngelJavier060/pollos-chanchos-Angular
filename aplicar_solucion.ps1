# Script para aplicar la solución del error de alimentación
# 🛠️ SOLUCIÓN: Column 'asignacion_id' cannot be null

Write-Host "🚀 APLICANDO SOLUCIÓN AL SISTEMA DE ALIMENTACIÓN..." -ForegroundColor Green
Write-Host ""

# Paso 1: Verificar si el backend está corriendo
Write-Host "📋 Paso 1: Verificando estado del backend..." -ForegroundColor Yellow
$backendRunning = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*avicola*" }

if ($backendRunning) {
    Write-Host "⚠️  Backend detectado corriendo. Deteniéndolo..." -ForegroundColor Yellow
    # El usuario tendrá que detenerlo manualmente
    Write-Host "   Por favor, detén el backend presionando Ctrl+C en su terminal" -ForegroundColor Red
    Write-Host "   Luego presiona cualquier tecla para continuar..."
    Read-Host
}

# Paso 2: Navegar al directorio backend
Write-Host "📂 Paso 2: Navegando al directorio backend..." -ForegroundColor Yellow
if (Test-Path "backend") {
    Set-Location "backend"
    Write-Host "✅ En directorio backend" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró el directorio backend" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Paso 3: Aplicar migración
Write-Host "🗄️  Paso 3: Aplicando migración V7..." -ForegroundColor Yellow
Write-Host "   La migración se aplicará automáticamente al iniciar el backend..." -ForegroundColor Cyan

# Paso 4: Iniciar backend
Write-Host "🚀 Paso 4: Iniciando backend..." -ForegroundColor Yellow
Write-Host "   Monitoreando logs para confirmar migración..." -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 LOGS DEL BACKEND:" -ForegroundColor Cyan
Write-Host "=================================================================================" -ForegroundColor Gray

try {
    & ./mvnw spring-boot:run
} catch {
    Write-Host "❌ Error al iniciar el backend: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 SOLUCIONES POSIBLES:" -ForegroundColor Yellow
    Write-Host "1. Verificar que MySQL esté corriendo" -ForegroundColor White
    Write-Host "2. Verificar credenciales de base de datos" -ForegroundColor White
    Write-Host "3. Ejecutar manualmente: ./mvnw flyway:repair" -ForegroundColor White
    Write-Host "4. Verificar puerto 8088 disponible" -ForegroundColor White
}

Write-Host ""
Write-Host "=================================================================================" -ForegroundColor Gray
Write-Host "✅ PROCESO COMPLETADO" -ForegroundColor Green
Write-Host ""
Write-Host "📝 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "1. Verificar que el backend esté corriendo sin errores" -ForegroundColor White
Write-Host "2. Abrir http://localhost:4200/pollos/alimentacion" -ForegroundColor White
Write-Host "3. Intentar registrar alimentación para verificar la solución" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Si necesitas ayuda, revisa el archivo 'aplicar_solucion_alimentacion.md'" -ForegroundColor Cyan 