export interface ChanchaGestacion {
  id: string;
  nombre: string;
  raza?: string;
  fechaInseminacion: string;
  numeroParto: number;
  observaciones?: string;
  /** Foto de la chancha (URL relativa o absoluta) */
  fotoUrl?: string;
  /** Vinculación con lote del sistema (API /api/lote) */
  loteId?: string;
  loteCodigo?: string;
  loteNombre?: string;
  /** Número de chancha dentro del lote: 1 → Cha01, 2 → Cha02… */
  numeroEnLote?: number;
  /** false = vendida, muerta, ciclo cerrado por parto; libera el cupo */
  activa?: boolean;
}

/** Historial de partos (lechones) por chancha */
export interface RegistroPartoGestacion {
  id: string;
  gestacionId: string;
  loteId: string;
  numeroEnLote: number;
  nombreChancha: string;
  numeroParto: number;
  fechaParto: string;
  lechonesNacidos: number;
  lechonesVivos: number;
  lechonesMuertos: number;
  observaciones?: string;
  /** Foto del parto / camada */
  fotoUrl?: string;
  /** Foto de la chancha (de la gestación asociada) */
  fotoChanchaUrl?: string;
  loteNombre?: string;
}

export interface RegistrarPartoPayload {
  fechaParto: string;
  lechonesNacidos: number;
  lechonesVivos: number;
  lechonesMuertos?: number;
  observaciones?: string;
  fotoUrl?: string;
}

export interface EtapaGestacion {
  nombre: string;
  /** Nombre corto para ficha visual (diseño AgriManager) */
  nombreCorto?: string;
  dias: string;
  diasLabel?: string;
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
