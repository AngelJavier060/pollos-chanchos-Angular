/**
 * Modelos de datos para el Análisis Financiero Completo
 * Incluye costos directos, indirectos, prorrateos y análisis de rentabilidad
 */

export interface CostosDirectos {
  compraAnimales: number;
  alimentacion: number;
  sanidadPreventiva: number;
  morbilidad: number; // Por implementar
  total: number;
}

export interface CostosIndirectos {
  operacion: number; // Por implementar
  manoObra: number; // Por implementar
  fijos: number; // Por implementar
  logistica: number; // Por implementar
  total: number;
}

export interface AnalisisRentabilidad {
  precioVenta: number;
  ingresoTotal: number;
  costoTotal: number;
  ganancia: number;
  margen: number; // Porcentaje
  estado: 'excelente' | 'bueno' | 'aceptable' | 'bajo' | 'perdida';
  estadoIcon: string; // ✓ ⚠️ ❌
}

export interface AnimalesResumen {
  iniciales: number;
  enfermos: number;
  muertos: number;
  vendidos: number;
  vivos: number;
  mortalidadPct: number;
}

export interface CostosUnitarios {
  unitarioInicial: number; // Costo total / cantidad inicial
  unitarioVivo: number; // Costo total / animales vivos
  porKg: number; // Costo total / kg producidos
}

export interface PesoResumen {
  promedioVenta: number; // kg
  totalKg: number;
  conversionAlimenticia: number;
}

export interface PeriodoAnalisis {
  inicio: Date | null;
  fin: Date | null;
  dias: number;
}

export interface AnalisisLoteCompleto {
  lote: any; // Lote interface
  periodo: PeriodoAnalisis;
  costosDirectos: CostosDirectos;
  costosIndirectos: CostosIndirectos;
  costoTotal: number;
  animales: AnimalesResumen;
  costos: CostosUnitarios;
  peso: PesoResumen;
  rentabilidad: AnalisisRentabilidad;
  // Desglose de alimentación
  detalleAlimentos?: Array<{
    typeFood: string;
    unidad: string;
    precioUnitario: number;
    consumoKg: number;
    costoParcial: number;
  }>;
}

export interface ReporteDetalladoLote {
  lote: any;
  periodo: PeriodoAnalisis;
  costosDirectos: CostosDirectos;
  costosIndirectos: CostosIndirectos;
  animales: AnimalesResumen;
  costos: CostosUnitarios;
  peso: PesoResumen;
  rentabilidad: AnalisisRentabilidad;
  detalleAlimentacion: Array<{
    tipo: string;
    consumo: number;
    costo: number;
  }>;
}

export interface ComparativoLotes {
  loteId: string;
  loteCodigo: string;
  animalTipo: string;
  animales: string; // Ej: "100→97"
  costoAlimento: number;
  costoSanidad: number;
  costoMorbilidad: number;
  costosIndirectos: number;
  costoUnitario: number;
  margen: number;
  estado: 'excelente' | 'bueno' | 'aceptable' | 'bajo' | 'perdida';
}

export type MetodoProrrateo = 'dias-animal' | 'cantidad' | 'biomasa';

export interface ConfiguracionProrrateo {
  metodo: MetodoProrrateo;
  descripcion: string;
}

export interface CostoIndirectoRegistro {
  id: string;
  concepto: string;
  detalle: string;
  monto: number;
  fecha: Date | string;
  animalIds?: number[];
  loteIds?: string[];
}

export interface CostosIndirectosPeriodo {
  operacion: CostoIndirectoRegistro[];
  manoObra: CostoIndirectoRegistro[];
  fijos: CostoIndirectoRegistro[];
  logistica: CostoIndirectoRegistro[];
  totalOperacion: number;
  totalManoObra: number;
  totalFijos: number;
  totalLogistica: number;
  totalGeneral: number;
}

export interface ProrrateoPorLote {
  loteId: string;
  loteCodigo: string;
  diasAnimal: number; // Para método días-animal
  cantidad: number; // Para método cantidad
  biomasa: number; // Para método biomasa
  proporcion: number; // 0-1
  costoAsignado: number;
}

export interface ResultadoProrrateo {
  metodo: MetodoProrrateo;
  totalAprorratear: number;
  asignaciones: Map<string, number>; // loteId -> monto asignado
  detalles: ProrrateoPorLote[];
}

/**
 * Helper para determinar el estado de rentabilidad según el margen
 */
export function determinarEstadoRentabilidad(margen: number): {
  estado: 'excelente' | 'bueno' | 'aceptable' | 'bajo' | 'perdida';
  icono: string;
} {
  if (margen < 0) {
    return { estado: 'perdida', icono: '❌' };
  } else if (margen < 10) {
    return { estado: 'bajo', icono: '❌' };
  } else if (margen < 15) {
    return { estado: 'aceptable', icono: '⚠️' };
  } else if (margen < 25) {
    return { estado: 'bueno', icono: '✓' };
  } else {
    return { estado: 'excelente', icono: '✓✓' };
  }
}

/**
 * Helper para calcular días activos de un lote en un período
 */
export function calcularDiasActivos(
  lote: any,
  periodoInicio: Date,
  periodoFin: Date
): number {
  const birthdate = lote.birthdate ? new Date(lote.birthdate) : null;
  const closeDate = lote.closeDate ? new Date(lote.closeDate) : null;

  if (!birthdate) return 0;

  const inicioLote = birthdate > periodoInicio ? birthdate : periodoInicio;
  const finLote = closeDate && closeDate < periodoFin ? closeDate : periodoFin;

  if (inicioLote > finLote) return 0;

  const diffTime = finLote.getTime() - inicioLote.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}
