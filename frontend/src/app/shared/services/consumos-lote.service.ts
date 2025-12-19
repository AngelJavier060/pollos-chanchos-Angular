import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConsumoProductoLote {
  productoId: number;
  productoNombre: string;
  loteId: string;
  loteCodigo: string;
  totalConsumo: number;
  registros: number;
  ultimaFecha: string;
}

export interface RegistroConsumoLote {
  id: number;
  fecha: string;
  productoNombre: string;
  cantidad: number;
  loteId: string;
  loteCodigo: string;
  usuarioNombre?: string;
  observaciones?: string;
}

export interface ConsumosPorLote {
  loteId: string;
  loteCodigo: string;
  totalConsumo: number;
  productos: ConsumoProductoLote[];
  historial: RegistroConsumoLote[];
}

@Injectable({ providedIn: 'root' })
export class ConsumosLoteService {
  private apiUrl = `${environment.apiUrl}/api/consumos-lote`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener consumos agrupados por lote desde inventario_entrada_producto
   */
  getConsumosPorLote(especie: string = 'chanchos'): Observable<ConsumosPorLote[]> {
    return this.http.get<ConsumosPorLote[]>(`${this.apiUrl}?especie=${especie}`);
  }

  /**
   * Obtener consumos de un lote específico
   */
  getConsumosLoteEspecifico(loteId: string): Observable<ConsumosPorLote> {
    return this.http.get<ConsumosPorLote>(`${this.apiUrl}/${loteId}`);
  }

  /**
   * Obtener historial detallado de consumos por lote
   */
  getHistorialConsumos(loteId: string, fechaInicio?: string, fechaFin?: string): Observable<RegistroConsumoLote[]> {
    let url = `${this.apiUrl}/${loteId}/historial`;
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    
    return this.http.get<RegistroConsumoLote[]>(`${url}?${params.toString()}`);
  }
}
