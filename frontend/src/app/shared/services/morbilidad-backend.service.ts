import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.post(`${this.apiUrl}/registrar`, registro);
  }

  /**
   * ✅ OBTENER TODOS LOS REGISTROS
   */
  obtenerRegistros(): Observable<RegistroMorbilidadResponse[]> {
    return this.http.get<RegistroMorbilidadResponse[]>(`${this.apiUrl}/todos`);
  }

  /**
   * ✅ OBTENER REGISTROS POR LOTE
   */
  obtenerRegistrosPorLote(loteId: string): Observable<RegistroMorbilidadResponse[]> {
    return this.http.get<RegistroMorbilidadResponse[]>(`${this.apiUrl}/lote/${loteId}`);
  }

  /**
   * ✅ OBTENER ENFERMEDADES
   */
  obtenerEnfermedades(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/enfermedades`);
  }

  /**
   * ✅ OBTENER MEDICAMENTOS
   */
  obtenerMedicamentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/medicamentos`);
  }

  /**
   * ✅ ACTUALIZAR ESTADO DE TRATAMIENTO
   */
  actualizarEstadoTratamiento(id: number, estado: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/estado`, { estadoTratamiento: estado });
  }

  /**
   * ✅ MARCAR COMO RECUPERADO
   */
  marcarComoRecuperado(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/recuperado`, {});
  }

  /**
   * ✅ MOVER A MORTALIDAD
   */
  moverAMortalidad(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/mortalidad`, {});
  }

  /**
   * ✅ ELIMINAR REGISTRO
   */
  eliminarRegistro(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
