# Guía para Configurar SSH de GitHub Actions

## Problema Identificado
GitHub Actions no puede conectarse por SSH al servidor `75.119.128.166:22` con error `dial tcp ***:22: i/o timeout`.

## Pasos para Solucionarlo

### 1. Verificar GitHub Secrets
Ve a tu repositorio en GitHub:
```
https://github.com/AngelJavier060/pollos-chanchos-Angular/settings/secrets/actions
```

Verifica que tengas estos secrets configurados:
- **SERVER_HOST**: `75.119.128.166`
- **SERVER_USER**: `root`  
- **SERVER_SSH_KEY**: Tu clave SSH privada completa
- **SERVER_PORT**: `22` (opcional)

### 2. Obtener la Clave SSH Correcta
Desde tu servidor Ubuntu (donde te conectas exitosamente), ejecuta:

```bash
# Conectarse al servidor
ssh root@75.119.128.166

# Una vez conectado, mostrar la clave privada
cat ~/.ssh/id_rsa
```

### 3. Formato Correcto de la Clave SSH
La clave debe incluir las líneas BEGIN y END:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAlwAAAAdzc2gtcn
... (contenido de la clave) ...
-----END OPENSSH PRIVATE KEY-----
```

### 4. Verificar Conectividad
Ejecuta el workflow de prueba manualmente en GitHub Actions.

## Posibles Causas del Error

1. **Clave SSH incorrecta**: La clave en GitHub Secrets no coincide con la del servidor
2. **Formato incorrecto**: Espacios extra o caracteres faltantes en la clave
3. **Firewall**: GitHub Actions IPs bloqueadas (menos probable ya que funciona manualmente)
4. **Usuario incorrecto**: El usuario root debe tener acceso SSH

## Script de Verificación Rápida
Desde tu máquina local, ejecuta:
```bash
ssh -v root@75.119.128.166 "echo 'Test successful'"
```

Esto mostrará información detallada de la conexión SSH.
