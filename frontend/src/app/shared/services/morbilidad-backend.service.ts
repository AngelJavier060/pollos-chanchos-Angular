import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Interfaces para morbilidad
export interface RegistroMorbilidadRequest {
  loteId: string;
  fecha: string;
  hora: string;
  cantidadEnfermos: number;
  enfermedadId: number;
  sintomasObservados: string;
  gravedad: 'leve' | 'moderada' | 'severa';
  estadoTratamiento: 'en_observacion' | 'en_tratamiento' | 'recuperado' | 'movido_a_mortalidad';
  medicamentoId?: number;
  dosisAplicada?: string;
  fechaInicioTratamiento?: string;
  fechaFinTratamiento?: string;
  observacionesVeterinario: string;
  proximaRevision?: string;
  costo?: number;
  requiereAislamiento: boolean;
  contagioso: boolean;
  usuarioRegistro: string;
  animalesTratados: number;
}

// DTO para convertir morbilidad a mortalidad (debe coincidir con ConvertirMortalidadDTO del backend)
export interface ConvertirMortalidadRequest {
  loteId?: string;       // UUID del lote (preferido)
  loteCodigo?: string;   // Código del lote (fallback si no hay UUID)
  causaId: number;
  cantidad: number;
  observaciones?: string;
  peso?: number;
  edad?: number;
  ubicacion?: string;
  confirmado?: boolean;  // por defecto true si no se envía
  usuarioRegistro?: string;
}

export interface RegistroMorbilidadResponse {
  id: number;
  loteId: string;
  fecha: string;
  hora: string;
  cantidadEnfermos: number;
  enfermedad: {
    id: number;
    nombre: string;
    descripcion: string;
    contagiosa: boolean;
  };
  sintomasObservados: string;
  gravedad: string;
  estadoTratamiento: string;
  medicamento?: {
    id: number;
    nombre: string;
    tipo: string;
  };
  dosisAplicada: string;
  fechaInicioTratamiento: string;
  fechaFinTratamiento?: string;
  observacionesVeterinario: string;
  proximaRevision: string;
  costo: number;
  requiereAislamiento: boolean;
  contagioso: boolean;
  usuarioRegistro: string;
  fechaRegistro: Date;
  animalesTratados: number;
}

@Injectable({
  providedIn: 'root'
})
export class MorbilidadBackendService {
  private apiUrl = `${environment.apiUrl}/api/morbilidad`;

  constructor(private http: HttpClient) { }

  /**
   * ✅ REGISTRAR MORBILIDAD EN EL BACKEND
   */
  registrarMorbilidad(registro: RegistroMorbilidadRequest): Observable<any> {
    console.log('🔄 Registrando morbilidad en backend:', registro);
    // Mantener wrapper { success, data } para compatibilidad con consumidores actuales
    return this.http.post<any>(`${this.apiUrl}/registrar`, registro);
  }

  /**
   * ✅ OBTENER TODOS LOS REGISTROS
   */
  obtenerRegistros(): Observable<RegistroMorbilidadResponse[]> {
    return this.http.get<any>(`${this.apiUrl}/registros`).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data as RegistroMorbilidadResponse[] : res as RegistroMorbilidadResponse[])
    );
  }

  /**
   * ✅ OBTENER REGISTROS POR LOTE
   */
  obtenerRegistrosPorLote(loteId: string): Observable<RegistroMorbilidadResponse[]> {
    return this.http.get<any>(`${this.apiUrl}/lote/${loteId}`).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data as RegistroMorbilidadResponse[] : res as RegistroMorbilidadResponse[])
    );
  }

  /**
   * ✅ OBTENER ENFERMEDADES
   */
  obtenerEnfermedades(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/enfermedades`).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data as any[] : res as any[])
    );
  }

  /**
   * ✅ OBTENER MEDICAMENTOS
   */
  obtenerMedicamentos(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/medicamentos`).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data as any[] : res as any[])
    );
  }

  /**
   * ✅ ACTUALIZAR ESTADO DE TRATAMIENTO
   */
  actualizarEstadoTratamiento(id: number, estado: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/estado`, null, { params: { estado } }).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data : res)
    );
  }

  /**
   * ✅ MARCAR COMO RECUPERADO
   */
  marcarComoRecuperado(id: number, costo?: number): Observable<any> {
    const params: any = {};
    if (typeof costo === 'number' && !isNaN(costo)) params.costo = costo;
    return this.http.patch<any>(`${this.apiUrl}/${id}/recuperar`, null, { params }).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data : res)
    );
  }

  actualizarCosto(id: number, costo: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/costo`, null, { params: { costo } }).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data : res)
    );
  }

  /**
   * ✅ MOVER A MORTALIDAD
   */
  moverAMortalidad(id: number, body: ConvertirMortalidadRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/convertir-a-mortalidad`, body).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res) ? res.data : res)
    );
  }

  /**
   * ✅ ELIMINAR REGISTRO
   */
  eliminarRegistro(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * ✅ CONTAR ENFERMOS POR LOTE (usa el endpoint /lote/{loteId}/contar)
   */
  contarEnfermosPorLote(loteIdNumerico: number): Observable<{ totalEnfermos: number; enfermosActivos: number }> {
    return this.http.get<any>(`${this.apiUrl}/lote/${loteIdNumerico}/contar`).pipe(
      map(res => (res && typeof res === 'object' && 'data' in res)
        ? (res.data as { totalEnfermos: number; enfermosActivos: number })
        : { totalEnfermos: 0, enfermosActivos: 0 })
    );
  }
}
