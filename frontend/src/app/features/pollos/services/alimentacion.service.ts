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

@Injectable({
  providedIn: 'root'
})
export class AlimentacionService {
  private apiUrl = `${environment.apiUrl}/api/plan-ejecucion`;

  constructor(private http: HttpClient) {}

  /**
   * Registrar alimentación diaria
   */
  registrarAlimentacion(request: RegistroAlimentacionRequest): Observable<RegistroAlimentacionResponse> {
    // ✅ TEMPORAL: Usar endpoint público que no requiere autenticación
    const url = `${this.apiUrl}/debug/registrar-alimentacion`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log('🍽️ Enviando registro de alimentación a endpoint público:', request);
    console.log('🔗 URL:', url);
    
    return this.http.post<RegistroAlimentacionResponse>(url, request, { headers });
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
  getHistorialAlimentacion(fechaInicio: string, fechaFin: string): Observable<any[]> {
    const url = `${this.apiUrl}/historial`;
    const params = { fechaInicio, fechaFin };
    
    return this.http.get<any[]>(url, { params });
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
