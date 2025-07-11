# Script para reiniciar el backend después de los cambios de configuración
# 🔄 REINICIAR BACKEND PARA APLICAR CAMBIOS

Write-Host "🔄 REINICIANDO BACKEND PARA APLICAR CAMBIOS DE SEGURIDAD..." -ForegroundColor Green
Write-Host ""

# Paso 1: Detener procesos Java existentes
Write-Host "📋 Paso 1: Deteniendo procesos Java existentes..." -ForegroundColor Yellow
$javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue
if ($javaProcesses) {
    Write-Host "⚠️  Encontrados procesos Java corriendo. Deteniéndolos..." -ForegroundColor Yellow
    $javaProcesses | Stop-Process -Force
    Start-Sleep -Seconds 3
    Write-Host "✅ Procesos Java detenidos correctamente." -ForegroundColor Green
} else {
    Write-Host "ℹ️  No se encontraron procesos Java corriendo." -ForegroundColor Blue
}

# Paso 2: Cambiar al directorio del backend
Write-Host "📋 Paso 2: Cambiando al directorio del backend..." -ForegroundColor Yellow
cd backend
Write-Host "✅ Directorio cambiado a: $(Get-Location)" -ForegroundColor Green

# Paso 3: Limpiar y compilar el proyecto
Write-Host "📋 Paso 3: Limpiando y compilando el proyecto..." -ForegroundColor Yellow
if (Test-Path "mvnw.cmd") {
    Write-Host "🔨 Ejecutando limpieza y compilación..." -ForegroundColor Blue
    .\mvnw.cmd clean compile -q
    Write-Host "✅ Proyecto limpiado y compilado correctamente." -ForegroundColor Green
} else {
    Write-Host "⚠️  No se encontró mvnw.cmd. Intentando con mvn..." -ForegroundColor Yellow
    if (Get-Command "mvn" -ErrorAction SilentlyContinue) {
        mvn clean compile -q
        Write-Host "✅ Proyecto limpiado y compilado correctamente." -ForegroundColor Green
    } else {
        Write-Host "❌ No se encontró Maven. Por favor, instala Maven o usa mvnw.cmd." -ForegroundColor Red
        exit 1
    }
}

# Paso 4: Iniciar el backend
Write-Host "📋 Paso 4: Iniciando el backend..." -ForegroundColor Yellow
Write-Host "🚀 Iniciando Spring Boot..." -ForegroundColor Blue
Write-Host "📝 Logs importantes a revisar:" -ForegroundColor Cyan
Write-Host "   - Búsqueda de: 'Configurando seguridad ROBUSTA'" -ForegroundColor Cyan
Write-Host "   - Búsqueda de: 'Successfully applied 1 migration'" -ForegroundColor Cyan
Write-Host "   - Búsqueda de: 'Started AvicolaBackendApplication'" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "mvnw.cmd") {
    Write-Host "🔄 Ejecutando: .\mvnw.cmd spring-boot:run" -ForegroundColor Blue
    .\mvnw.cmd spring-boot:run
} else {
    Write-Host "🔄 Ejecutando: mvn spring-boot:run" -ForegroundColor Blue
    mvn spring-boot:run
} 