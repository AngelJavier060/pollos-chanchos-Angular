import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface PlanAlimentacion {
  id?: number;
  name: string;
  description?: string;
  active?: boolean;
  createDate?: string;
  updateDate?: string;
  
  // Información del animal
  animalId?: number;
  animalName?: string;
  animalType?: string;
  
  // Información del usuario creador
  createdByUserId?: number;
  createdByUserName?: string;
  createdByUserEmail?: string;
  
  // Para compatibilidad con el código existente
  animal?: {
    id: number;
    name: string;
  };
  createdByUser?: {
    id: number;
    name: string;
  };
  detalles?: PlanDetalle[];
}

export interface PlanDetalle {
  id?: number;
  planAlimentacion?: PlanAlimentacion;
  dayStart: number;
  dayEnd: number;
  product: {
    id: number;
    name: string;
  };
  quantityPerAnimal: number;
  frequency: 'DIARIA' | 'INTERDIARIA' | 'SEMANAL';
  instructions?: string;
  createDate?: string;
  updateDate?: string;
}

export interface PlanAsignacion {
  id?: number;
  planAlimentacion: PlanAlimentacion;
  lote: {
    id: string;
    name: string;
  };
  assignedUser: {
    id: number;
    name: string;
  };
  assignedByUser?: {
    id: number;
    name: string;
  };
  startDate: string;
  endDate?: string;
  status: 'ACTIVO' | 'PAUSADO' | 'COMPLETADO' | 'CANCELADO';
  createDate?: string;
  updateDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanAlimentacionService {
  private apiUrl = `${environment.apiUrl}/api/plan-alimentacion`;
  private asignacionUrl = `${environment.apiUrl}/api/plan-asignacion`;

  constructor(private http: HttpClient) {}

  // ========== MÉTODOS PARA PLANES DE ALIMENTACIÓN ==========

  /**
   * Obtener todos los planes de alimentación
   */
  getAllPlanes(): Observable<PlanAlimentacion[]> {
    console.log('🔍 Llamando a getAllPlanes...');
    console.log('URL:', this.apiUrl);
    return this.http.get<PlanAlimentacion[]>(this.apiUrl);
  }

  /**
   * TEMPORAL: Obtener todos los planes incluyendo inactivos para debugging
   */
  getAllPlanesIncludingInactive(): Observable<PlanAlimentacion[]> {
    console.log('🔍 Llamando a getAllPlanesIncludingInactive...');
    return this.http.get<PlanAlimentacion[]>(`${this.apiUrl}/all-including-inactive`);
  }

  /**
   * Obtener planes por animal específico
   */
  getPlanesByAnimal(animalId: number): Observable<PlanAlimentacion[]> {
    return this.http.get<PlanAlimentacion[]>(`${this.apiUrl}/animal/${animalId}`);
  }

  /**
   * Obtener un plan específico con sus detalles
   */
  getPlanWithDetails(planId: number): Observable<PlanAlimentacion> {
    return this.http.get<PlanAlimentacion>(`${this.apiUrl}/${planId}`);
  }

  /**
   * Crear un nuevo plan de alimentación
   */
  createPlan(plan: PlanAlimentacion): Observable<PlanAlimentacion> {
    // Convertir el plan al formato DTO exacto que espera el backend
    const planRequest = {
      name: plan.name,
      description: plan.description || '', // Asegurar que no sea undefined
      animalId: plan.animal?.id || plan.animalId // Manejar ambos formatos
    };
    
    console.log('🚀 [PlanAlimentacionService] Creando plan con datos:', planRequest);
    console.log('🚀 URL:', this.apiUrl);
    
    return this.http.post<PlanAlimentacion>(this.apiUrl, planRequest).pipe(
      tap(response => console.log('✅ Plan creado exitosamente:', response)),
      catchError(error => {
        console.error('❌ Error creando plan:', error);
        throw error;
      })
    );
  }

  /**
   * Actualizar un plan existente
   */
  updatePlan(planId: number, plan: PlanAlimentacion): Observable<PlanAlimentacion> {
    // Convertir el plan al formato DTO exacto que espera el backend  
    const planUpdateRequest = {
      name: plan.name,
      description: plan.description || '', // Asegurar que no sea undefined
      animalId: plan.animal?.id || plan.animalId // Manejar ambos formatos
    };
    
    console.log('🔄 [PlanAlimentacionService] Actualizando plan ID:', planId);
    console.log('🔄 Datos de actualización:', planUpdateRequest);
    console.log('🔄 URL:', `${this.apiUrl}/${planId}`);
    
    return this.http.put<PlanAlimentacion>(`${this.apiUrl}/${planId}`, planUpdateRequest).pipe(
      tap(response => console.log('✅ Plan actualizado exitosamente:', response)),
      catchError(error => {
        console.error('❌ Error actualizando plan:', error);
        throw error;
      })
    );
  }

  /**
   * Desactivar un plan
   */
  deactivatePlan(planId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${planId}`);
  }

  /**
   * Eliminar permanentemente un plan (hard delete) - SOLO PARA DEBUG
   */
  hardDeletePlan(planId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${planId}/hard`);
  }

  // ========== MÉTODOS PARA DETALLES DEL PLAN ==========

  /**
   * Obtener detalles de un plan
   */
  getDetallesByPlan(planId: number): Observable<PlanDetalle[]> {
    return this.http.get<PlanDetalle[]>(`${this.apiUrl}/${planId}/detalles`);
  }

  /**
   * Agregar detalle a un plan
   */
  addDetalleToPlan(planId: number, detalle: PlanDetalle): Observable<PlanDetalle> {
    return this.http.post<PlanDetalle>(`${this.apiUrl}/${planId}/detalles`, detalle);
  }

  /**
   * Actualizar un detalle del plan
   */
  updateDetalle(planId: number, detalleId: number, detalle: PlanDetalle): Observable<PlanDetalle> {
    return this.http.put<PlanDetalle>(`${this.apiUrl}/${planId}/detalles/${detalleId}`, detalle);
  }

  /**
   * Eliminar un detalle del plan
   */
  removeDetalleFromPlan(planId: number, detalleId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${planId}/detalles/${detalleId}`);
  }

  // ========== MÉTODOS PARA ASIGNACIONES ==========

  /**
   * Crear una nueva asignación de plan
   */
  createAsignacion(asignacion: PlanAsignacion): Observable<PlanAsignacion> {
    return this.http.post<PlanAsignacion>(this.asignacionUrl, asignacion);
  }

  /**
   * Obtener asignaciones activas por usuario
   */
  getAsignacionesByUser(userId: number): Observable<PlanAsignacion[]> {
    return this.http.get<PlanAsignacion[]>(`${this.asignacionUrl}/usuario/${userId}`);
  }

  /**
   * Obtener mis asignaciones activas
   */
  getMisAsignaciones(): Observable<PlanAsignacion[]> {
    return this.http.get<PlanAsignacion[]>(`${this.asignacionUrl}/mis-asignaciones`);
  }

  /**
   * Obtener asignaciones para hoy
   */
  getAsignacionesParaHoy(userId: number): Observable<PlanAsignacion[]> {
    return this.http.get<PlanAsignacion[]>(`${this.asignacionUrl}/usuario/${userId}/hoy`);
  }

  /**
   * Obtener mis asignaciones para hoy
   */
  getMisAsignacionesParaHoy(): Observable<PlanAsignacion[]> {
    return this.http.get<PlanAsignacion[]>(`${this.asignacionUrl}/mis-asignaciones/hoy`);
  }

  /**
   * Obtener asignaciones por lote
   */
  getAsignacionesByLote(loteId: string): Observable<PlanAsignacion[]> {
    return this.http.get<PlanAsignacion[]>(`${this.asignacionUrl}/lote/${loteId}`);
  }

  /**
   * Actualizar el estado de una asignación
   */
  updateAsignacionStatus(asignacionId: number, nuevoStatus: string): Observable<PlanAsignacion> {
    return this.http.put<PlanAsignacion>(`${this.asignacionUrl}/${asignacionId}/estado`, nuevoStatus);
  }

  /**
   * Obtener asignaciones con detalles del plan
   */
  getAsignacionesWithPlanDetails(userId: number): Observable<PlanAsignacion[]> {
    return this.http.get<PlanAsignacion[]>(`${this.asignacionUrl}/usuario/${userId}/con-detalles`);
  }

  /**
   * Obtener mis asignaciones con detalles del plan
   */
  getMisAsignacionesWithPlanDetails(): Observable<PlanAsignacion[]> {
    return this.http.get<PlanAsignacion[]>(`${this.asignacionUrl}/mis-asignaciones/con-detalles`);
  }

  /**
   * Eliminar una asignación
   */
  deleteAsignacion(asignacionId: number): Observable<void> {
    return this.http.delete<void>(`${this.asignacionUrl}/${asignacionId}`);
  }

  // ========== MÉTODOS PARA CONSULTA DE ALIMENTACIÓN DIARIA ==========

  /**
   * Obtener productos para un día específico
   */
  getProductosParaDia(asignacionId: number, fecha: string): Observable<PlanDetalle[]> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<PlanDetalle[]>(`${this.apiUrl}/asignacion/${asignacionId}/productos-dia`, { params });
  }

  /**
   * Obtener productos para hoy
   */
  getProductosParaHoy(asignacionId: number): Observable<PlanDetalle[]> {
    return this.http.get<PlanDetalle[]>(`${this.apiUrl}/asignacion/${asignacionId}/productos-hoy`);
  }
}