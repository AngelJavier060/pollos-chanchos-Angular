import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Interfaces para mortalidad
export interface RegistroMortalidadRequest {
  loteId: string;
  cantidadMuertos: number;
  causaId: number;
  observaciones: string;
  peso?: number;
  edad?: number;
  ubicacion?: string;
  confirmado?: boolean;
  usuarioRegistro: string;
}

export interface RegistroMortalidadResponse {
  id: number;
  loteId: string;
  cantidadMuertos: number;
  causa: {
    id: number;
    nombre: string;
    descripcion: string;
    color: string;
  };
  observaciones: string;
  peso: number;
  edad: number;
  ubicacion: string;
  confirmado: boolean;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

@Injectable({
  providedIn: 'root'
})
export class MortalidadBackendService {
  private apiUrl = `${environment.apiUrl}/api/mortalidad`;

  constructor(private http: HttpClient) { }

  /**
   * ✅ REGISTRAR MORTALIDAD EN EL BACKEND
   */
  registrarMortalidad(registro: RegistroMortalidadRequest): Observable<any> {
    console.log('🔄 Registrando mortalidad en backend:', registro);
    return this.http.post(`${this.apiUrl}/registrar`, registro);
  }

  /**
   * ✅ OBTENER TODOS LOS REGISTROS
   */
  obtenerRegistros(): Observable<RegistroMortalidadResponse[]> {
    return this.http.get<any>(`${this.apiUrl}/registros`).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data as RegistroMortalidadResponse[] : res as RegistroMortalidadResponse[])
    );
  }

  /**
   * ✅ OBTENER REGISTROS POR LOTE
   */
  obtenerRegistrosPorLote(loteId: string): Observable<RegistroMortalidadResponse[]> {
    return this.http.get<any>(`${this.apiUrl}/lote/${loteId}`).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data as RegistroMortalidadResponse[] : res as RegistroMortalidadResponse[])
    );
  }

  /**
   * ✅ OBTENER CAUSAS DE MORTALIDAD
   */
  obtenerCausas(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/causas`).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data as any[] : res as any[])
    );
  }

  /**
   * ✅ CONFIRMAR REGISTRO
   */
  confirmarRegistro(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/confirmar`, {}).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data : res)
    );
  }

  /**
   * ✅ ELIMINAR REGISTRO
   */
  eliminarRegistro(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
