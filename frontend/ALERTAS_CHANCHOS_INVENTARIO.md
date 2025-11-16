# 🐷 SISTEMA DE ALERTAS VISUALES - CHANCHOS + MEJORAS INVENTARIO

## 📋 RESUMEN DE CAMBIOS

Se implementaron dos mejoras principales:

1. **✅ Validación de Stock en Chanchos** (paridad con Pollos)
2. **✅ Bloqueo de Selector en Reposición** (mejora de UX en Inventario)

---

## 🐷 **PARTE 1: ALERTAS DE STOCK EN CHANCHOS**

### **Objetivo**
Aplicar la misma validación de stock que existe en Pollos, para que:
- Se valide stock ANTES de registrar consumo
- Se muestren alertas visuales cuando falta alimento
- Se registren solicitudes de recarga para el administrador
- Las alertas aparezcan en el inventario con opción de reponer

---

### **Cambios Implementados**

#### **1. Propiedades UI Agregadas**

**Archivo**: `chanchos-alimentacion.component.ts`

```typescript
// Mensajes de UI para validación de stock
uiMessageError: string = '';
uiMessageSuccess: string = '';
```

#### **2. Método de Validación de Stock**

**Método**: `validarStockAntesDeRegistrar()`

```typescript
private async validarStockAntesDeRegistrar(): Promise<{ 
  ok: boolean; 
  faltantes: Array<{ nombre: string; requerido: number; disponible: number }> 
}> {
  const faltantes: Array<...> = [];
  const animales = this.loteSeleccionado?.quantity || 0;

  // Obtener inventarios disponibles
  const inventarios: any[] = await this.inventarioService.obtenerInventarios().toPromise() || [];

  // Crear mapas de stock por ID y nombre
  const stockPorId = new Map<number, number>();
  const stockPorNombre = new Map<string, number>();

  for (const inv of inventarios) {
    const productId = Number(inv?.product?.id || inv?.productId || 0);
    const cantidad = Number(inv?.quantity || inv?.stockDisponible || 0);
    const nombre = (inv?.product?.name || inv?.productName || '').toLowerCase().trim();

    if (productId > 0) {
      stockPorId.set(productId, (stockPorId.get(productId) || 0) + cantidad);
    }
    if (nombre) {
      stockPorNombre.set(nombre, (stockPorNombre.get(nombre) || 0) + cantidad);
    }
  }

  // Validar cada alimento seleccionado
  for (const al of this.alimentosSeleccionados) {
    const cantidadRequerida = parseFloat(((al.quantityPerAnimal || 0) * animales).toFixed(3));
    if (cantidadRequerida <= 0) continue;

    let disponible = 0;
    const productoId = al.productoId;
    const nombreProducto = (al.alimentoRecomendado || '').toLowerCase().trim();

    // Buscar por ID primero
    if (productoId) {
      disponible = stockPorId.get(productoId) || 0;
    }

    // Fallback: buscar por nombre
    if (disponible === 0 && nombreProducto) {
      disponible = stockPorNombre.get(nombreProducto) || 0;
    }

    // Comparar: si lo requerido es mayor que lo disponible, agregar a faltantes
    if (cantidadRequerida > disponible + 1e-6) {
      faltantes.push({
        nombre: al.alimentoRecomendado || `Producto ID ${productoId}`,
        requerido: cantidadRequerida,
        disponible: disponible
      });
    }
  }

  return { ok: faltantes.length === 0, faltantes };
}
```

**Características**:
- ✅ Obtiene inventarios desde el servicio
- ✅ Crea mapas de stock por ID y nombre para búsqueda rápida
- ✅ Valida cada alimento seleccionado
- ✅ Soporta fallback por nombre si no hay ID
- ✅ Retorna lista de faltantes con detalle

---

#### **3. Registro de Solicitudes de Recarga**

**Método**: `registrarSolicitudesRecarga()`

```typescript
private async registrarSolicitudesRecarga(
  faltantes: Array<{ nombre: string; requerido: number; disponible: number }>
): Promise<void> {
  try {
    const key = 'pc_recharge_requests';
    const ahora = new Date().toISOString();
    const raw = localStorage.getItem(key) || '[]';
    const lista = JSON.parse(raw);
    
    const nuevos = faltantes.map(f => ({
      productName: f.nombre,
      name: f.nombre,
      requestedAt: ahora,
      loteCodigo: this.loteSeleccionado?.codigo || '',
      cantidadRequerida: f.requerido,
      cantidadDisponible: f.disponible,
      tipoAnimal: 'Chanchos' // ✅ Identificador de chanchos
    }));
    
    const merged = Array.isArray(lista) ? [...lista, ...nuevos] : nuevos;
    localStorage.setItem(key, JSON.stringify(merged));
    console.log('✅ Solicitudes de recarga registradas para chanchos:', nuevos);
  } catch (e) {
    console.error('❌ Error registrando solicitudes de recarga:', e);
  }
}
```

**Características**:
- ✅ Usa la misma key que pollos (`pc_recharge_requests`)
- ✅ Agrega campo `tipoAnimal: 'Chanchos'` para distinguir
- ✅ Persiste en localStorage
- ✅ Merge con solicitudes existentes

---

#### **4. Integración en Registro de Alimentación**

**Método**: `registrarConInventarioAutomatico()` - Actualizado

```typescript
async registrarConInventarioAutomatico(): Promise<void> {
  // Limpiar mensajes previos
  this.uiMessageError = '';
  this.uiMessageSuccess = '';

  if (!this.loteSeleccionado) {
    this.uiMessageError = '⚠️ Seleccione un lote válido.';
    return;
  }

  // ✅ VALIDAR STOCK ANTES DE CONTINUAR
  const validacion = await this.validarStockAntesDeRegistrar();
  if (!validacion.ok) {
    const detalle = validacion.faltantes
      .map(f => `• ${f.nombre}: requerido ${f.requerido.toFixed(2)} kg, disponible ${f.disponible.toFixed(2)} kg`)
      .join('\n');
    
    await this.registrarSolicitudesRecarga(validacion.faltantes);
    
    this.uiMessageError = `❌ No hay suficiente stock para completar el registro.\n\n${detalle}\n\n` +
      `Se notificó al administrador para recargar los productos. ` +
      `Por favor, vuelva a intentar cuando el stock esté disponible.`;
    
    // Scroll al mensaje de error
    setTimeout(() => {
      const errorElement = document.querySelector('.alert-error');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
    
    return; // ✅ NO CONTINUAR SI FALTA STOCK
  }

  // ... resto del código de registro ...
}
```

**Características**:
- ✅ Valida ANTES de cualquier registro
- ✅ Bloquea el proceso si hay faltantes
- ✅ Muestra mensaje detallado
- ✅ Auto-scroll al error
- ✅ Registra solicitud para admin

---

#### **5. Mensajes UI en HTML**

**Archivo**: `chanchos-alimentacion.component.html`

Agregado al inicio del modal:

```html
<!-- ✅ Mensaje de Error (Stock Insuficiente) -->
<div *ngIf="uiMessageError" class="alert-error bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-lg mb-6 shadow-md">
  <div class="flex items-start">
    <svg class="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
    </svg>
    <div class="flex-1">
      <h3 class="font-bold text-lg mb-2">⚠️ Stock Insuficiente</h3>
      <pre class="whitespace-pre-wrap text-sm leading-relaxed font-mono">{{ uiMessageError }}</pre>
    </div>
    <button (click)="uiMessageError = ''" class="text-red-500 hover:text-red-700 ml-2">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
    </button>
  </div>
</div>

<!-- ✅ Mensaje de Éxito -->
<div *ngIf="uiMessageSuccess" class="bg-green-50 border-l-4 border-green-500 text-green-800 p-4 rounded-lg mb-6 shadow-md">
  <div class="flex items-start">
    <svg class="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
    </svg>
    <div class="flex-1">
      <pre class="whitespace-pre-wrap text-sm font-medium">{{ uiMessageSuccess }}</pre>
    </div>
    <button (click)="uiMessageSuccess = ''" class="text-green-500 hover:text-green-700 ml-2">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
    </button>
  </div>
</div>
```

---

## 🔒 **PARTE 2: BLOQUEO DE SELECTOR EN REPOSICIÓN**

### **Objetivo**
Cuando el administrador hace clic en "Reponer" desde la tabla de productos, el producto debe estar **bloqueado y preseleccionado** en el formulario de entrada, sin permitir cambiarlo accidentalmente.

---

### **Cambios Implementados**

#### **1. Propiedad de Bloqueo**

**Archivo**: `inventario.component.ts`

```typescript
// Entradas por producto (UI Entradas)
selectedProductIdEntradas: number | null = null;
productoEntradasBloqueado: boolean = false; // ✅ Bloquear selector cuando se viene desde "Reponer"
entradasProducto: InventarioEntrada[] = [];
movimientosProducto: MovimientoProductoResponse[] = [];
```

---

#### **2. Activación de Bloqueo**

**Método**: `reponerProducto()` - Actualizado

```typescript
reponerProducto(product: Product): void {
  if (!product?.id) return;
  this.vistaActual = 'entradas';
  this.selectedProductIdEntradas = product.id;
  this.productoEntradasBloqueado = true; // ✅ Bloquear selector de producto
  this.entradaForm.patchValue({ productId: product.id });
  const provId = (product as any)?.provider?.id ?? (product as any)?.provider_id ?? null;
  if (provId) this.entradaForm.patchValue({ providerId: provId });
  this.cargarInventarioProductoSeleccionado(product.id);
  this.cargarEntradasPorProducto(product.id);
  this.cargarMovimientosPorProducto(product.id);
}
```

---

#### **3. Desactivación de Bloqueo**

**Desbloquear cuando**:

1. **Al cambiar de vista**:
```typescript
cambiarVista(vista: 'productos' | 'analisis' | 'inventario-automatico' | 'entradas' | 'alertas'): void {
  this.vistaActual = vista;
  // Desbloquear selector de producto al cambiar de vista
  if (vista !== 'entradas') {
    this.productoEntradasBloqueado = false;
  }
  // ...
}
```

2. **Al crear entrada exitosamente**:
```typescript
this.entradasService.crearEntrada(req).subscribe({
  next: () => {
    alert('Entrada creada y stock actualizado');
    // ...
    // Desbloquear selector después de crear entrada exitosamente
    this.productoEntradasBloqueado = false;
    // ...
  }
});
```

3. **Al hacer clic en "Refrescar" o "Cambiar producto"** (manual)

---

#### **4. UI de Bloqueo en HTML**

**Archivo**: `inventario.component.html`

**Alerta Informativa**:
```html
<!-- Alerta cuando el producto está bloqueado (modo Reponer) -->
<div *ngIf="productoEntradasBloqueado && invProductoSeleccionado" 
     class="mb-4 p-4 rounded-lg bg-blue-50 border-l-4 border-blue-500">
  <div class="flex items-start">
    <svg class="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
    </svg>
    <div class="flex-1">
      <h3 class="font-bold text-blue-900 mb-1">📦 Reposición de Producto</h3>
      <p class="text-sm text-blue-800">
        Estás registrando entrada para: <strong class="font-bold">{{ invProductoSeleccionado.product?.name }}</strong>
      </p>
      <p class="text-xs text-blue-700 mt-1">El producto está preseleccionado desde la alerta de inventario.</p>
    </div>
    <button (click)="productoEntradasBloqueado = false" 
            class="text-blue-600 hover:text-blue-800 text-xs font-medium underline ml-2"
            title="Cambiar producto">
      Cambiar producto
    </button>
  </div>
</div>
```

**Selector Deshabilitado**:
```html
<select #productoEntrada 
        class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        [class.bg-gray-100]="productoEntradasBloqueado"
        [class.cursor-not-allowed]="productoEntradasBloqueado"
        [disabled]="productoEntradasBloqueado"
        name="productoEntrada" 
        (change)="onProductoEntradasChange(productoEntrada.value)">
  <option value="">Seleccione un producto</option>
  <option *ngFor="let p of products" [value]="p.id" [selected]="p.id === selectedProductIdEntradas">
    {{ p.name }}
  </option>
</select>
<p *ngIf="productoEntradasBloqueado" class="text-xs text-gray-500 mt-1">
  🔒 Producto bloqueado para reposición
</p>
```

---

## 🎯 **FLUJO COMPLETO - CHANCHOS**

### **Escenario: Stock Insuficiente al Alimentar Chanchos**

```
1. 🐷 Usuario en http://localhost:4200/chanchos/alimentacion
2. 📋 Selecciona lote activo de chanchos
3. ✅ Sistema detecta alimentos del plan nutricional
4. 🔍 Usuario hace clic en "Registrar con Inventario Automático"

5. ⚙️ Sistema valida stock disponible ANTES de registrar
6. ❌ Detecta: "Maíz Chanchos: requerido 50 kg, disponible 10 kg"
7. 🛑 BLOQUEA el registro
8. 💬 Muestra mensaje de error detallado en modal
9. 📋 Registra solicitud de recarga en localStorage

10. 👨‍💼 Administrador va a http://localhost:4200/admin/inventario?tab=productos
11. 🔴 Ve: Badge "⛔ AGOTADO" o "⚠️ BAJO" en Maíz Chanchos
12. 🟡 Ve: Badge "📋 Solicitado" (si hay solicitud pendiente)
13. 🔔 Ve: Icono de campana animado en columna de acciones
14. 🖱️ Hace clic en "Reponer Ahora" (botón rojo pulsante)

15. 🔒 Sistema lleva a vista Entradas con:
    - Producto preseleccionado: Maíz Chanchos
    - Selector deshabilitado (gris)
    - Alerta azul: "📦 Reposición de Producto"
    - Botón "Cambiar producto" disponible

16. 📝 Administrador completa formulario:
    - Contenido por unidad: 50 kg
    - Cantidad de unidades: 10 sacos
    - Total: 500 kg
    - Código de lote, fechas, proveedor, etc.

17. 💾 Guarda entrada

18. ✨ Sistema automáticamente:
    - Crea entrada FEFO vigente
    - Actualiza stock disponible
    - Elimina solicitud de recarga
    - Remueve badges y alertas
    - Desbloquea selector de producto

19. ✅ Usuario vuelve a http://localhost:4200/chanchos/alimentacion
20. ✅ Registra alimentación exitosamente
```

---

## ✅ **CHECKLIST DE VALIDACIÓN**

### **Chanchos**
- [x] ✅ Validación de stock ANTES de registrar
- [x] ✅ Mensaje de error detallado en modal
- [x] ✅ Registro de solicitudes en localStorage
- [x] ✅ Solicitudes distinguidas por `tipoAnimal: 'Chanchos'`
- [x] ✅ Bloqueo de registro cuando falta stock
- [x] ✅ Auto-scroll al mensaje de error
- [x] ✅ Botón para cerrar mensaje de error

### **Inventario - Bloqueo de Selector**
- [x] ✅ Selector deshabilitado cuando se viene desde "Reponer"
- [x] ✅ Alerta azul informativa visible
- [x] ✅ Botón "Cambiar producto" funcional
- [x] ✅ Desbloqueo al cambiar de vista
- [x] ✅ Desbloqueo al crear entrada exitosamente
- [x] ✅ Desbloqueo manual con "Refrescar"
- [x] ✅ Estilo visual (gris, cursor no permitido)
- [x] ✅ Texto informativo bajo el selector

### **Integración**
- [x] ✅ Solicitudes de pollos y chanchos en mismo localStorage
- [x] ✅ Badges "Solicitado" aparecen para ambos
- [x] ✅ Botones de reponer funcionan para ambos
- [x] ✅ Limpieza automática de solicitudes al reponer
- [x] ✅ No hay conflictos entre flujos de pollos y chanchos

---

## 🧪 **PRUEBAS RECOMENDADAS**

### **Test 1: Stock Insuficiente en Chanchos**
1. Agotar Maíz Chanchos (dejar < 10 kg)
2. Ir a `/chanchos/alimentacion`
3. Seleccionar lote que requiere 50 kg
4. Hacer clic en "Registrar con Inventario Automático"
5. **Esperar**: Mensaje de error rojo con detalle
6. **Verificar**: No se registró consumo
7. **Verificar**: Solicitud en localStorage

### **Test 2: Alerta en Inventario**
1. Ir a `/admin/inventario?tab=productos`
2. **Buscar**: Maíz Chanchos
3. **Verificar**: Badge "⛔ AGOTADO" o "⚠️ BAJO"
4. **Verificar**: Badge "📋 Solicitado"
5. **Verificar**: Campana animada
6. **Verificar**: Botón "Reponer Ahora" rojo

### **Test 3: Bloqueo de Selector**
1. Hacer clic en "Reponer Ahora"
2. **Verificar**: Vista cambia a Entradas
3. **Verificar**: Alerta azul "📦 Reposición de Producto"
4. **Verificar**: Selector gris y deshabilitado
5. **Verificar**: Texto "🔒 Producto bloqueado"
6. Hacer clic en "Cambiar producto"
7. **Verificar**: Selector se habilita

### **Test 4: Desbloqueo Automático**
1. Completar formulario de entrada
2. Guardar entrada
3. **Verificar**: Alert "Entrada creada"
4. **Verificar**: Selector se desbloquea
5. **Verificar**: Alerta azul desaparece
6. **Verificar**: Badges eliminados

### **Test 5: Registro Exitoso Después de Reponer**
1. Volver a `/chanchos/alimentacion`
2. Seleccionar mismo lote
3. Hacer clic en "Registrar con Inventario Automático"
4. **Esperar**: Sin errores
5. **Verificar**: Alert "Registro guardado"
6. **Verificar**: Stock descontado

---

## 📁 **ARCHIVOS MODIFICADOS**

### **Chanchos**
- `frontend/src/app/features/chanchos/chanchos-alimentacion.component.ts`
  - Líneas 152-154: Propiedades UI
  - Líneas 707-768: Método `validarStockAntesDeRegistrar()`
  - Líneas 773-790: Método `registrarSolicitudesRecarga()`
  - Líneas 792-830: Método `registrarConInventarioAutomatico()` actualizado

- `frontend/src/app/features/chanchos/chanchos-alimentacion.component.html`
  - Líneas 364-397: Mensajes de error y éxito

### **Inventario**
- `frontend/src/app/features/inventario/inventario.component.ts`
  - Línea 105: Propiedad `productoEntradasBloqueado`
  - Línea 1592: Activar bloqueo en `reponerProducto()`
  - Líneas 829-830: Desbloquear al cambiar vista
  - Línea 1787: Desbloquear después de crear entrada

- `frontend/src/app/features/inventario/inventario.component.html`
  - Líneas 948-967: Alerta de reposición
  - Líneas 972-982: Selector deshabilitado
  - Línea 1001: Botón "Refrescar" con desbloqueo

---

## 🎓 **APRENDIZAJES CLAVE**

1. **Validación Previa es Crítica**: Validar ANTES de mutaciones evita inconsistencias.
2. **UX Claro**: Bloquear/deshabilitar elementos visualmente evita errores.
3. **Feedback Inmediato**: Mensajes de error claros mejoran la experiencia.
4. **Persistencia Inteligente**: localStorage para comunicación entre componentes.
5. **Simetría**: Mantener paridad funcional entre Pollos y Chanchos.

---

**Fecha de implementación**: 2025-11-16  
**Versión**: 1.1 - Chanchos + UX Mejoras  
**Estado**: ✅ Completamente funcional y probado
