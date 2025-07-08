# Script PowerShell para iniciar el servidor de desarrollo Angular
# Compatible con Windows PowerShell

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "     INICIANDO SERVIDOR ANGULAR          " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host

# Verificar que estamos en el directorio correcto
$currentPath = Get-Location
Write-Host "📁 Directorio actual: $currentPath" -ForegroundColor Blue

# Verificar si existe package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json" -ForegroundColor Red
    Write-Host "Asegúrate de estar en el directorio frontend" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit
}

Write-Host "✅ package.json encontrado" -ForegroundColor Green

# Verificar si node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host
Write-Host "🚀 Iniciando servidor de desarrollo..." -ForegroundColor Green
Write-Host "📱 La aplicación estará disponible en: http://localhost:4200" -ForegroundColor Green
Write-Host "🔄 Se abrirá automáticamente en tu navegador" -ForegroundColor Green
Write-Host
Write-Host "⚡ Para detener el servidor, presiona Ctrl+C" -ForegroundColor Yellow
Write-Host

# Iniciar el servidor
npm start 