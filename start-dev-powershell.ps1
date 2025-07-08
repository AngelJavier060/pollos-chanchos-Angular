# Script para iniciar el servidor de desarrollo Angular
# Sin errores de sintaxis de PowerShell

Write-Host "🚀 Iniciando servidor de desarrollo Angular..." -ForegroundColor Green
Write-Host "📂 Directorio actual: $(Get-Location)" -ForegroundColor Cyan

# Verificar si estamos en la carpeta correcta
if (Test-Path "angular.json") {
    Write-Host "✅ Encontrado angular.json - Iniciando servidor..." -ForegroundColor Green
    npm start
} else {
    Write-Host "❌ No se encontró angular.json en el directorio actual" -ForegroundColor Red
    Write-Host "📁 Cambiando a la carpeta frontend..." -ForegroundColor Yellow
    
    if (Test-Path "frontend") {
        Set-Location "frontend"
        Write-Host "✅ Cambiado a la carpeta frontend" -ForegroundColor Green
        npm start
    } else {
        Write-Host "❌ No se encontró la carpeta frontend" -ForegroundColor Red
        Write-Host "📂 Directorio actual: $(Get-Location)" -ForegroundColor Cyan
        Write-Host "📋 Archivos en el directorio:" -ForegroundColor Cyan
        Get-ChildItem | Format-Table Name, Length -AutoSize
    }
} 