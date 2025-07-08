export interface ValidacionResult {
  valido: boolean;
  mensaje: string;
  tipoAlerta: 'info' | 'warning' | 'error';
  cantidadRecomendada?: number;
  cantidadMinima?: number;
  cantidadMaxima?: number;
  requiereConfirmacion: boolean;
}

export interface CorreccionRequest {
  registroId: number;
  motivoCorreccion: string;
  usuarioId: number;
  nuevaCantidad?: number;
  nuevoProductoId?: number;
  nuevasObservaciones?: string;
}

export interface PlanEjecucionHistorial {
  id: number;
  planEjecucionId: number;
  campoModificado: string;
  valorAnterior: string;
  valorNuevo: string;
  usuarioId: number;
  fechaCambio: string;
  motivo: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ValidacionAlimentacion {
  id: number;
  tipoAnimal: string;
  etapa: string;
  cantidadMinimaPorAnimal: number;
  cantidadMaximaPorAnimal: number;
  porcentajeAlertaMinimo: number;
  porcentajeAlertaMaximo: number;
  activo: boolean;
}
