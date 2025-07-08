# 📊 TABLAS DE BASE DE DATOS - Sistema Pollos-Chanchos

## 🗃️ ESTRUCTURA DE ALMACENAMIENTO

### 📦 **INVENTARIO/PRODUCTOS**
```sql
Tabla: products
├── id (PK)
├── name (nombre del producto)
├── price (precio)  
├── stock (cantidad disponible)
├── animal_id (FK - vincula con animales)
├── created_at
└── updated_at
```
**Uso:** Almacena todos los productos del inventario (concentrados, medicinas, etc.)
**Filtro para pollos:** `WHERE animal_id = [ID_POLLOS]`

---

### 🐔 **ANIMALES**
```sql
Tabla: animals
├── id (PK)
├── name (nombre: "Pollos", "Cerdos", etc.)
├── description
├── created_at
└── updated_at
```
**Uso:** Tipos de animales del sistema

---

### 📋 **PLANES DE ALIMENTACIÓN**
```sql
Tabla: plan_alimentacion
├── id (PK)
├── nombre (ej: "Plan Estándar Pollos")
├── descripcion
├── tipo_animal (ej: "pollos")
├── activo (boolean)
├── created_at
└── updated_at
```
**Uso:** Define los planes generales de alimentación por tipo de animal

---

### 📝 **DETALLES DE PLANES**
```sql
Tabla: plan_alimentacion_detalle
├── id (PK)
├── plan_id (FK → plan_alimentacion)
├── etapa (ej: "Inicial", "Crecimiento")
├── dia_inicio (ej: 1)
├── dia_fin (ej: 14)
├── producto_id (FK → products)
├── cantidad_por_animal (kg por animal)
├── created_at
└── updated_at
```
**Uso:** Define qué producto usar en cada etapa y cuánto por animal

---

### 🏷️ **LOTES**
```sql
Tabla: lotes
├── id (PK)
├── codigo (ej: "L001")
├── tipo_animal (ej: "pollos")
├── cantidad_animales (ej: 100)
├── fecha_nacimiento
├── estado (ej: "activo")
├── created_at
└── updated_at
```
**Uso:** Agrupa animales del mismo tipo y edad

---

### 🔗 **ASIGNACIONES DE PLANES**
```sql
Tabla: plan_asignacion
├── id (PK)
├── lote_id (FK → lotes)
├── plan_id (FK → plan_alimentacion)
├── fecha_asignacion
├── estado (ej: "activo")
├── created_at
└── updated_at
```
**Uso:** Vincula cada lote con su plan de alimentación

---

### 📊 **REGISTRO DE ALIMENTACIÓN**
```sql
Tabla: plan_ejecucion
├── id (PK)
├── lote_id (FK → lotes)
├── producto_id (FK → products)
├── cantidad_suministrada (kg total)
├── fecha_suministro
├── edad_animales_dias
├── etapa (ej: "Crecimiento")
├── observaciones
├── usuario_id (quien registró)
├── created_at
└── updated_at
```
**Uso:** Guarda cada registro de alimentación realizada

---

## 🔄 **FLUJO DE DATOS**

### 1. **Al cargar la página de alimentación:**
```sql
-- Obtener productos para pollos:
SELECT * FROM products WHERE animal_id = [ID_POLLOS]

-- Obtener lotes activos:
SELECT * FROM lotes WHERE tipo_animal = 'pollos' AND estado = 'activo'

-- Para cada lote, calcular edad y etapa actual
```

### 2. **Al validar stock:**
```sql
-- Verificar stock disponible:
SELECT stock FROM products WHERE id = [PRODUCTO_ID]
```

### 3. **Al registrar alimentación:**
```sql
-- Insertar registro:
INSERT INTO plan_ejecucion (
    lote_id, producto_id, cantidad_suministrada,
    fecha_suministro, edad_animales_dias, etapa, usuario_id
) VALUES (...)

-- Actualizar stock:
UPDATE products 
SET stock = stock - [CANTIDAD_USADA] 
WHERE id = [PRODUCTO_ID]
```

---

## 🎯 **TABLAS CLAVE PARA EL PROBLEMA RESUELTO**

### ✅ **ANTES (Problema):**
- Frontend usaba `stockSimulado` (datos falsos)
- No consultaba la tabla `products`
- Stock validation era hardcodeada

### ✅ **DESPUÉS (Solución):**
- Frontend consulta `products` filtrado por `animal_id`
- Stock validation usa `products.stock` real
- Registros se guardan en `plan_ejecucion`
- Stock se actualiza en `products.stock`

---

## 🔍 **CONSULTAS PRINCIPALES**

### **Obtener productos para pollos:**
```sql
SELECT p.* FROM products p 
JOIN animals a ON p.animal_id = a.id 
WHERE a.name = 'Pollos'
```

### **Obtener plan actual de un lote:**
```sql
SELECT pa.*, pad.* 
FROM plan_asignacion pa
JOIN plan_alimentacion_detalle pad ON pa.plan_id = pad.plan_id
JOIN lotes l ON pa.lote_id = l.id
WHERE l.id = [LOTE_ID] 
AND [EDAD_DIAS] BETWEEN pad.dia_inicio AND pad.dia_fin
```

### **Historial de alimentación:**
```sql
SELECT pe.*, p.name as producto_nombre, l.codigo as lote_codigo
FROM plan_ejecucion pe
JOIN products p ON pe.producto_id = p.id
JOIN lotes l ON pe.lote_id = l.id
WHERE pe.fecha_suministro >= '2025-01-01'
ORDER BY pe.fecha_suministro DESC
```

---

## 📝 **RESUMEN**

**ALMACENAMIENTO PRINCIPAL:**
- 📦 **Inventario:** `products` (con stock real)
- 🐔 **Lotes:** `lotes` (grupos de animales)
- 📋 **Planes:** `plan_alimentacion` + `plan_alimentacion_detalle`
- 📊 **Registros:** `plan_ejecucion` (cada alimentación)

**DATOS EN TIEMPO REAL:**
- Stock disponible: `products.stock`
- Edad de lotes: Calculada desde `lotes.fecha_nacimiento`
- Etapa actual: Determinada por edad vs `plan_alimentacion_detalle`

🎉 **Todas las operaciones ahora usan datos reales de estas tablas**
