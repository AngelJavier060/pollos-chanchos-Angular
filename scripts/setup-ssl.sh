#!/bin/bash

# Script para obtener certificados SSL con Let's Encrypt

echo "🔒 Configurando HTTPS para granja.improvement-solution.com"

# Crear directorio para certificados
mkdir -p /opt/pollos-chanchos-Angular/ssl

# Detener nginx temporalmente
docker-compose down frontend

# Instalar certbot si no está instalado
if ! command -v certbot &> /dev/null; then
    echo "📦 Instalando Certbot..."
    apt update
    apt install -y certbot
fi

# Obtener certificado SSL
echo "🎫 Obteniendo certificado SSL..."
certbot certonly --standalone \
    --email admin@improvement-solution.com \
    --agree-tos \
    --no-eff-email \
    -d granja.improvement-solution.com

# Copiar certificados al directorio del proyecto
echo "📋 Copiando certificados..."
cp /etc/letsencrypt/live/granja.improvement-solution.com/fullchain.pem /opt/pollos-chanchos-Angular/ssl/
cp /etc/letsencrypt/live/granja.improvement-solution.com/privkey.pem /opt/pollos-chanchos-Angular/ssl/

# Dar permisos correctos
chmod 644 /opt/pollos-chanchos-Angular/ssl/fullchain.pem
chmod 600 /opt/pollos-chanchos-Angular/ssl/privkey.pem

# Actualizar nginx.conf para usar SSL
cp /opt/pollos-chanchos-Angular/frontend/nginx-ssl.conf /opt/pollos-chanchos-Angular/frontend/nginx.conf

echo "✅ Certificados SSL configurados correctamente"
echo "🚀 Reiniciando contenedores..."

# Reconstruir y reiniciar con SSL
docker-compose up --build -d

echo "🎉 HTTPS configurado! Tu sitio ahora es seguro: https://granja.improvement-solution.com"
