#!/bin/bash

# Script para configurar el servidor de producción
# Ejecutar como root en el servidor Ubuntu

echo "🚀 Configurando servidor para pollos-chanchos-Angular..."

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar Git
apt install -y git

# Crear directorio del proyecto
mkdir -p /opt/pollos-chanchos-Angular
cd /opt/pollos-chanchos-Angular

# Clonar repositorio (reemplaza con tu URL de GitHub)
echo "📦 Clona tu repositorio manualmente:"
echo "git clone https://github.com/TU-USUARIO/pollos-chanchos-Angular.git ."

# Configurar permisos
chown -R root:root /opt/pollos-chanchos-Angular

# Habilitar Docker al inicio
systemctl enable docker
systemctl start docker

echo "✅ Servidor configurado correctamente!"
echo "📝 Próximos pasos:"
echo "1. Clonar tu repositorio en /opt/pollos-chanchos-Angular"
echo "2. Configurar los secrets en GitHub (SERVER_HOST, SERVER_USER, SERVER_SSH_KEY)"
echo "3. Hacer push a main para activar el deploy automático"
