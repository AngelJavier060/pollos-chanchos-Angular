# Script para iniciar la aplicación con Docker
Write-Host "🐳 Iniciando aplicación pollos-chanchos con Docker..."

# Verificar si Docker está corriendo
try {
    docker ps | Out-Null
    Write-Host "✅ Docker está ejecutándose"
} catch {
    Write-Host "❌ Docker Desktop no está ejecutándose"
    Write-Host "⏳ Iniciando Docker Desktop..."
    Start-Process "Docker Desktop" -Wait
    Start-Sleep -Seconds 10
}

# Detener contenedores previos
Write-Host "🛑 Deteniendo contenedores previos..."
docker compose down --remove-orphans 2>$null

# Limpiar imágenes si es necesario
Write-Host "🧹 Limpiando imágenes obsoletas..."
docker system prune -f

# Construir y ejecutar
Write-Host "🔨 Construyendo y ejecutando contenedores..."
docker compose up --build -d

# Mostrar estado
Write-Host "📊 Estado de los contenedores:"
docker compose ps

Write-Host "🎉 Aplicación iniciada correctamente!"
Write-Host "🌐 Frontend: http://localhost:4200"
Write-Host "🔧 Backend: http://localhost:8088"
Write-Host "🗄️ Base de datos: localhost:3306"
