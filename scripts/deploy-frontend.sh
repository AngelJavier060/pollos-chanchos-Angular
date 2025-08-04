#!/bin/bash

# Script para desplegar solo el frontend a producción
# Mantiene el backend funcionando y solo actualiza los archivos del frontend

echo "🚀 Iniciando despliegue del frontend actualizado..."

# Configuración del servidor
SERVER_HOST="174.138.52.182"
SERVER_USER="root"
SERVER_PATH="/opt/pollos-chanchos-Angular"

echo "📦 Comprimiendo archivos del frontend..."
cd frontend/dist
tar -czf frontend-update.tar.gz avicola-frontend/

echo "📤 Subiendo archivos al servidor..."
scp frontend-update.tar.gz ${SERVER_USER}@${SERVER_HOST}:/tmp/

echo "🔄 Actualizando frontend en el servidor..."
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
    cd /opt/pollos-chanchos-Angular
    
    # Parar solo el container del frontend
    docker-compose stop frontend
    
    # Hacer backup del frontend anterior
    if [ -d "frontend/dist/avicola-frontend" ]; then
        mv frontend/dist/avicola-frontend frontend/dist/avicola-frontend-backup-$(date +%Y%m%d-%H%M%S)
    fi
    
    # Extraer nuevos archivos
    cd frontend/dist
    tar -xzf /tmp/frontend-update.tar.gz
    cd ../..
    
    # Reconstruir y reiniciar solo el frontend
    docker-compose build frontend
    docker-compose up -d frontend
    
    # Limpiar archivos temporales
    rm /tmp/frontend-update.tar.gz
    
    echo "✅ Frontend actualizado correctamente"
EOF

echo "🎉 Despliegue completado!"
echo "🌐 Puedes verificar en: http://${SERVER_HOST}"

# Limpiar archivos locales
rm frontend-update.tar.gz

cd ../..
