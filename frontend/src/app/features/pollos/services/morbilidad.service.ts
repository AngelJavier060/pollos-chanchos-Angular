import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { 
  RegistroMorbilidad, 
  EstadisticasMorbilidad, 
  AlertaMorbilidad,
  Enfermedad,
  EstadoEnfermedad,
  Tratamiento
} from '../models/morbilidad.model';

@Injectable({
  providedIn: 'root'
})
export class MorbilidadService {
  private readonly API_URL = `${environment.apiUrl}/morbilidad`;
  
  private morbilidadSubject = new BehaviorSubject<RegistroMorbilidad[]>([]);
  public morbilidad$ = this.morbilidadSubject.asObservable();

  constructor(private http: HttpClient) {}


  /**
   * Obtener todos los registros de morbilidad
   */
  getRegistrosMorbilidad(filtros?: any): Observable<RegistroMorbilidad[]> {
    return this.http.get<RegistroMorbilidad[]>(`${this.API_URL}/registros`, { params: filtros });
  }

  /**
   * Obtener registros activos (no recuperados ni fallecidos)
   */
  getRegistrosActivos(): Observable<RegistroMorbilidad[]> {
    return this.http.get<RegistroMorbilidad[]>(`${this.API_URL}/activos`);
  }

  /**
   * Obtener registros por lote
   */
  getRegistrosPorLote(loteId: number): Observable<RegistroMorbilidad[]> {
    return this.http.get<RegistroMorbilidad[]>(`${this.API_URL}/lote/${loteId}`);
  }

  /**
   * Registrar nueva morbilidad
   */
  registrarMorbilidad(registro: RegistroMorbilidad): Observable<RegistroMorbilidad> {
    return this.http.post<RegistroMorbilidad>(`${this.API_URL}/registrar`, registro);
  }

  /**
   * Actualizar registro de morbilidad
   */
  actualizarRegistro(id: number, registro: Partial<RegistroMorbilidad>): Observable<RegistroMorbilidad> {
    return this.http.put<RegistroMorbilidad>(`${this.API_URL}/${id}`, registro);
  }

  /**
   * Cambiar estado de un registro
   */
  cambiarEstado(id: number, nuevoEstado: EstadoEnfermedad, observaciones?: string): Observable<RegistroMorbilidad> {
    return this.http.patch<RegistroMorbilidad>(`${this.API_URL}/${id}/estado`, {
      estado: nuevoEstado,
      observaciones
    });
  }

  /**
   * Asignar tratamiento a un registro
   */
  asignarTratamiento(id: number, tratamiento: Tratamiento): Observable<RegistroMorbilidad> {
    return this.http.patch<RegistroMorbilidad>(`${this.API_URL}/${id}/tratamiento`, {
      tratamiento
    });
  }

  /**
   * Eliminar registro de morbilidad
   */
  eliminarRegistro(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtener estadísticas de morbilidad
   */
  getEstadisticas(fechaInicio?: Date, fechaFin?: Date): Observable<EstadisticasMorbilidad> {
    const params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio.toISOString().split('T')[0];
    if (fechaFin) params.fechaFin = fechaFin.toISOString().split('T')[0];
    
    return this.http.get<EstadisticasMorbilidad>(`${this.API_URL}/estadisticas`, { params });
  }

  /**
   * Obtener alertas de morbilidad
   */
  getAlertas(): Observable<AlertaMorbilidad[]> {
    return this.http.get<AlertaMorbilidad[]>(`${this.API_URL}/alertas`);
  }

  /**
   * Marcar alerta como leída
   */
  marcarAlertaLeida(id: number): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/alertas/${id}/leer`, {});
  }

  /**
   * Obtener enfermedades disponibles
   */
  getEnfermedades(): Observable<Enfermedad[]> {
    return this.http.get<Enfermedad[]>(`${this.API_URL}/enfermedades`);
  }

  /**
   * Obtener estados de enfermedad disponibles
   */
  getEstados(): Observable<EstadoEnfermedad[]> {
    return this.http.get<EstadoEnfermedad[]>(`${this.API_URL}/estados`);
  }

  /**
   * Obtener tratamientos disponibles
   */
  getTratamientos(): Observable<Tratamiento[]> {
    return this.http.get<Tratamiento[]>(`${this.API_URL}/medicamentos`);
  }

  /**
   * Obtener morbilidad activa (casos no resueltos)
   */
  getMorbilidadActiva(): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/activos/count`);
  }

  /**
   * Transferir registro a mortalidad (cuando un enfermo muere)
   */
  transferirAMortalidad(id: number): Observable<any> {
    return this.http.post(`${this.API_URL}/${id}/transferir-mortalidad`, {});
  }
}
