# 📊 PLAN DE IMPLEMENTACIÓN: ANÁLISIS FINANCIERO COMPLETO

## 🎯 OBJETIVO
Implementar un sistema completo de análisis financiero que calcule costos directos e indirectos por lote, aplique prorrateos justos y permita determinar claramente si cada lote genera ganancia o pérdida.

---

## 📦 COMPONENTES EXISTENTES

### ✅ Ya Implementado:
1. **Costo inicial del animal** (`lote.cost`)
2. **Costo de alimentación** (desde `AnalisisInventarioService`)
   - Detallado por tipo de alimento
   - Consumo real desde movimientos FEFO
3. **Sanidad preventiva** (desde `CostosSanidadService`)
   - Vacunas
   - Antibióticos y vitaminas
   - Material sanitario
   - Servicios veterinarios
4. **KPIs básicos**: Ingresos, vendidos, mortalidad
5. **Servicios para costos indirectos**:
   - `CostosOperacionService` → `/api/costos/operacion`
   - `CostosManoObraService` → `/api/costos/mano-obra`
   - `CostosFijosService` → `/api/costos/fijos`
   - `CostosLogisticaService` → `/api/costos/logistica`

### ❌ Falta Implementar:
1. **Costo de morbilidad** (tratamientos curativos)
2. **Integración de costos indirectos** en análisis por lote
3. **Sistema de prorrateo** (días-animal, biomasa, cantidad)
4. **Reporte detallado por lote** con estructura completa
5. **Análisis de rentabilidad** (precio venta vs costo total)
6. **Comparativo visual** entre lotes (✓ ⚠️ ❌)

---

## 📐 ESTRUCTURA DE COSTOS

### 1. COSTOS DIRECTOS (100% trazables al lote)

#### A. Compra de Animales
```typescript
// Origen: lote.cost
costoCompraTotal = lote.cost
costoUnitarioCompra = lote.cost / lote.quantityOriginal
```

#### B. Alimentación
```typescript
// Origen: AnalisisInventarioService.getAnalisisInventario()
// Movimientos FEFO con costos reales
costotalimentacion = row.detalleAlimentos.reduce((sum, d) => sum + d.costoParcial, 0)
```

#### C. Sanidad Preventiva
```typescript
// Origen: CostosSanidadService.listar()
costoSanidad = registros
  .filter(r => r.loteId === lote.id)
  .reduce((sum, r) => sum + r.total, 0)
```

#### D. Morbilidad (Tratamientos Curativos)
```typescript
// Origen: MorbilidadService.getRegistrosMorbilidad()
costoMorbilidad = registros
  .filter(r => r.loteId === lote.id)
  .reduce((sum, r) => sum + (r.costo || 0), 0)
```

**TOTAL COSTOS DIRECTOS:**
```typescript
costosDirectos = costoCompra + costoAlimentacion + costoSanidad + costoMorbilidad
```

---

### 2. COSTOS INDIRECTOS (Prorrateados entre lotes)

#### A. Gastos de Operación
```typescript
// Origen: CostosOperacionService.listar()
// Ejemplos: Electricidad, Agua, Gas, Mantenimiento, Transporte
```

#### B. Mano de Obra
```typescript
// Origen: CostosManoObraService.listar()
// Ejemplos: Operarios, Veterinario, Administración
```

#### C. Costos Fijos
```typescript
// Origen: CostosFijosService.listar()
// Ejemplos: Alquiler, Seguros, Depreciación, Internet/Teléfono
```

#### D. Logística
```typescript
// Origen: CostosLogisticaService.listar()
// Ejemplos: Transporte, Embalaje, Distribución
```

---

## 🔢 MÉTODOS DE PRORRATEO

### Método 1: Por Días-Animal (RECOMENDADO)
```typescript
// Considera cuánto tiempo estuvo activo cada lote en el período
diasAnimalLote = lote.quantity × diasActivos
totalDiasAnimal = sum(todosLotes.diasAnimal)
proporcionLote = diasAnimalLote / totalDiasAnimal
costoAsignado = costoIndirectoTotal × proporcionLote
```

**Ejemplo:**
```
Lote 3001: 100 pollos × 30 días = 3,000 días-animal
Lote 3002: 150 pollos × 30 días = 4,500 días-animal
Lote 3003: 50 chanchos × 15 días = 750 días-animal
Total: 8,250 días-animal

Gasto operación $510:
- Lote 3001: (3,000/8,250) × $510 = $185.45
- Lote 3002: (4,500/8,250) × $510 = $278.18
- Lote 3003: (750/8,250) × $510 = $46.36
```

### Método 2: Por Cantidad de Animales
```typescript
totalAnimales = sum(todosLotes.quantity)
proporcionLote = lote.quantity / totalAnimales
costoAsignado = costoIndirectoTotal × proporcionLote
```

### Método 3: Por Biomasa (Para chanchos vs pollos)
```typescript
// Peso estimado por especie
pesoPromedio = lote.race.animal.id === 1 ? 2 : 80 // kg
biomasaLote = lote.quantity × pesoPromedio
totalBiomasa = sum(todosLotes.biomasa)
proporcionLote = biomasaLote / totalBiomasa
costoAsignado = costoIndirectoTotal × proporcionLote
```

---

## 📋 REPORTE DETALLADO POR LOTE

```
═════════════════════════════════════════════════════════════
                    LOTE 3001 - 100 POLLOS
                    Período: 01/11 - 30/11 (30 días)
═════════════════════════════════════════════════════════════

A. COSTOS DIRECTOS (Trazables 100%)
├─ Compra de animales................... $150.00
├─ Alimento (30 días)................... $240.00
├─ Sanidad Preventiva................... $41.00
├─ Morbilidad (2 eventos)............... $57.50
                                         --------
Subtotal Costos Directos................ $488.50

B. COSTOS INDIRECTOS (Prorrateados)
├─ Gastos de Operación.................. $185.45
├─ Mano de Obra......................... $315.00
├─ Costos Fijos......................... $283.33
├─ Logística............................ $50.00
                                         --------
Subtotal Costos Indirectos.............. $833.78

═════════════════════════════════════════════════════════════
COSTO TOTAL DEL LOTE.................... $1,322.28
═════════════════════════════════════════════════════════════

ANIMALES:
├─ Iniciales: 100
├─ Muertos: 3 (3%)
├─ Vendidos: 97
└─ Vivos: 0

COSTO POR ANIMAL:
├─ Por animal inicial: $1,322.28 ÷ 100 = $13.22
└─ Por animal vivo: $1,322.28 ÷ 97 = $13.63 ← COSTO REAL

PESO Y CONVERSIÓN:
├─ Peso promedio venta: 2.5 kg
├─ Total kg producidos: 97 × 2.5 = 242.5 kg
├─ Costo por kg: $1,322.28 ÷ 242.5 = $5.45/kg
└─ Conversión alimenticia: 1.8

ANÁLISIS DE RENTABILIDAD:
├─ Precio de venta: $15.00 por pollo
├─ Ingreso total: 97 × $15.00 = $1,455.00
├─ Costo total: $1,322.28
├─ GANANCIA: $132.72
├─ MARGEN: 9.12%
└─ ESTADO: ⚠️ Margen bajo
```

---

## 🎨 COMPARATIVO VISUAL ENTRE LOTES

```
┌────────┬──────────┬───────────┬───────────┬────────────┬───────────┬───────────┬────────┐
│ LOTE   │ ANIMALES │ ALIMENTO  │ PREVENCIÓN│ MORBILIDAD │ INDIRECTOS│ TOTAL/u   │ MARGEN │
├────────┼──────────┼───────────┼───────────┼────────────┼───────────┼───────────┼────────┤
│ 3001   │ 100→97   │ $2.40     │ $0.41     │ $0.58 ⚠️   │ $8.59     │ $13.63    │ 9.1% ⚠️│
│ 3002   │ 150→148  │ $2.35     │ $0.30     │ $0.05 ✓    │ $7.45     │ $11.65 ✓  │ 18.5% ✓│
│ 3003   │ 50→45    │ $18.50    │ $3.00     │ $3.33 ❌   │ $14.81    │ $45.24 ⚠️ │ 5.2% ❌│
└────────┴──────────┴───────────┴───────────┴────────────┴───────────┴───────────┴────────┘

CONCLUSIONES:
✓ Lote 3002: Mejor desempeño (baja morbilidad, baja mortalidad, margen alto)
⚠️ Lote 3001: Morbilidad elevada, revisar bioseguridad, margen aceptable
❌ Lote 3003: Morbilidad crítica, pérdidas importantes, margen muy bajo
```

---

## 🛠️ IMPLEMENTACIÓN TÉCNICA

### Paso 1: Crear servicio integrado de costos
```typescript
@Injectable({ providedIn: 'root' })
export class CostosIntegradosService {
  obtenerCostosPorLote(loteId: string, desde: Date, hasta: Date): Observable<CostosLoteCompleto>
  obtenerCostosIndirectosPeriodo(desde: Date, hasta: Date): Observable<CostosIndirectos>
  prorratearCostos(lotes: Lote[], costosIndirectos: any[], metodo: 'dias-animal' | 'cantidad' | 'biomasa'): Map<string, number>
}
```

### Paso 2: Actualizar componente de análisis financiero
```typescript
export class AnalisisFinancieroComponent {
  // Nuevas propiedades
  costosIndirectosPeriodo: CostosIndirectos;
  metodoProrrateo: 'dias-animal' | 'cantidad' | 'biomasa' = 'dias-animal';
  loteSeleccionado: AnalisisLoteCompleto | null = null;
  
  // Nuevos métodos
  cargarCostosCompletos(): void
  calcularCostosDirectos(lote: Lote): CostosDirectos
  calcularCostosIndirectos(lote: Lote): number
  calcularRentabilidad(lote: Lote): AnalisisRentabilidad
  generarReporteDetallado(lote: Lote): ReporteDetallado
  compararLotes(): ComparativoLotes[]
}
```

### Paso 3: Actualizar HTML con nuevas secciones
1. **Panel de configuración**: Selector de método de prorrateo
2. **Tabla de costos indirectos**: Resumen por concepto
3. **Reporte detallado modal**: Estructura completa por lote
4. **Tabla comparativa**: Con indicadores visuales
5. **Gráficos**: Distribución de costos, rentabilidad por lote

---

## 📊 INTERFACES DE DATOS

```typescript
interface CostosDirectos {
  compraAnimales: number;
  alimentacion: number;
  sanidadPreventiva: number;
  morbilidad: number;
  total: number;
}

interface CostosIndirectos {
  operacion: number;
  manoObra: number;
  fijos: number;
  logistica: number;
  total: number;
}

interface AnalisisLoteCompleto {
  lote: Lote;
  costosDirectos: CostosDirectos;
  costosIndirectos: CostosIndirectos;
  costoTotal: number;
  costoUnitarioInicial: number;
  costoUnitarioVivo: number;
  rentabilidad: AnalisisRentabilidad;
}

interface AnalisisRentabilidad {
  precioVenta: number;
  ingresoTotal: number;
  costoTotal: number;
  ganancia: number;
  margen: number;
  estado: 'excelente' | 'bueno' | 'aceptable' | 'bajo' | 'perdida';
}

interface ReporteDetallado {
  lote: Lote;
  periodo: { inicio: Date; fin: Date; dias: number };
  costosDirectos: CostosDirectos;
  costosIndirectos: CostosIndirectos;
  animales: {
    iniciales: number;
    muertos: number;
    vendidos: number;
    vivos: number;
    mortalidadPct: number;
  };
  costos: {
    unitarioInicial: number;
    unitarioVivo: number;
    porKg: number;
  };
  peso: {
    promedioVenta: number;
    totalKg: number;
    conversionAlimenticia: number;
  };
  rentabilidad: AnalisisRentabilidad;
}
```

---

## 🎯 CRITERIOS DE ÉXITO

1. ✅ Todos los costos directos están correctamente asignados por lote
2. ✅ Los costos indirectos se prorratean justamente según método seleccionado
3. ✅ El costo por animal (inicial y vivo) se calcula correctamente
4. ✅ El análisis de rentabilidad muestra claramente ganancia/pérdida
5. ✅ El comparativo visual permite identificar lotes problemáticos
6. ✅ Los reportes son exportables (PDF/Excel)
7. ✅ Los cálculos son transparentes y auditables

---

## 📅 CRONOGRAMA

1. **Fase 1** (2-3 horas): Crear servicios de costos integrados
2. **Fase 2** (3-4 horas): Actualizar componente con lógica de cálculos
3. **Fase 3** (2-3 horas): Implementar interfaces visuales (HTML/CSS)
4. **Fase 4** (1-2 horas): Testing y ajustes finales
5. **Fase 5** (1 hora): Documentación y capacitación

**TOTAL ESTIMADO: 9-13 horas**

---

## 📝 NOTAS IMPORTANTES

- **Período de análisis**: Por defecto mes actual, pero configurable
- **Filtros**: Por especie (pollos/chanchos), por lote específico, por rango de fechas
- **Exportación**: PDF (reporte ejecutivo), Excel (datos detallados)
- **Permisos**: Solo admin puede ver análisis financiero completo
- **Actualización**: Datos se recalculan cada vez que se carga el componente
- **Cache**: Considerar cachear resultados para mejorar performance

---

## 🔗 ARCHIVOS A MODIFICAR/CREAR

### Crear:
1. `services/costos-integrados.service.ts`
2. `services/costos-mano-obra.service.ts` (si no existe)
3. `services/costos-fijos.service.ts` (si no existe)
4. `services/costos-logistica.service.ts` (si no existe)
5. `models/analisis-financiero.model.ts`

### Modificar:
1. `analisis-financiero.component.ts`
2. `analisis-financiero.component.html`
3. `analisis-inventario.service.ts` (agregar morbilidad)

### Backend (si necesario):
1. Verificar endpoints `/api/costos/*` funcionan correctamente
2. Agregar endpoint `/api/morbilidad/costo-por-lote/{loteId}`

---

**PRÓXIMO PASO**: Iniciar implementación con Fase 1 - Servicios de costos integrados
