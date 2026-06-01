export interface ChanchaGestacion {
  id: string;
  nombre: string;
  raza?: string;
  fechaInseminacion: string;
  numeroParto: number;
  observaciones?: string;
  /** Vinculación con lote del sistema (API /api/lote) */
  loteId?: string;
  loteCodigo?: string;
  loteNombre?: string;
  /** Número de chancha dentro del lote: 1 → Cha01, 2 → Cha02… */
  numeroEnLote?: number;
  /** false = vendida, muerta o fuera de producción; libera el cupo */
  activa?: boolean;
}

export interface EtapaGestacion {
  nombre: string;
  dias: string;
  inicio: number;
  fin: number;
}

export interface EstadoGestacionBadge {
  label: string;
  cls: string;
}

export interface AlertaGestacion {
  chancha: ChanchaGestacion;
  tipo: 'warning' | 'danger';
}

export interface StatsGestacion {
  total: number;
  gestando: number;
  preParto: number;
  paridas: number;
}
