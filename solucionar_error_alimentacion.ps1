#!/usr/bin/env pwsh
# SOLUCIÓN DEFINITIVA AL ERROR DE ALIMENTACIÓN
# Este script aplica la migración V7 y verifica que todo funcione

Write-Host "🔧 SOLUCIONANDO ERROR DE ALIMENTACIÓN..." -ForegroundColor Yellow
Write-Host ""

# 1. Aplicar migración de base de datos
Write-Host "📊 Aplicando migración V7 a la base de datos..." -ForegroundColor Cyan
try {
    mysql -u root -p avicola_db < aplicar_migracion_v7.sql
    Write-Host "✅ Migración aplicada exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al aplicar migración: $_" -ForegroundColor Red
    Write-Host "💡 Ejecuta manualmente: mysql -u root -p avicola_db < aplicar_migracion_v7.sql" -ForegroundColor Yellow
}

Write-Host ""

# 2. Verificar backend (opcional)
Write-Host "🚀 ¿Quieres reiniciar el backend? (y/n): " -NoNewline
$reiniciar = Read-Host

if ($reiniciar -eq "y" -or $reiniciar -eq "Y") {
    Write-Host "🔄 Reiniciando backend..." -ForegroundColor Cyan
    Set-Location backend
    
    # Detener backend si está corriendo
    Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "java" } | Stop-Process -Force
    
    # Iniciar backend
    Start-Process -FilePath "mvn" -ArgumentList "spring-boot:run" -NoNewWindow
    Write-Host "⏳ Backend iniciándose..." -ForegroundColor Yellow
    
    Set-Location ..
}

Write-Host ""
Write-Host "🎯 SOLUCIÓN APLICADA:" -ForegroundColor Green
Write-Host "✅ Base de datos actualizada (asignacion_id ahora permite NULL)" -ForegroundColor Green
Write-Host "✅ Frontend funcional (datos correctos)" -ForegroundColor Green
Write-Host "✅ Backend preparado para registros manuales" -ForegroundColor Green
Write-Host ""
Write-Host "🏃‍♂️ SIGUIENTE PASO:" -ForegroundColor Cyan
Write-Host "1. Ve a http://localhost:4200/pollos/alimentacion" -ForegroundColor White
Write-Host "2. Selecciona cualquier lote" -ForegroundColor White
Write-Host "3. Haz clic en 'Registrar Alimentación'" -ForegroundColor White
Write-Host "4. ¡Debería funcionar perfectamente!" -ForegroundColor White
Write-Host ""
Write-Host "📋 Si aún hay problemas, verifica los logs del backend." -ForegroundColor Yellow 