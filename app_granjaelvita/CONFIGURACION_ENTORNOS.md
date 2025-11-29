# Configuración de Entornos: Local vs Producción

Este documento explica cómo cambiar la configuración de la aplicación Flutter entre el entorno local (desarrollo) y producción.

## 📍 Ubicación del Archivo de Configuración

El archivo principal de configuración es:
```
lib/config.dart
```

## 🔧 Configuración para Desarrollo Local

### Para Emulador Android

Edita `lib/config.dart`:

```dart
const String apiBaseUrl = 'http://10.0.2.2:8088';
const String authLoginPath = '/api/auth/login';
```

**Nota:** `10.0.2.2` es la IP especial que el emulador Android usa para acceder al `localhost` de tu PC.

### Para Flutter Web (Chrome)

Edita `lib/config.dart`:

```dart
const String apiBaseUrl = 'http://localhost:8088';
const String authLoginPath = '/api/auth/login';
```

### Requisitos para Local

1. **Backend corriendo en puerto 8088:**
   ```bash
   cd backend
   .\mvnw spring-boot:run
   ```

2. **Base de datos local configurada** en `backend/src/main/resources/application-local.properties`

## 🚀 Configuración para Producción

Edita `lib/config.dart`:

```dart
const String apiBaseUrl = 'https://granja.improvement-solution.com';
const String authLoginPath = '/api/auth/login';
```

### Pasos para Desplegar a Producción

1. **Cambiar la URL en config.dart** (como se muestra arriba)

2. **Limpiar y reconstruir la aplicación:**
   ```bash
   flutter clean
   flutter pub get
   flutter build apk --release  # Para Android
   # o
   flutter build ios --release  # Para iOS
   ```

3. **Verificar que el backend de producción esté activo:**
   - URL: `https://granja.improvement-solution.com`
   - Debe tener el endpoint `/api/inventario/productos` disponible
   - Debe aceptar autenticación JWT

## ✅ Checklist de Verificación

### Antes de Probar en Local

- [ ] Backend local corriendo en puerto 8088
- [ ] Base de datos local configurada y accesible
- [ ] `apiBaseUrl` configurado según el dispositivo (emulador o web)
- [ ] Ejecutar `flutter clean && flutter pub get`

### Antes de Pasar a Producción

- [ ] Cambiar `apiBaseUrl` a la URL de producción
- [ ] Verificar que el backend de producción esté activo
- [ ] Probar login con credenciales de producción
- [ ] Verificar que todos los endpoints funcionen
- [ ] Construir versión release (`flutter build apk --release`)
- [ ] Probar la APK/IPA antes de distribuir

## 🔍 Solución de Problemas

### Error 404 en Productos

**Causa:** El backend no tiene el controlador `InventarioProductosMobileController`.

**Solución:**
1. Verificar que el archivo existe: `backend/src/main/java/com/wil/avicola_backend/controller/InventarioProductosMobileController.java`
2. Reiniciar el backend
3. Verificar en navegador: `http://localhost:8088/api/inventario/productos` (debe dar 401, no 404)

### Error de Conexión en Emulador

**Causa:** Usar `localhost` en lugar de `10.0.2.2`.

**Solución:** Cambiar `apiBaseUrl` a `http://10.0.2.2:8088` en `lib/config.dart`

### Error de Autenticación

**Causa:** Token JWT inválido o expirado.

**Solución:**
1. Cerrar sesión en la app
2. Volver a iniciar sesión
3. Verificar credenciales (Local: Javier/Alexandra1)

## 📊 Nueva Funcionalidad: Dashboard de Productos

Al entrar a **Admin → Inventario → Productos**, ahora verás:

1. **Dashboard inicial** con:
   - KPIs (Total productos, Agotados, Valor total)
   - Gráfico de barras de stock
   - Gráfico circular de distribución por animal
   - Alertas de productos con stock bajo

2. **Botón "Ver Lista de Productos"** para acceder a la lista completa

3. **Botón de dashboard** (icono de gráficas) en el AppBar para volver a ver las estadísticas

4. **Botón "Nuevo Producto"** siempre visible para agregar productos

## 🎨 Características del Dashboard

- **Diseño profesional** con gradientes y sombras
- **Gráficas interactivas** usando fl_chart
- **Datos en tiempo real** basados en los productos del backend
- **Responsive** se adapta a diferentes tamaños de pantalla
- **Alertas visuales** para productos con stock bajo o agotados

## 📝 Notas Importantes

1. **No mezclar entornos:** Nunca uses datos de prueba local en producción
2. **Credenciales diferentes:** Local y producción deben tener usuarios distintos
3. **Backup antes de producción:** Siempre respalda la base de datos antes de cambios importantes
4. **Versionado:** Incrementa la versión en `pubspec.yaml` antes de cada release
5. **Testing:** Prueba exhaustivamente en local antes de pasar a producción

## 🔄 Flujo de Trabajo Recomendado

```
1. Desarrollo Local
   ↓
2. Pruebas en Local (con datos de prueba)
   ↓
3. Cambiar a URL de producción
   ↓
4. Build release
   ↓
5. Pruebas en staging/pre-producción
   ↓
6. Despliegue a producción
   ↓
7. Monitoreo post-despliegue
```

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del backend
2. Verifica la consola de Flutter
3. Confirma que la URL y puerto son correctos
4. Asegúrate de que el backend esté corriendo
