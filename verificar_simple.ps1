Write-Host "VERIFICACION FINAL - DATOS REALES MULTIPLES PRODUCTOS" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan

Write-Host "Verificando correcciones aplicadas..." -ForegroundColor Yellow

$frontendPath = "d:\PROGRAMAS CREADOS PROBADOS 2025\pollos-chanchos Angular\frontend"
$archivoAnalisis = "$frontendPath\src\app\shared\services\analisis-inventario.service.ts"

if (Test-Path $archivoAnalisis) {
    $contenido = Get-Content $archivoAnalisis -Raw
    
    if ($contenido -match "etapasCorrespondientes = planPollo\.detalles\.filter") {
        Write-Host "✅ Metodo filter para multiples etapas" -ForegroundColor Green
    } else {
        Write-Host "❌ FALTA: Metodo filter" -ForegroundColor Red
    }
    
    if ($contenido -match "etapasCorrespondientes\.forEach") {
        Write-Host "✅ ForEach para sumar productos" -ForegroundColor Green
    } else {
        Write-Host "❌ FALTA: ForEach" -ForegroundColor Red
    }
    
    if ($contenido -match "cantidadTotalDiariaKg \+=") {
        Write-Host "✅ Suma acumulativa de cantidades" -ForegroundColor Green
    } else {
        Write-Host "❌ FALTA: Suma acumulativa" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Archivo no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Iniciando servicios..." -ForegroundColor Cyan

# Backend
Set-Location "d:\PROGRAMAS CREADOS PROBADOS 2025\pollos-chanchos Angular\backend"
Write-Host "Compilando backend..." -ForegroundColor Yellow
& .\mvnw.cmd clean compile -q

Write-Host "Iniciando backend..." -ForegroundColor Yellow
Start-Process -FilePath ".\mvnw.cmd" -ArgumentList "spring-boot:run" -WindowStyle Hidden

# Esperar backend
Write-Host "Esperando backend..." -ForegroundColor Yellow
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend listo en puerto 8080" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
}
Write-Host ""

# Frontend
Set-Location "d:\PROGRAMAS CREADOS PROBADOS 2025\pollos-chanchos Angular\frontend"
Write-Host "Iniciando frontend..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Hidden

# Esperar frontend
Write-Host "Esperando frontend..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4200" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend listo en puerto 4200" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "CORRECCION APLICADA: MULTIPLES PRODUCTOS POR ETAPA" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "CAMBIOS IMPLEMENTADOS:" -ForegroundColor Yellow
Write-Host "- Metodo filter() para obtener TODAS las etapas del rango de dias" -ForegroundColor White
Write-Host "- forEach() para sumar cada producto individualmente" -ForegroundColor White
Write-Host "- Suma acumulativa: cantidadTotalDiariaKg += etapa.cantidad" -ForegroundColor White
Write-Host "- Logging detallado para debugging" -ForegroundColor White
Write-Host ""
Write-Host "DATOS ESPERADOS (Plan Pollos, etapa 1-20 dias):" -ForegroundColor Green
Write-Host "- Maiz: 0.2 kg/animal/dia" -ForegroundColor Yellow
Write-Host "- Balanceado: 0.1 kg/animal/dia" -ForegroundColor Yellow
Write-Host "- Ahipal: 0.05 kg/animal/dia" -ForegroundColor Yellow
Write-Host "- TOTAL SUMA: 0.35 kg/animal/dia" -ForegroundColor Green
Write-Host ""
Write-Host "ENLACES DE VERIFICACION:" -ForegroundColor Cyan
Write-Host "- Admin Panel: http://localhost:4200/admin/plan-nutricional" -ForegroundColor White
Write-Host "- Alimentacion: http://localhost:4200/pollos/alimentacion" -ForegroundColor White
Write-Host "- Inventario: http://localhost:4200/pollos/inventario" -ForegroundColor White
Write-Host ""

# Abrir navegadores
Write-Host "Abriendo paginas de verificacion..." -ForegroundColor Green
Start-Process "http://localhost:4200/admin/plan-nutricional"
Start-Sleep -Seconds 2
Start-Process "http://localhost:4200/pollos/alimentacion"
Start-Sleep -Seconds 2
Start-Process "http://localhost:4200/pollos/inventario"

Write-Host ""
Write-Host "COMO VERIFICAR LOS DATOS REALES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. EN ADMIN PANEL:" -ForegroundColor Green
Write-Host "   - Ir a Plan Nutricional" -ForegroundColor White
Write-Host "   - Buscar plan para 'Pollos'" -ForegroundColor White
Write-Host "   - Verificar etapa 1-20 dias tiene 3 productos" -ForegroundColor White
Write-Host ""
Write-Host "2. EN MODULO ALIMENTACION:" -ForegroundColor Green
Write-Host "   - Seleccionar un lote joven (6-10 dias de edad)" -ForegroundColor White
Write-Host "   - El placeholder debe mostrar: cantidad_total = 0.35 x num_pollos" -ForegroundColor White
Write-Host "   - Ejemplo: 100 pollos = 35 kg/dia sugeridos" -ForegroundColor White
Write-Host ""
Write-Host "3. EN CONSOLA DEL NAVEGADOR (F12):" -ForegroundColor Green
Write-Host "   Buscar estos logs:" -ForegroundColor White
Write-Host "   - 'Analizando lotes con planes reales...'" -ForegroundColor White
Write-Host "   - 'Plan encontrado para pollos:'" -ForegroundColor White
Write-Host "   - 'Encontradas X etapas para dias 6-10'" -ForegroundColor White
Write-Host "   - 'Maiz: 0.2 kg/dia'" -ForegroundColor White
Write-Host "   - 'Balanceado: 0.1 kg/dia'" -ForegroundColor White
Write-Host "   - 'Ahipal: 0.05 kg/dia'" -ForegroundColor White
Write-Host ""
Write-Host "PASOS DE VERIFICACION:" -ForegroundColor Yellow
Write-Host "1. Admin Panel: Confirmar plan 'Pollos' configurado correctamente" -ForegroundColor White
Write-Host "2. Alimentacion: Verificar placeholder suma los 3 productos" -ForegroundColor White
Write-Host "3. Inventario: Verificar analisis usa datos reales" -ForegroundColor White
Write-Host "4. Console (F12): Revisar logs de calculo detallados" -ForegroundColor White
Write-Host ""
Write-Host "Si ve los datos correctos (Maiz 0.2 + Balanceado 0.1 + Ahipal 0.05)," -ForegroundColor Green
Write-Host "la correccion esta funcionando perfectamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona CTRL+C cuando hayas terminado de verificar..." -ForegroundColor Yellow

Read-Host "Presiona ENTER cuando hayas terminado la verificacion"

Write-Host ""
Write-Host "Sistema actualizado para manejar multiples productos correctamente!" -ForegroundColor Green
