# Guía de Configuración de Planes Nutricionales para Chanchos

## 📋 Resumen de Cambios Implementados

### Problema Identificado
- **Situación actual**: Tienes 317 chanchos con 317 días de vida
- **Problema**: El sistema mostraba etapas 1-30 días (configuración de pollos)
- **Solución**: Ajustar rangos para chanchos a 180-365 días

### Cambios Realizados

#### 1. Validación de Rangos Ampliada
- **Antes**: Validación limitada a rangos cortos (1-30 días)
- **Ahora**: Validación hasta 365 días (1 año completo)
- **Ubicación**: `plan-nutricional.component.ts` líneas 125-126

```typescript
dayStart: ['', [Validators.required, Validators.min(1), Validators.max(365)]],
dayEnd: ['', [Validators.required, Validators.min(1), Validators.max(365)]],
```

#### 2. Sugerencia Inteligente de Rangos
- **Pollos**: Inicia en día 1, duración sugerida 7 días
- **Chanchos**: Inicia en día 180 (6 meses), duración sugerida 185 días (6 meses)
- **Ubicación**: `calcularSiguienteRangoDisponible()` líneas 1233-1246

## 🐷 Configuración Recomendada para Chanchos

### Estructura de Planes Sugerida

Basándote en la **Guía Chanchos** del sistema (panel flotante en el formulario), configura los siguientes planes:

#### Plan 1: Chanchos 180-365 días (6-12 meses)
**Rango principal**: 180-365 días

**Etapas de Crecimiento**:

1. **Etapa 180-210 días** (6-7 meses)
   - Peso: 60-80 kg
   - Consumo diario: 2.5-3.0 kg/animal
   - Mezcla: 70% Maíz, 25% Soya, 5% Suplementos
   - Producto: Alimento Engorde Chanchos

2. **Etapa 211-240 días** (7-8 meses)
   - Peso: 80-100 kg
   - Consumo diario: 3.0-3.5 kg/animal
   - Mezcla: 65% Maíz, 30% Soya, 5% Suplementos
   - Producto: Alimento Finalización Chanchos

3. **Etapa 241-270 días** (8-9 meses)
   - Peso: 100-120 kg
   - Consumo diario: 3.5-4.0 kg/animal
   - Mezcla: 60% Maíz, 35% Soya, 5% Suplementos
   - Producto: Alimento Finalización Plus

4. **Etapa 271-300 días** (9-10 meses)
   - Peso: 120-140 kg
   - Consumo diario: 4.0-4.5 kg/animal
   - Mezcla: 55% Maíz, 40% Soya, 5% Suplementos
   - Producto: Alimento Pre-Venta

5. **Etapa 301-365 días** (10-12 meses)
   - Peso: 140-160+ kg
   - Consumo diario: 4.5-5.0 kg/animal
   - Mezcla: 50% Maíz, 45% Soya, 5% Suplementos
   - Producto: Alimento Mantenimiento

### Planes Adicionales (Opcional)

#### Plan 2: Chanchos 1-60 días (Lechones)
**Rango principal**: 1-60 días

1. **Etapa 1-21 días** (Lactancia)
   - Peso: 1.5-7 kg
   - Consumo: 0.2-0.5 kg/animal
   - Producto: Alimento Preinicial Lechón

2. **Etapa 22-60 días** (Destete)
   - Peso: 7-20 kg
   - Consumo: 0.5-1.0 kg/animal
   - Producto: Alimento Inicial Lechón

#### Plan 3: Chanchos 61-179 días (Crecimiento)
**Rango principal**: 61-179 días

1. **Etapa 61-120 días** (Crecimiento)
   - Peso: 20-50 kg
   - Consumo: 1.0-2.0 kg/animal
   - Producto: Alimento Crecimiento

2. **Etapa 121-179 días** (Desarrollo)
   - Peso: 50-60 kg
   - Consumo: 2.0-2.5 kg/animal
   - Producto: Alimento Desarrollo

## 📝 Pasos para Configurar

### Paso 1: Acceder al Admin de Plan Nutricional
```
URL: http://localhost:4200/admin/plan-nutricional
```

### Paso 2: Crear el Plan Principal
1. Click en **"Nuevo Plan"**
2. Llenar el formulario:
   - **Nombre**: `Plan Chanchos 180-365 días`
   - **Descripción**: `Plan de alimentación para chanchos en etapa de engorde y finalización (6-12 meses)`
   - **Animal**: Seleccionar `Chanchos` o `Cerdos`
3. Click en **"Guardar Plan"**

### Paso 3: Agregar Etapas de Crecimiento
1. Seleccionar el plan creado en el dropdown
2. Click en **"Nueva Etapa de Crecimiento"**
3. Para cada etapa (según tabla arriba):
   - **Día inicio**: 180, 211, 241, 271, 301
   - **Día fin**: 210, 240, 270, 300, 365
   - **Animal**: Chanchos (bloqueado automáticamente)
   - **Tipo de Producto**: Alimento
   - **Producto**: Seleccionar el alimento correspondiente del inventario
   - **Cantidad por animal**: 2.5, 3.0, 3.5, 4.0, 4.5 kg
   - **Frecuencia**: DIARIA
   - **Instrucciones**: (Opcional) Detalles de la mezcla
4. Click en **"Guardar Etapa"**
5. Repetir para cada etapa

### Paso 4: Verificar en Vista General
1. Click en la pestaña **"Vista General"**
2. Verificar que todas las etapas aparezcan correctamente
3. Confirmar rangos: 180-365 días

### Paso 5: Probar en Alimentación de Chanchos
1. Ir a: `http://localhost:4200/chanchos/alimentacion`
2. Seleccionar un lote con 317 días de vida
3. Click en **"Ingresar Alimentos Diarios"**
4. Verificar que la **"Etapa Actual del Plan Nutricional"** muestre:
   - **Etapa**: Plan Chanchos 180-365 días
   - **Rango de días**: 180 - 365 días
   - **Días actuales**: 317 días ✅
   - **Alimento recomendado**: Alimento Pre-Venta (etapa 271-300)

## 🔍 Verificación de Funcionamiento

### Indicadores de Éxito
- ✅ El cintillo "Etapa Actual" muestra el rango correcto (180-365)
- ✅ Los días actuales (317) caen dentro del rango
- ✅ Se muestra el alimento correcto para 317 días
- ✅ La cantidad sugerida es apropiada (4.0-4.5 kg/animal)

### Solución de Problemas

#### Problema: "Sin etapa definida para 317 días"
**Causa**: No hay etapas configuradas que incluyan el día 317
**Solución**: 
1. Verificar que existe una etapa con rango que incluya 317 (ej: 271-300 o 301-365)
2. Si no existe, crear la etapa faltante

#### Problema: Muestra etapa 1-30 días
**Causa**: El plan activo es de pollos, no de chanchos
**Solución**:
1. Verificar que el plan esté asignado al animal correcto (Chanchos)
2. Crear un plan específico para chanchos con rangos 180-365

#### Problema: No aparecen productos
**Causa**: Los productos no están filtrados para chanchos
**Solución**:
1. Verificar que los productos en inventario tengan `animal_id = 2` (Chanchos)
2. O que el nombre/descripción incluya "chancho", "cerdo" o "porcino"

## 📊 Referencia Rápida: Etapas por Edad

| Edad (días) | Edad (meses) | Etapa | Peso (kg) | Consumo (kg/día) |
|-------------|--------------|-------|-----------|------------------|
| 1-21 | 0-1 | Lechón | 1.5-7 | 0.2-0.5 |
| 22-60 | 1-2 | Destete | 7-20 | 0.5-1.0 |
| 61-120 | 2-4 | Crecimiento | 20-50 | 1.0-2.0 |
| 121-179 | 4-6 | Desarrollo | 50-60 | 2.0-2.5 |
| 180-210 | 6-7 | Engorde | 60-80 | 2.5-3.0 |
| 211-240 | 7-8 | Finalización | 80-100 | 3.0-3.5 |
| 241-270 | 8-9 | Finalización Plus | 100-120 | 3.5-4.0 |
| 271-300 | 9-10 | Pre-Venta | 120-140 | 4.0-4.5 |
| 301-365 | 10-12 | Mantenimiento | 140-160+ | 4.5-5.0 |

## 🎯 Caso Específico: 317 Chanchos

Para tu caso específico con **317 chanchos de 317 días de vida**:

1. **Etapa actual**: 301-365 días (10-12 meses)
2. **Peso estimado**: 140-160 kg
3. **Consumo diario recomendado**: 4.5-5.0 kg/animal
4. **Consumo total diario**: 317 chanchos × 4.75 kg = **1,505.75 kg/día**
5. **Producto**: Alimento Mantenimiento o Pre-Venta

### Configuración Mínima Requerida
Si solo quieres configurar para tus chanchos actuales:

1. Crear plan: **"Plan Chanchos 180-365 días"**
2. Crear UNA etapa: **301-365 días**
   - Producto: Alimento Mantenimiento
   - Cantidad: 4.75 kg/animal
   - Frecuencia: DIARIA

Esto será suficiente para que el sistema reconozca la etapa actual de tus 317 chanchos.

## 🚀 Próximos Pasos

1. ✅ Configurar el plan principal (180-365 días)
2. ✅ Agregar al menos la etapa 301-365 días
3. ✅ Verificar en chanchos/alimentacion
4. 📝 Opcionalmente, agregar etapas intermedias (180-210, 211-240, etc.)
5. 📝 Opcionalmente, crear planes para otras edades (1-60, 61-179)

---

**Nota**: Los valores de consumo y peso son referenciales. Ajústalos según tu experiencia y las características específicas de tu granja.
