# 🚀 CÓMO EJECUTAR LA APP FLUTTER - GRANJA EL VITA

**Fecha**: 16 de noviembre de 2025, 2:45 PM  
**Estado**: ✅ **LISTO PARA EJECUTAR**

---

## ✅ DEPENDENCIAS INSTALADAS

Las siguientes dependencias ya fueron instaladas correctamente:

```
✓ http: ^1.6.0          - Para llamadas HTTP al backend
✓ intl: ^0.18.1         - Para formateo de fechas
✓ cupertino_icons: ^1.0.8
✓ carousel_slider: ^5.1.1
```

---

## 🎯 BACKEND CONFIGURADO

**URL de Producción**: `https://granja.improvement-solution.com`

El servicio de productos está configurado para conectarse a:
```
https://granja.improvement-solution.com/api/inventario/productos
```

---

## 🚀 EJECUTAR LA APLICACIÓN

### **Opción 1: Desde la Terminal**

Abre una terminal en la carpeta `app_granjaelvita` y ejecuta:

```bash
flutter run
```

### **Opción 2: Desde VS Code**

1. Abre el proyecto en VS Code
2. Presiona `F5` o ve a **Run → Start Debugging**
3. Selecciona el dispositivo (emulador o físico)

### **Opción 3: Desde Android Studio**

1. Abre el proyecto en Android Studio
2. Selecciona el dispositivo en la barra superior
3. Haz clic en el botón **Run** (▶️)

---

## 📱 FLUJO DE NAVEGACIÓN

### **1. Iniciar Sesión**
- Usuario: `Javier`
- Contraseña: `Alexandra1`

### **2. Navegar a Inventario**
- Desde el menú principal, selecciona **"Inventario"**

### **3. Abrir Productos**
- En la pantalla de Inventario, haz clic en el ícono **"Producto"** (primer ícono, azul)

### **4. Ver Lista de Productos**
- Verás la pantalla principal con:
  - **Estadísticas** en la parte superior (Total, Pollos, Chanchos, Bajo Stock)
  - **Lista de productos** con tarjetas visuales
  - **Botón flotante** "Nuevo Producto" en la esquina inferior derecha

### **5. Crear Nuevo Producto**
- Haz clic en el botón flotante **"Nuevo Producto"**
- Completa el formulario con las 5 secciones:
  1. **Información Básica**: Nombre, Animal, Descripción
  2. **Clasificación**: Categoría, Subcategoría, Etapa
  3. **Control de Inventario**: Unidad, Cantidad, Niveles
  4. **Información de Uso**: Uso, Dosis, Vía de Aplicación
  5. **Información de Compra**: Precio, Proveedor, Fechas
- Haz clic en **"Guardar Producto"**

### **6. Editar Producto**
- Haz clic en cualquier tarjeta de producto
- Modifica los campos necesarios
- Haz clic en **"Guardar Producto"**

### **7. Ver Alertas de Stock**
- Los productos con stock bajo mostrarán una alerta naranja
- Los productos agotados mostrarán una alerta roja

---

## 🔍 VERIFICAR CONEXIÓN CON BACKEND

### **Logs en la Consola**

Al abrir la pantalla de productos, deberías ver en la consola:

```
[ProductoService] GET https://granja.improvement-solution.com/api/inventario/productos
[ProductoService] Response: 200 OK
[ProductoService] Productos cargados: X
```

### **Si hay Error de Conexión**

Si ves un error como:
```
Error de conexión: Failed to connect to granja.improvement-solution.com
```

**Posibles causas**:
1. El backend no está corriendo
2. La URL es incorrecta
3. Problemas de red/firewall

**Solución**:
1. Verifica que el backend esté activo
2. Prueba la URL en el navegador: `https://granja.improvement-solution.com/api/inventario/productos`
3. Si estás en desarrollo local, cambia la URL en `lib/config.dart`:
   ```dart
   const String apiBaseUrl = 'http://localhost:8080';
   ```

---

## 📊 DATOS DE PRUEBA

### **Producto de Ejemplo**

Puedes crear un producto de prueba con estos datos:

```
INFORMACIÓN BÁSICA:
- Nombre: Newcastle Cepa La Sota
- Animal: Pollos
- Descripción: Vacuna para prevención de la Enfermedad de Newcastle en aves

CLASIFICACIÓN:
- Categoría Principal: Vacunas
- Subcategoría: Vacunas Virales
- Etapa de Aplicación: Día 1

CONTROL DE INVENTARIO:
- Unidad de Medida: Frascos
- Cantidad Actual: 5
- Nivel Mínimo: 2
- Nivel Máximo: 20

INFORMACIÓN DE USO:
- Uso Principal: Prevención de la Enfermedad de Newcastle en aves
- Dosis Recomendada: 0.03-0.05 ml por ave
- Vía de Aplicación: Inyectable

INFORMACIÓN DE COMPRA:
- Precio Unitario: 15.50
- Fecha de Compra: 2025-11-16
- Proveedor: Distribuidora Veterinaria S.A.
- Número de Factura: FAC-00145
- Fecha de Vencimiento: 2026-11-16
- Lote del Fabricante: LOT-2025-A456
```

---

## 🎨 CAPTURAS ESPERADAS

### **Pantalla Principal de Productos**
- Header morado con gradiente
- 4 tarjetas de estadísticas (Total, Pollos, Chanchos, Bajo Stock)
- Lista de productos con tarjetas blancas
- Cada tarjeta muestra:
  - Ícono de categoría
  - Nombre del producto
  - Categoría
  - Badge de animal (Pollos/Chanchos/Ambos)
  - Stock actual
  - Precio
  - Alerta de stock bajo (si aplica)

### **Formulario de Producto**
- Header morado con título "Nuevo Producto" o "Editar Producto"
- 5 secciones colapsables con íconos:
  - 📋 Información Básica
  - 🏷️ Clasificación
  - 📦 Control de Inventario
  - 💊 Información de Uso
  - 💰 Información de Compra
- Botones en la parte inferior:
  - "Cancelar" (gris)
  - "Guardar Producto" (morado con gradiente)

---

## 🐛 TROUBLESHOOTING COMÚN

### **Error: "No se pudo conectar al servidor"**
```
Solución:
1. Verifica que el backend esté corriendo
2. Verifica la URL en lib/config.dart
3. Verifica tu conexión a internet
```

### **Error: "Error al cargar productos: 404"**
```
Solución:
1. Verifica que el endpoint /api/inventario/productos exista en el backend
2. Prueba el endpoint con Postman o curl
```

### **Error: "Error al crear producto: 400"**
```
Solución:
1. Verifica que todos los campos requeridos estén completos
2. Verifica que el JSON enviado coincida con lo que espera el backend
3. Revisa los logs del backend para ver el error exacto
```

### **La app no compila**
```
Solución:
1. Ejecuta: flutter clean
2. Ejecuta: flutter pub get
3. Ejecuta: flutter run
```

### **Error de dependencias**
```
Solución:
1. Verifica que pubspec.yaml tenga http e intl
2. Ejecuta: flutter pub get
3. Si persiste: flutter pub upgrade
```

---

## 📱 DISPOSITIVOS SOPORTADOS

La app funciona en:
- ✅ **Android** (API 21+)
- ✅ **iOS** (iOS 12+)
- ✅ **Web** (Chrome, Firefox, Safari)
- ✅ **Windows** (Windows 10+)
- ✅ **macOS** (macOS 10.14+)
- ✅ **Linux** (Ubuntu 18.04+)

---

## 🔄 ACTUALIZAR DEPENDENCIAS

Si necesitas actualizar las dependencias:

```bash
flutter pub upgrade
```

---

## 📞 SOPORTE

Si encuentras problemas:

1. **Revisa los logs**: `flutter logs`
2. **Revisa la consola del backend**
3. **Verifica la conectividad de red**
4. **Prueba los endpoints con Postman**

---

## 📋 CHECKLIST ANTES DE EJECUTAR

- [ ] Flutter instalado y configurado
- [ ] Dispositivo/emulador conectado
- [ ] Backend corriendo en producción
- [ ] Dependencias instaladas (`flutter pub get`)
- [ ] Credenciales de login disponibles

---

## 🎉 ¡LISTO!

La aplicación está completamente configurada y lista para ejecutarse.

**Comando rápido**:
```bash
cd app_granjaelvita
flutter run
```

**¡Disfruta de tu app móvil de Granja El Vita!** 🐔🐷
