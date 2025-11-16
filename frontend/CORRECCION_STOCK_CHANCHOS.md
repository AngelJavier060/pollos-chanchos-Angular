# 🐷 CORRECCIÓN: Validación de Stock en Chanchos

## 🐛 **PROBLEMA IDENTIFICADO**

### **Síntoma**
En `http://localhost:4200/chanchos/alimentacion`, al intentar registrar alimentación, aparecía el error:

```
⚠️ Stock Insuficiente
❌ No hay suficiente stock para completar el registro.

• Semita: requerido 0.30 kg, disponible 0.00 kg
• ProCerdos Cerdos Engorde: requerido 0.05 kg, disponible 0.00 kg
```

**Sin embargo**, en el inventario (`http://localhost:4200/admin/inventario?tab=productos`) sí había stock:
- **Semita**: 80 kg disponibles
- **ProCerdos Cerdos Engorde**: 39.1 kg disponibles

---

## 🔍 **CAUSA RAÍZ**

El método `validarStockAntesDeRegistrar()` en **chanchos** estaba consultando la tabla **consolidada** de inventario (`inventario_producto`) a través de:

```typescript
const inventarios: any[] = await this.inventarioService.obtenerInventarios().toPromise();
```

### **¿Por qué es un problema?**

En el sistema **FEFO Estricto** que implementamos:

1. ✅ La **fuente de verdad** es `inventario_entrada_producto` (entradas FEFO)
2. ❌ La tabla `inventario_producto` (consolidada) **YA NO SE ACTUALIZA** automáticamente
3. 🔄 Los consumos se registran contra entradas FEFO, no contra inventario consolidado

**Resultado**: La validación leía stock en 0 desde la tabla consolidada obsoleta, aunque las entradas FEFO sí tenían stock.

---

## ✅ **SOLUCIÓN IMPLEMENTADA**

### **Cambios Realizados**

#### **1. Agregar Import del Servicio de Entradas**

**Archivo**: `chanchos-alimentacion.component.ts` (línea 13)

```typescript
import { InventarioEntradasService } from '../../shared/services/inventario-entradas.service';
```

---

#### **2. Inyectar Servicio en Constructor**

**Archivo**: `chanchos-alimentacion.component.ts` (línea 229)

```typescript
constructor(
  private authService: AuthDirectService,
  private loteService: LoteService,
  private planService: PlanAlimentacionService,
  private planNutricionalService: PlanNutricionalIntegradoService,
  private registroDiarioService: RegistroDiarioService,
  private productService: ProductService,
  private inventarioService: InventarioService,
  private router: Router,
  private alimentacionService: AlimentacionService,
  private invEntradasService: InventarioEntradasService  // ✅ NUEVO
) {
  this.user = this.authService.currentUserValue;
}
```

---

#### **3. Reemplazar Método de Validación**

**Archivo**: `chanchos-alimentacion.component.ts` (líneas 710-806)

**ANTES** (❌ Incorrecto):
```typescript
// Consulta inventario consolidado (obsoleto en FEFO Estricto)
const inventarios: any[] = await this.inventarioService.obtenerInventarios().toPromise();
```

**DESPUÉS** (✅ Correcto):
```typescript
// Consulta entradas FEFO vigentes (fuente de verdad)
let stockValido: Record<string, number> = {};
stockValido = await this.invEntradasService.stockValidoAgrupado().toPromise() || {};
```

---

### **Lógica Completa de Validación**

El método corregido ahora:

1. **Consulta Stock Válido desde Entradas FEFO**:
   ```typescript
   stockValido = await this.invEntradasService.stockValidoAgrupado().toPromise();
   ```
   - Este método suma `stockBaseRestante` de todas las entradas vigentes (no vencidas, activas)
   - Agrupa por `productId`
   - Devuelve un mapa: `{ "123": 80.5, "456": 39.1, ... }`

2. **Busca por ID de Producto** (primera prioridad):
   ```typescript
   if (Number.isFinite(Number(productoId))) {
     disponible = Number(stockValido[String(productoId)] || 0);
   }
   ```

3. **Fallback por Nombre** (si no hay ID o stock = 0):
   ```typescript
   const candidatos = candidatosPorNombre(nombreProducto);
   for (const candidato of candidatos) {
     const pid = Number(candidato?.id);
     disponible += Number(stockValido[String(pid)] || 0);
   }
   ```
   - Busca productos con nombre similar
   - Suma el stock de todos los candidatos

4. **Último Recurso: Consulta Directa de Entradas**:
   ```typescript
   const entradas = await this.invEntradasService.listarPorProducto(productoId).toPromise();
   const total = (entradas || []).reduce((sum, e) => 
     sum + Number(e?.stockBaseRestante || 0), 0
   );
   ```

5. **Logs Detallados** para debugging:
   ```typescript
   console.log(`🔍 [Chanchos] Stock por ID ${productoId}:`, disponible);
   console.log(`📊 [Chanchos] "${nombreProducto}": requerido ${req} kg, disponible ${disp} kg`);
   ```

---

## 🔄 **FLUJO CORREGIDO**

### **Caso: Registrar Alimentación de Chanchos**

```
1. 🐷 Usuario en http://localhost:4200/chanchos/alimentacion
2. 📋 Selecciona lote: "Chanchos Engorde 003" (10 animales)
3. 🌾 Plan detecta alimentos:
   - Semita: 0.03 kg/animal/día → 0.30 kg total
   - ProCerdos: 0.005 kg/animal/día → 0.05 kg total

4. 🖱️ Usuario hace clic en "Registrar con Inventario Automático"

5. ⚙️ Sistema valida stock:
   ✅ Consulta invEntradasService.stockValidoAgrupado()
   ✅ Obtiene: { "123": 80.0, "456": 39.1 }
   
6. 🔍 Busca "Semita":
   ✅ Encuentra producto ID 123
   ✅ Stock válido: 80.0 kg
   ✅ Requerido: 0.30 kg
   ✅ OK: 80.0 >= 0.30

7. 🔍 Busca "ProCerdos Cerdos Engorde":
   ✅ Encuentra producto ID 456
   ✅ Stock válido: 39.1 kg
   ✅ Requerido: 0.05 kg
   ✅ OK: 39.1 >= 0.05

8. ✅ Validación exitosa (no hay faltantes)

9. 💾 Sistema registra consumo:
   - Descuenta 0.30 kg de Semita (desde entradas FEFO)
   - Descuenta 0.05 kg de ProCerdos (desde entradas FEFO)
   - Actualiza stockBaseRestante de las entradas
   - Registra movimiento de consumo

10. ✅ Mensaje: "Registro de alimentación guardado y consumo descontado del inventario"
```

---

## 🧪 **VERIFICACIÓN**

### **Test 1: Validación Correcta**

1. Ve a `http://localhost:4200/chanchos/alimentacion`
2. Selecciona un lote activo
3. Haz clic en "Registrar con Inventario Automático"
4. **Esperado**: 
   - Si hay stock suficiente → Registro exitoso
   - Si falta stock → Error con cantidades correctas

### **Test 2: Logs en Consola**

Abre la consola del navegador (F12) y busca:

```
🔎 [Chanchos] stockValidoAgrupado keys: ["123", "456", ...]
🔍 [Chanchos] Stock por ID 123 (Semita): 80
📊 [Chanchos] "Semita": requerido 0.30 kg, disponible 80.00 kg
🔍 [Chanchos] Stock por ID 456 (ProCerdos Cerdos Engorde): 39.1
📊 [Chanchos] "ProCerdos Cerdos Engorde": requerido 0.05 kg, disponible 39.10 kg
🧪 [Chanchos] Validación stock - faltantes: []
```

### **Test 3: Verificar Stock en Inventario**

1. Ve a `http://localhost:4200/admin/inventario?tab=productos`
2. Busca "Semita" y "ProCerdos Cerdos Engorde"
3. Verifica que "Cantidad Real" muestre el stock correcto
4. Haz clic en el producto para ver sus entradas
5. **Verificar**: La suma de `stockBaseRestante` de entradas vigentes = Cantidad Real

---

## 📊 **COMPARACIÓN: ANTES vs DESPUÉS**

| Aspecto | ❌ ANTES (Incorrecto) | ✅ DESPUÉS (Correcto) |
|---------|----------------------|----------------------|
| **Fuente de datos** | `inventario_producto` (consolidada) | `inventario_entrada_producto` (FEFO) |
| **Método usado** | `inventarioService.obtenerInventarios()` | `invEntradasService.stockValidoAgrupado()` |
| **Actualización** | Manual/inconsistente | Automática (FEFO Estricto) |
| **Precisión** | ❌ Desactualizado | ✅ Tiempo real |
| **Trazabilidad** | ❌ No | ✅ Sí (por lote/vencimiento) |

---

## 🔗 **RELACIÓN CON POLLOS**

**Pollos ya estaba correcto** desde el principio porque usaba:

```typescript
// pollos-alimentacion.component.ts (línea 820)
stockValido = await this.invEntradasService.stockValidoAgrupado().toPromise();
```

**Chanchos ahora usa exactamente la misma lógica**, garantizando:
- ✅ Paridad funcional entre Pollos y Chanchos
- ✅ Validación correcta en ambos módulos
- ✅ Consistencia con FEFO Estricto

---

## 📁 **ARCHIVOS MODIFICADOS**

### **1. chanchos-alimentacion.component.ts**

**Línea 13**: Import de `InventarioEntradasService`
```typescript
import { InventarioEntradasService } from '../../shared/services/inventario-entradas.service';
```

**Línea 229**: Inyección en constructor
```typescript
private invEntradasService: InventarioEntradasService
```

**Líneas 710-806**: Método `validarStockAntesDeRegistrar()` completo reescrito
- Consulta `stockValidoAgrupado()`
- Busca por ID y nombre
- Fallback a consulta directa de entradas
- Logs detallados

---

## ✅ **CHECKLIST DE VALIDACIÓN**

- [x] ✅ Import de `InventarioEntradasService` agregado
- [x] ✅ Servicio inyectado en constructor
- [x] ✅ Método `validarStockAntesDeRegistrar()` reescrito
- [x] ✅ Consulta `stockValidoAgrupado()` desde entradas FEFO
- [x] ✅ Búsqueda por ID de producto
- [x] ✅ Fallback por nombre de producto
- [x] ✅ Fallback a consulta directa de entradas
- [x] ✅ Logs detallados para debugging
- [x] ✅ Paridad con lógica de Pollos

---

## 🎓 **LECCIONES APRENDIDAS**

1. **En FEFO Estricto, SIEMPRE consultar entradas**, no inventario consolidado
2. **La tabla consolidada es legacy**, solo para referencia histórica
3. **Logs detallados son cruciales** para diagnosticar problemas de stock
4. **Mantener paridad entre módulos** (Pollos y Chanchos) facilita mantenimiento
5. **Testing exhaustivo** después de cambios en validación de stock

---

## 🚀 **PRÓXIMOS PASOS**

1. ✅ Probar registro de alimentación en chanchos
2. ✅ Verificar que stock se descuenta correctamente
3. ✅ Confirmar que alertas funcionan cuando realmente falta stock
4. ✅ Verificar logs en consola para asegurar correcta búsqueda

---

**Fecha de corrección**: 2025-11-16  
**Versión**: 1.1 - Corrección Stock Chanchos FEFO  
**Estado**: ✅ Corregido y listo para probar
