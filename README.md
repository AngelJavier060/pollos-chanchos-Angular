# Sistema Avícola - Pollos y Chanchos Angular

Sistema de gestión avícola desarrollado con Angular (frontend) y Spring Boot (backend).

## 🚀 Despliegue Automático

### Requisitos del Servidor
- Ubuntu 24.04 LTS
- Docker y Docker Compose
- Git
- Acceso SSH

### Configuración Inicial del Servidor

1. **Ejecutar script de configuración:**
```bash
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

2. **Clonar repositorio en el servidor:**
```bash
cd /opt/pollos-chanchos-Angular
git clone https://github.com/TU-USUARIO/pollos-chanchos-Angular.git .
```

### Configuración de GitHub Actions

1. **Configurar secrets en GitHub:**
   - `SERVER_HOST`: 75.119.128.166
   - `SERVER_USER`: root
   - `SERVER_SSH_KEY`: Tu clave SSH privada

2. **El deploy automático se activa con:**
   - Push a la rama `main`
   - Pull request a `main`

## 🔧 Desarrollo Local

### Prerrequisitos
- Node.js 18+
- Maven 3.9+
- Java 21
- Angular CLI

### Backend (Spring Boot)
```bash
cd backend
mvn spring-boot:run
```

### Frontend (Angular)
```bash
cd frontend
npm install
npm start
```

## 🐳 Docker

### Desarrollo con Docker
```bash
docker-compose up --build
```

### Producción
- **Frontend:** Puerto 80
- **Backend:** Puerto 8088
- **URL:** http://75.119.128.166

## 📁 Estructura del Proyecto

```
pollos-chanchos-Angular/
├── backend/                 # Spring Boot API
├── frontend/               # Angular App
├── scripts/               # Scripts de configuración
├── .github/workflows/     # GitHub Actions
├── docker-compose.yml     # Configuración Docker
└── README.md             # Este archivo
```

## 🌐 URLs

- **Desarrollo Frontend:** http://localhost:4200
- **Desarrollo Backend:** http://localhost:8088
- **Producción:** http://75.119.128.166

## 🔐 Autenticación

El sistema incluye:
- Login con JWT
- Roles de usuario
- Guards de autenticación
- Interceptors HTTP

## 📊 Features

- Gestión de usuarios
- Dashboard administrativo
- Módulo de alimentación
- Sistema de roles
- Carga de archivos
- Reportes
