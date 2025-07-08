export interface PlanEjecucion {
  id: number;
  planAsignacion?: any;
  planDetalle?: any;
  executedByUser?: any;
  executionDate: string;
  dayNumber: number;
  quantityApplied: number;
  observations?: string;
  status: 'PENDIENTE' | 'EJECUTADO' | 'OMITIDO';
  
  // Campos de corrección
  editado: boolean;
  motivoEdicion?: string;
  editadoPor?: any;
  fechaEdicion?: string;
  cantidadOriginal?: number;
  planDetalleOriginal?: any;
  
  createDate: string;
  updateDate: string;
}
