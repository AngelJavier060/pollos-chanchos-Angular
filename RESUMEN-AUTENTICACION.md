# Simplificación del Sistema de Autenticación

## Objetivo
Este proceso tiene como objetivo simplificar la arquitectura de autenticación del sistema, eliminando la redundancia y consolidando todos los mecanismos de autenticación en un único servicio: `AuthDirectService`.

## Problema Resuelto
El sistema tenía múltiples servicios de autenticación que funcionaban en paralelo, causando conflictos:
- `AuthService` (original)
- `EmergencyAuthService` (emergencia)
- `AuthDirectService` (simplificado)

Esta redundancia causaba problemas de sesión, errores 401 recurrentes y complejidad innecesaria.

## Solución Implementada

### 1. Servicio Único de Autenticación
Mantenemos únicamente el servicio `AuthDirectService` que incluye:
- Login normal
- Login de emergencia para admin
- Refresh token
- Verificación de roles
- Manejo de cabeceras de autenticación

### 2. Interceptor Unificado
Se ha creado un nuevo interceptor que:
- Solo depende de `AuthDirectService`
- Maneja la renovación de tokens automáticamente
- Es más tolerante a fallos de conexión
- Gestiona correctamente las rutas públicas

### 3. Scripts de Limpieza y Actualización

#### `limpiar-sistema.bat`
Este script elimina:
- Servicios de autenticación redundantes (`auth.service.ts`, `emergency-auth.service.ts`)
- Interceptor simplificado redundante (`auth.interceptor.simplified.ts`)
- Archivos temporales y de diagnóstico

#### `actualizar-interceptor.bat`
Este script:
- Crea una copia de seguridad del interceptor actual
- Instala el nuevo interceptor unificado

## Cómo Usar

1. Ejecuta primero `limpiar-sistema.bat` para eliminar los archivos redundantes
2. Ejecuta `actualizar-interceptor.bat` para instalar el nuevo interceptor
3. Revisa que no haya errores de compilación relacionados con imports o referencias a los servicios eliminados
4. Si encuentras errores, modifica los archivos para que usen `AuthDirectService` en lugar de los servicios eliminados

## Consideraciones Importantes

- El servicio `AuthDirectService` mantiene compatibilidad con el formato de usuario y token que usaba el sistema anterior
- El login normal y el login de emergencia ahora están en el mismo servicio
- Si surgen problemas con el nuevo interceptor, puedes restaurar el anterior usando la copia de seguridad

## Flujo de Autenticación Recomendado

1. Usuario ingresa credenciales en la pantalla de login
2. `AuthDirectService.login()` verifica las credenciales con el backend
3. Al recibir respuesta positiva, guarda token JWT en localStorage
4. El interceptor incluye automáticamente el token en todas las peticiones
5. Si un token expira, el interceptor intenta renovarlo automáticamente con `refreshToken()`
6. Si la renovación falla, se redirige al usuario a la pantalla de login
