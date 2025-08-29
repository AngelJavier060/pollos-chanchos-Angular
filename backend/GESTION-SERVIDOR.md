# 🚀 Gestión Profesional del Servidor Backend

## Comandos Rápidos

### Usando el Script PowerShell (Recomendado)
```powershell
# Iniciar servidor
.\manage-server.ps1 start

# Detener servidor
.\manage-server.ps1 stop

# Reiniciar servidor
.\manage-server.ps1 restart

# Ver estado del servidor
.\manage-server.ps1 status

# Liberar puerto ocupado
.\manage-server.ps1 kill-port
```

### Comandos Maven Tradicionales
```bash
# Limpiar y ejecutar
mvn clean spring-boot:run

# Ejecutar con perfil de desarrollo (puerto automático)
mvn spring-boot:run -Dspring.profiles.active=dev

# Detener servidor gracefully
curl -X POST http://localhost:8089/actuator/shutdown
```

## Soluciones Implementadas

### ✅ 1. Puerto con Fallback Automático
- Si el puerto 8088 está ocupado, el sistema busca automáticamente el siguiente disponible
- Logs claros indican qué puerto se está usando

### ✅ 2. Shutdown Graceful
- El servidor se cierra ordenadamente, liberando recursos
- Timeout de 30 segundos para completar operaciones pendientes

### ✅ 3. Gestión de Procesos
- Script PowerShell para control completo del servidor
- Detección automática de procesos en puerto
- Eliminación segura de procesos colgados

### ✅ 4. Perfiles de Configuración
- **Producción**: Puerto fijo 8088
- **Desarrollo**: Puerto automático (0 = libre)

### ✅ 5. Monitoreo y Control
- Endpoint de salud: `GET /actuator/health`
- Endpoint de shutdown: `POST /actuator/shutdown`
- Puerto de gestión separado: 8089

## Solución de Problemas

### Puerto Ocupado
```powershell
# Verificar qué proceso usa el puerto
netstat -ano | findstr :8088

# Usar script para liberar automáticamente
.\manage-server.ps1 kill-port

# O reiniciar completamente
.\manage-server.ps1 restart
```

### Proceso Colgado
```powershell
# Ver estado detallado
.\manage-server.ps1 status

# Forzar reinicio
.\manage-server.ps1 restart
```

## URLs del Sistema

- **API Principal**: http://localhost:8088
- **Gestión/Actuator**: http://localhost:8089/actuator
- **Health Check**: http://localhost:8089/actuator/health
- **Frontend**: http://localhost:4200

## Mejores Prácticas

1. **Siempre usar el script** para gestión del servidor
2. **Verificar estado** antes de iniciar: `.\manage-server.ps1 status`
3. **Usar perfil dev** para desarrollo: `-Dspring.profiles.active=dev`
4. **Shutdown graceful** antes de cerrar IDE
5. **Monitorear logs** para detectar problemas temprano
