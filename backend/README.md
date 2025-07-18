# Backend del Sistema Avícola

Este proyecto corresponde al backend de la aplicación de gestión avícola, desarrollado con Spring Boot.

## Estructura del Modelo de Datos

### Entidades Principales

- **Usuario**: Entidad principal para la gestión de usuarios del sistema.
  - Tabla en la base de datos: `usuarios` 
  - Paquete: `com.wil.avicola_backend.model.Usuario`
  - Repositorio: `UsuarioRepository`

> **IMPORTANTE**: Este sistema utiliza exclusivamente la entidad `Usuario` y la tabla `usuarios` para la gestión de usuarios.
> La aplicación NO utiliza ninguna otra entidad alternativa para gestionar usuarios.

### Controladores de Usuarios y Autenticación

- **UserController**: Gestiona los endpoints `/api/users/*` para operaciones CRUD de usuarios.
- **AuthController**: Gestiona la autenticación y sesiones en `/api/auth/*`.

Todos estos controladores trabajan con la entidad `Usuario` y la tabla `usuarios`.

## Seguridad

La seguridad está implementada mediante Spring Security y JSON Web Tokens (JWT).

- Los tokens JWT tienen una validez de 7 días.
- El sistema mantiene un control de sesiones activas mediante la tabla `user_sessions`.

## Configuración del Sistema

La configuración principal se encuentra en `application.properties`, donde se definen:

- Puerto de la aplicación: 8088
- Configuración de CORS
- Configuración de base de datos
- Secretos y tiempos de expiración de JWT
