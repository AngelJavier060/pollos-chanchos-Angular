# 🎯 GUÍA COMPLETA: MIGRACIÓN A FEFO ESTRICTO

## 📋 RESUMEN EJECUTIVO

Esta migración soluciona **definitivamente** el problema de discrepancias de inventario implementando un sistema FEFO (First Expired, First Out) estricto donde:

- ✅ **Una sola fuente de verdad**: `inventario_entrada_producto`
- ✅ **Trazabilidad completa**: Lote, vencimiento, proveedor
- ✅ **FEFO automático**: Consume primero lo que vence primero
- ✅ **Sin fallbacks confusos**: No hay dobles sistemas

---

## 🚀 PASOS DE IMPLEMENTACIÓN

### **PASO 1: RESPALDO DE BASE DE DATOS** ⚠️ CRÍTICO

Antes de hacer CUALQUIER cosa, crea un respaldo:

```sql
-- En MySQL Workbench, ejecuta:
CREATE DATABASE avicola_backup_fefo;

-- Exporta las tablas críticas:
CREATE TABLE avicola_backup_fefo.inventario_producto AS 
SELECT * FROM avicola.inventario_producto;

CREATE TABLE avicola_backup_fefo.inventario_entrada_producto AS 
SELECT * FROM avicola.inventario_entrada_producto;

CREATE TABLE avicola_backup_fefo.movimiento_inventario_producto AS 
SELECT * FROM avicola.movimiento_inventario_producto;
```

**Alternativa más rápida**: Haz un dump completo de la BD:
```bash
mysqldump -u root -p avicola > avicola_backup_antes_fefo.sql
```

---

### **PASO 2: EJECUTAR MIGRACIÓN SQL**

1. **Abre MySQL Workbench**
2. **Conecta a tu BD `avicola`**
3. **Abre el archivo**: `MIGRACION_FEFO_ESTRICTO.sql`
4. **Ejecuta TODO el script** (Ctrl+Shift+Enter o botón ⚡)
5. **Revisa los resultados** en las pestañas de salida

#### **Qué hace este script:**

- ✅ Diagnostica el estado actual
- ✅ Crea entradas FEFO para productos con stock consolidado pero sin entradas
- ✅ Ajusta discrepancias entre consolidado y entradas
- ✅ Limpia datos inconsistentes (stock negativo)
- ✅ Genera reportes de verificación

#### **Tiempo estimado:** 30 segundos - 2 minutos (depende del tamaño de tu BD)

---

### **PASO 3: VERIFICAR MIGRACIÓN**

1. **Abre el archivo**: `VERIFICACION_POST_MIGRACION.sql`
2. **Ejecuta TODO el script**
3. **Revisa cada sección**:

#### ✅ **Secciones que DEBEN estar OK:**
- Productos con stock: Columna `Estado` = `✅ OK`
- Productos sin entradas: **VACÍO**
- Discrepancias pendientes: **VACÍO**
- Validación final: `✅ MIGRACIÓN EXITOSA`

#### ⚠️ **Si hay problemas:**
- Revisa manualmente los productos con discrepancias
- Verifica que no haya movimientos manuales directos en BD
- Contacta soporte si no puedes resolverlo

---

### **PASO 4: REINICIAR BACKEND**

El código del backend ya está actualizado. Solo necesitas:

1. **Detén el servidor backend** (si está corriendo)
2. **Reinicia el servidor**:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
3. **Verifica en consola** que no haya errores al iniciar

---

### **PASO 5: VERIFICAR EN FRONTEND**

1. **Abre el navegador**: `http://localhost:4200/admin/inventario?tab=productos`
2. **Verifica que los valores sean correctos**:
   - Maíz: Debe mostrar el stock real desde entradas
   - Trigo: Debe mostrar el stock real desde entradas
   - Todos los productos deben coincidir con la BD

3. **Prueba registrar un consumo**:
   - Ve a: `http://localhost:4200/pollos/alimentacion`
   - Registra consumo para un lote
   - Verifica que descuente correctamente del inventario

---

## 📊 NUEVOS COMPORTAMIENTOS DEL SISTEMA

### **Al registrar ENTRADA de stock:**

```
Frontend → Backend → inventario_entrada_producto
                   → inventario_producto (actualiza consolidado)
                   → movimiento_inventario_producto (historial)
```

**REQUISITOS NUEVOS:**
- ✅ Debe tener código de lote
- ✅ Puede tener fecha de vencimiento (recomendado)
- ✅ Puede tener proveedor (recomendado)

### **Al registrar CONSUMO:**

```
Frontend → Backend → Busca entradas FEFO válidas (no vencidas)
                   → Descuenta por orden de vencimiento
                   → Actualiza inventario_producto consolidado
                   → Registra movimiento en historial
```

**COMPORTAMIENTO NUEVO:**
- ❌ Si NO hay entradas FEFO válidas: **Error de stock insuficiente**
- ⚠️ Ya NO hay fallback al consolidado
- ✅ Esto fuerza trazabilidad completa

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### **Problema 1: "Stock insuficiente" pero tengo stock en BD**

**Causa**: El stock está en `inventario_producto.cantidad_stock` pero NO en entradas FEFO.

**Solución**:
```sql
-- Verifica el producto:
SELECT 
    p.name,
    ip.cantidad_stock AS Consolidado,
    COALESCE(SUM(iep.stock_base_restante), 0) AS EnEntradas
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
LEFT JOIN inventario_entrada_producto iep ON iep.product_id = p.id
WHERE p.id = [ID_DEL_PRODUCTO]
GROUP BY p.id, p.name, ip.cantidad_stock;

-- Si Consolidado > EnEntradas, crea una entrada manual:
INSERT INTO inventario_entrada_producto (
    product_id, codigo_lote, fecha_ingreso, 
    unidad_control, contenido_por_unidad, cantidad_unidades,
    stock_unidades_restantes, stock_base_restante, activo
) VALUES (
    [ID_DEL_PRODUCTO], 'MANUAL-001', NOW(),
    'kg', 1.0, [CANTIDAD_FALTANTE],
    [CANTIDAD_FALTANTE], [CANTIDAD_FALTANTE], TRUE
);
```

---

### **Problema 2: Frontend muestra valores incorrectos**

**Solución**:
1. Refresca la página con Ctrl+F5 (limpiar cache)
2. Verifica en MySQL Workbench:
   ```sql
   SELECT 
       p.name,
       SUM(iep.stock_base_restante) AS StockReal
   FROM inventario_entrada_producto iep
   INNER JOIN product p ON p.id = iep.product_id
   WHERE (iep.activo IS NULL OR iep.activo = TRUE)
     AND (iep.fecha_vencimiento IS NULL OR iep.fecha_vencimiento >= CURDATE())
   GROUP BY p.name;
   ```
3. Si los valores en BD son correctos pero frontend no, revisa console del navegador (F12)

---

### **Problema 3: Error al registrar consumo**

**Posibles causas:**
1. **No hay entradas vigentes**: Registra una entrada primero
2. **Stock vencido**: El sistema no permite consumir stock vencido
3. **Producto sin tipo de alimento**: Verifica que `product.type_food_id` no sea NULL

---

## 📈 MEJORAS LOGRADAS

### **Antes (Problema):**
```
❌ Dos fuentes de verdad (consolidado vs entradas)
❌ Consumos a veces descuentan de consolidado, a veces de entradas
❌ Discrepancias imposibles de rastrear
❌ Sin trazabilidad de lotes
❌ Frontend muestra valores incorrectos
```

### **Después (Solución):**
```
✅ Una sola fuente de verdad (entradas FEFO)
✅ Todos los consumos usan FEFO automático
✅ Trazabilidad completa (lote, vencimiento, proveedor)
✅ Frontend siempre muestra valores correctos
✅ Alertas de vencimiento automáticas
✅ Historial completo de movimientos
```

---

## 🎓 PRÓXIMOS PASOS (FUTURO)

Una vez que el sistema esté estable, puedes implementar:

1. **Reportes de compras**: Usando historial de entradas
2. **Costo promedio por producto**: Desde entradas con costo
3. **Estadísticas por proveedor**: Quién provee qué y a qué precio
4. **Alertas de reorden**: Cuando stock < mínimo
5. **Proyecciones de consumo**: Basado en historial
6. **Dashboard de vencimientos**: Productos próximos a vencer

---

## 📞 SOPORTE

Si encuentras algún problema que no puedas resolver:

1. **Ejecuta el script de verificación** y guarda los resultados
2. **Revisa los logs del backend** para mensajes de error
3. **Revisa la consola del navegador** (F12 → Console)
4. **Anota el producto específico** que causa problema
5. **Si necesitas revertir**, ejecuta la sección de ROLLBACK en el script de migración

---

## ✅ CHECKLIST FINAL

Antes de considerar la migración completa:

- [ ] Respaldo de BD creado
- [ ] Script de migración ejecutado sin errores
- [ ] Script de verificación ejecutado y TODO OK
- [ ] Backend reiniciado correctamente
- [ ] Frontend muestra valores correctos
- [ ] Consumo de prueba registrado exitosamente
- [ ] Entrada de prueba registrada exitosamente
- [ ] Todos los productos críticos tienen stock correcto

---

## 🎉 ¡LISTO!

Tu sistema ahora tiene un inventario PROFESIONAL con trazabilidad completa y FEFO automático.

**Fecha de migración**: [Anota aquí: _______________]
**Ejecutado por**: [Tu nombre: _______________]
**Resultado**: [ ] Exitoso  [ ] Problemas pendientes

---

**Creado por**: Cascade AI  
**Versión**: 1.0  
**Fecha**: 2025-11-16
