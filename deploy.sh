#!/bin/bash
# Script de despliegue para producción

echo "🚀 Desplegando pollos-chanchos-Angular en producción..."

# Detener contenedores previos
echo "🛑 Deteniendo contenedores previos..."
docker compose down --remove-orphans

# Limpiar sistema
echo "🧹 Limpiando sistema..."
docker system prune -f
docker volume prune -f

# Construir imágenes frescas
echo "🔨 Construyendo imágenes para producción..."
docker compose build --no-cache

# Iniciar servicios
echo "▶️ Iniciando servicios..."
docker compose up -d

# Verificar estado
echo "📊 Verificando estado de los servicios..."
sleep 10
docker compose ps

# Verificar logs
echo "📋 Logs de los servicios:"
docker compose logs --tail=20

echo "✅ Despliegue completado!"
echo "🌐 Aplicación disponible en:"
echo "   - Frontend: http://localhost:4200"
echo "   - Backend: http://localhost:8088"
echo "   - MySQL: localhost:3306"
