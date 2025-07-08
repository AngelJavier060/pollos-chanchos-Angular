#!/usr/bin/env pwsh

# Script para ejecutar servidor de desarrollo Angular en PowerShell
# Uso: ./start-dev-powershell.ps1

Write-Host "🚀 Iniciando servidor de desarrollo Angular..." -ForegroundColor Green
Write-Host "📁 Directorio actual: $(Get-Location)" -ForegroundColor Yellow

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json no encontrado" -ForegroundColor Red
    Write-Host "💡 Ejecutar desde el directorio frontend/" -ForegroundColor Yellow
    exit 1
}

# Verificar que node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 node_modules no encontrado, ejecutando npm install..." -ForegroundColor Yellow
    npm install
}

# Ejecutar servidor de desarrollo
Write-Host "🔧 Ejecutando: npm start" -ForegroundColor Cyan
npm start 