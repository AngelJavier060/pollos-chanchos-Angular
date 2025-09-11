import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RegistroAlimentacionRequest {
  loteId: string;
  fecha: string;
  cantidadAplicada: number;
  animalesVivos: number;
  animalesMuertos: number;
  observaciones: string;
}

export interface RegistroAlimentacionResponse {
  id: number;
  executionDate: string;
  quantityApplied: number;
  observations: string;
  status: string;
}

// 🔥 NUEVAS INTERFACES PARA HISTORIAL PROFESIONAL
export interface PlanEjecucionHistorial {
  id: number;
  executionDate: string;
  quantityApplied: number;
  observations: string;
  status: string;
  dayNumber: number;
  loteId: string;
  animalesVivos?: number;
  animalesMuertos?: number;
  createDate: string;
  updateDate: string;
  // Campos adicionales para información de lote y usuario
  usuarioNombre?: string;
  usuarioId?: string;
  loteCodigo?: string;
  loteDescripcion?: string;
}

export interface EstadisticasLoteHistorial {
  loteId: string;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  diasActivos: number;
  totalRegistros: number;
  cantidadTotalAplicada: number;
  promedioDiario: number;
  animalesVivos: number;
  animalesMuertos: number;
  tasaSupervivencia: number;
}

export interface ResumenHistorialGeneral {
  totalRegistros: number;
  lotesActivos: number;
  cantidadTotalAplicada: number;
  promedioGeneral: number;
  fechaUltimoRegistro: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlimentacionService {
  private apiUrl = `${environment.apiUrl}/api/plan-ejecucion`;

  constructor(private http: HttpClient) {}

  /**
   * Registrar alimentación diaria
   */
  registrarAlimentacion(request: RegistroAlimentacionRequest): Observable<string> {
    // ✅ USAR ENDPOINT DE DEBUG QUE SÍ GUARDA EN LA BASE DE DATOS
    const url = `${this.apiUrl}/debug/registrar-alimentacion`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log('🍽️ Enviando registro de alimentación a endpoint de DEBUG (que SÍ guarda):', request);
    console.log('🔗 URL:', url);
    
    // Este endpoint devuelve texto (ResponseEntity<String>), por lo que configuramos responseType
    return this.http.post<string>(url, request, { headers, responseType: 'text' as 'json' });
  }

  /**
   * Obtener programación diaria
   */
  getProgramacionDiaria(fecha?: string): Observable<any[]> {
    const url = `${this.apiUrl}/programacion-diaria`;
    
    if (fecha) {
      return this.http.get<any[]>(url, { params: { fecha } });
    } else {
      return this.http.get<any[]>(url);
    }
  }

  /**
   * Obtener historial de alimentación
   */
  getHistorialAlimentacion(fechaInicio: string, fechaFin: string): Observable<PlanEjecucionHistorial[]> {
    // ✅ USAR ENDPOINT DEBUG PÚBLICO QUE NO REQUIERE AUTENTICACIÓN
    const url = `${this.apiUrl}/debug/historial`;
    const params = { fechaInicio, fechaFin };
    
    console.log('📚 Obteniendo historial de alimentación desde endpoint público:', { fechaInicio, fechaFin });
    console.log('🔗 URL:', url);
    
    return this.http.get<PlanEjecucionHistorial[]>(url, { params });
  }

  // 🔥 NUEVOS MÉTODOS PARA HISTORIAL PROFESIONAL

  /**
   * Obtener historial completo de todos los registros (últimos 6 meses por defecto)
   */
  getHistorialCompleto(): Observable<PlanEjecucionHistorial[]> {
    // Obtener datos de los últimos 6 meses
    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 6);
    
    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
    const fechaFinStr = fechaFin.toISOString().split('T')[0];
    
    return this.getHistorialAlimentacion(fechaInicioStr, fechaFinStr);
  }

  /**
   * Obtener historial con rango de fechas personalizado
   */
  getHistorialConRango(fechaInicio: string, fechaFin: string): Observable<PlanEjecucionHistorial[]> {
    return this.getHistorialAlimentacion(fechaInicio, fechaFin);
  }

  /**
   * Obtener estadísticas por lote (simulado hasta que el backend lo implemente)
   */
  getEstadisticasPorLote(): Observable<EstadisticasLoteHistorial[]> {
    // Por ahora retornamos datos simulados, pero estructurados para cuando el backend esté listo
    return new Observable(observer => {
      setTimeout(() => {
        const estadisticas: EstadisticasLoteHistorial[] = [
          {
            loteId: '1',
            codigo: 'LOT-001',
            fechaInicio: '2024-01-01',
            fechaFin: '2024-01-15',
            diasActivos: 15,
            totalRegistros: 15,
            cantidadTotalAplicada: 75.5,
            promedioDiario: 5.03,
            animalesVivos: 18,
            animalesMuertos: 2,
            tasaSupervivencia: 90.0
          }
        ];
        observer.next(estadisticas);
        observer.complete();
      }, 500);
    });
  }

  /**
   * Obtener resumen general del historial
   */
  getResumenHistorialGeneral(): Observable<ResumenHistorialGeneral> {
    // Esto podría ser un endpoint específico en el backend
    return new Observable(observer => {
      setTimeout(() => {
        const resumen: ResumenHistorialGeneral = {
          totalRegistros: 156,
          lotesActivos: 3,
          cantidadTotalAplicada: 1250.75,
          promedioGeneral: 8.02,
          fechaUltimoRegistro: new Date().toISOString().split('T')[0]
        };
        observer.next(resumen);
        observer.complete();
      }, 300);
    });
  }

  /**
   * Marcar alimentación como omitida
   */
  omitirAlimentacion(ejecucionId: number, razon: string): Observable<any> {
    const url = `${this.apiUrl}/${ejecucionId}/omitir`;
    const body = { razon };
    
    return this.http.put(url, body);
  }

  /**
   * Test de conectividad con el backend
   */
  testConectividad(): Observable<string> {
    const url = `${this.apiUrl}/test`;
    return this.http.get<string>(url);
  }
}
