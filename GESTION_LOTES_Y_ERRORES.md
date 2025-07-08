# 🐔🐷 GESTIÓN DE LOTES Y CORRECCIÓN DE ERRORES

## 1️⃣ **SEPARACIÓN POR TIPO DE ANIMAL**

### 🎯 **SÍ, se separan automáticamente:**

```sql
-- Los lotes se filtran por tipo de animal
SELECT * FROM lotes WHERE tipo_animal = 'pollos'
SELECT * FROM lotes WHERE tipo_animal = 'chanchos'
```

### 📋 **Estructura actual en `lotes`:**
```sql
Tabla: lotes
├── codigo (ej: "L001-POLLOS", "L002-CHANCHOS")
├── tipo_animal ('pollos' o 'chanchos')  ← FILTRO CLAVE
├── cantidad_animales
├── fecha_nacimiento
└── estado
```

### 🔄 **Flujo de separación:**

**Frontend de Pollos:**
```typescript
// Solo muestra lotes de pollos
this.lotesService.getLotesByTipo('pollos')
```

**Frontend de Chanchos:**
```typescript
// Solo muestra lotes de chanchos  
this.lotesService.getLotesByTipo('chanchos')
```

**Backend automáticamente filtra:**
```java
@GetMapping("/lotes/{tipoAnimal}")
public List<Lote> getLotesByTipo(@PathVariable String tipoAnimal) {
    return loteService.findByTipoAnimal(tipoAnimal);
}
```

---

## 2️⃣ **CORRECCIÓN DE ERRORES DE USUARIO**

### ❌ **Escenarios comunes de error:**

1. **Cantidad incorrecta registrada**
2. **Producto equivocado seleccionado**  
3. **Fecha incorrecta**
4. **Lote equivocado**

### ✅ **SOLUCIONES IMPLEMENTABLES:**

#### **A) EDICIÓN DE REGISTROS**
```sql
-- Tabla: plan_ejecucion con campos adicionales
ALTER TABLE plan_ejecucion ADD COLUMN editado BOOLEAN DEFAULT FALSE;
ALTER TABLE plan_ejecucion ADD COLUMN motivo_edicion TEXT;
ALTER TABLE plan_ejecucion ADD COLUMN editado_por INT;
ALTER TABLE plan_ejecucion ADD COLUMN fecha_edicion DATETIME;
```

#### **B) HISTORIAL DE CAMBIOS**
```sql
-- Nueva tabla para auditoría
CREATE TABLE plan_ejecucion_historial (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_ejecucion_id INT,
    campo_modificado VARCHAR(50),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario_id INT,
    fecha_cambio DATETIME,
    motivo TEXT
);
```

#### **C) FUNCIONALIDAD DE CORRECCIÓN**

**Frontend - Botón "Editar registro":**
```typescript
editarRegistro(registro: any) {
    // 1. Verificar permisos del usuario
    // 2. Mostrar modal de edición
    // 3. Validar cambios
    // 4. Actualizar con justificación
}
```

**Backend - Endpoint de corrección:**
```java
@PutMapping("/plan-ejecucion/{id}/corregir")
public ResponseEntity<?> corregirRegistro(
    @PathVariable Long id,
    @RequestBody CorreccionRequest request) {
    
    // 1. Guardar estado anterior en historial
    // 2. Aplicar corrección
    // 3. Registrar quién y por qué
    // 4. Ajustar stock si es necesario
}
```

---

## 3️⃣ **GESTIÓN DE STOCK EN CORRECCIONES**

### 🔄 **Si se corrige la cantidad:**

**Ejemplo:** Se registraron 15kg pero fueron 12kg

```sql
-- 1. Registro original
INSERT INTO plan_ejecucion (..., cantidad_suministrada = 15)
UPDATE products SET stock = stock - 15 WHERE id = X

-- 2. Corrección
UPDATE plan_ejecucion SET 
    cantidad_suministrada = 12,
    editado = TRUE,
    motivo_edicion = 'Error en pesaje'
WHERE id = Y

-- 3. Ajuste de stock (+3kg de vuelta)
UPDATE products SET stock = stock + 3 WHERE id = X
```

### 🔄 **Si se corrige el producto:**

**Ejemplo:** Se registró Concentrado A pero era Concentrado B

```sql
-- 1. Devolver stock al producto original
UPDATE products SET stock = stock + 15 WHERE id = PRODUCTO_A

-- 2. Descontar del producto correcto  
UPDATE products SET stock = stock - 15 WHERE id = PRODUCTO_B

-- 3. Actualizar registro
UPDATE plan_ejecucion SET 
    producto_id = PRODUCTO_B,
    editado = TRUE,
    motivo_edicion = 'Producto incorrecto'
```

---

## 4️⃣ **VALIDACIONES PREVENTIVAS**

### 🛡️ **Para evitar errores:**

#### **A) Validación en tiempo real:**
```typescript
// Frontend - Al seleccionar cantidad
validarCantidad(cantidad: number, stockDisponible: number) {
    if (cantidad > stockDisponible) {
        this.mostrarError('No hay suficiente stock');
        return false;
    }
    
    if (cantidad > this.calcularMaximoRecomendado()) {
        this.mostrarAdvertencia('Cantidad muy alta para este lote');
    }
    
    return true;
}
```

#### **B) Confirmación doble:**
```html
<!-- Modal de confirmación -->
<div class="confirmation-modal">
    <h3>Confirmar registro</h3>
    <p><strong>Lote:</strong> {{selectedLote.codigo}}</p>
    <p><strong>Producto:</strong> {{selectedProducto.name}}</p>
    <p><strong>Cantidad:</strong> {{cantidad}} kg</p>
    <p><strong>Animales:</strong> {{selectedLote.cantidad_animales}}</p>
    <p><strong>Por animal:</strong> {{cantidad / selectedLote.cantidad_animales | number:'1.3-3'}} kg</p>
    
    <button (click)="confirmarRegistro()">✅ Confirmar</button>
    <button (click)="cancelar()">❌ Cancelar</button>
</div>
```

#### **C) Límites automáticos:**
```typescript
// Calcular cantidad recomendada según edad
calcularCantidadRecomendada(lote: any): number {
    const edad = this.calcularEdadEnDias(lote.fecha_nacimiento);
    const etapa = this.determinarEtapa(edad);
    
    // plan_detalle.cantidad_por_animal * cantidad_animales
    return etapa.cantidad_por_animal * lote.cantidad_animales;
}
```

---

## 5️⃣ **INTERFAZ DE GESTIÓN**

### 📊 **Panel de administración:**

```html
<!-- Historial con opciones de corrección -->
<div class="historial-alimentacion">
    <table>
        <tr *ngFor="let registro of historial">
            <td>{{registro.fecha_suministro}}</td>
            <td>{{registro.lote_codigo}}</td>
            <td>{{registro.producto_nombre}}</td>
            <td>{{registro.cantidad_suministrada}} kg</td>
            <td>
                <span *ngIf="registro.editado" class="badge-editado">
                    ✏️ Editado
                </span>
            </td>
            <td>
                <button *ngIf="!registro.editado && puedeEditar()" 
                        (click)="editarRegistro(registro)">
                    ✏️ Corregir
                </button>
                
                <button (click)="verHistorial(registro)">
                    🔍 Ver cambios
                </button>
            </td>
        </tr>
    </table>
</div>
```

---

## 6️⃣ **PERMISOS Y CONTROL**

### 👤 **Roles de usuario:**
```sql
-- Solo usuarios con permiso pueden corregir
SELECT p.can_edit_feeding 
FROM permissions p 
JOIN user_roles ur ON p.role_id = ur.role_id 
WHERE ur.user_id = [CURRENT_USER]
```

### ⏰ **Límite de tiempo:**
```typescript
// Solo se puede corregir en las últimas 24 horas
puedeEditar(registro: any): boolean {
    const ahora = new Date();
    const fechaRegistro = new Date(registro.created_at);
    const diferencia = ahora.getTime() - fechaRegistro.getTime();
    const horas = diferencia / (1000 * 3600);
    
    return horas <= 24 && this.usuario.can_edit_feeding;
}
```

---

## 🎯 **RESUMEN DE RESPUESTAS**

### ✅ **Separación por animales:**
- **SÍ** - Los lotes se filtran automáticamente por `tipo_animal`
- Pollos y chanchos tienen interfaces y datos completamente separados

### ✅ **Corrección de errores:**
- **Sistema de edición** con historial de cambios
- **Ajuste automático de stock** 
- **Validaciones preventivas** para evitar errores
- **Permisos y límites de tiempo** para controlar quién puede corregir

### 🛠️ **Próximos pasos recomendados:**
1. Implementar el sistema de correcciones
2. Agregar validaciones más estrictas
3. Crear panel de auditoría
4. Establecer permisos por rol de usuario

¿Te gustaría que implemente alguna de estas funcionalidades específicas?
