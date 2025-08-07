import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface InventarioAlimento {
  id: number;
  tipoAlimento: {
    id: number;
    name: string;
  };
  cantidadStock: number;
  cantidadOriginal?: number; // Para mostrar la cantidad inicial
  unidadMedida: string;
  stockMinimo: number;
  observaciones: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface MovimientoInventario {
  id: number;
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'CONSUMO_LOTE' | 'AJUSTE_INVENTARIO' | 'MERMA';
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  loteId?: string; // Cambiado a string para UUID
  observaciones: string;
  usuarioRegistro: string;
  fechaMovimiento: string;
}

export interface RegistroConsumoRequest {
  loteId: string; // Cambiado a string para UUID
  tipoAlimentoId: number;
  cantidadKg: number;
  observaciones?: string;
}

export interface RegistroConsumoResponse {
  success: boolean;
  message: string;
  movimientoId: number;
  stockAnterior: number;
  stockNuevo: number;
  cantidadConsumida: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  
  private apiUrl = `${environment.apiUrl}/api/plan-alimentacion`;

  constructor(private http: HttpClient) { }

  /**
   * Registrar consumo de alimento con deducción automática de inventario
   */
  registrarConsumoAlimento(request: RegistroConsumoRequest): Observable<RegistroConsumoResponse> {
    console.log('🍽️ InventarioService: registrarConsumoAlimento', request);
    return this.http.post<RegistroConsumoResponse>(`${this.apiUrl}/registrar-consumo`, request);
  }

  /**
   * Obtener inventarios disponibles
   */
  obtenerInventarios(): Observable<InventarioAlimento[]> {
    return this.http.get<InventarioAlimento[]>(`${this.apiUrl}/inventarios`);
  }

  /**
   * Obtener movimientos de inventario por lote
   */
  obtenerMovimientosPorLote(loteId: string): Observable<MovimientoInventario[]> {
    return this.http.get<MovimientoInventario[]>(`${this.apiUrl}/movimientos/lote/${loteId}`);
  }

  /**
   * Obtener total consumido por lote y tipo de alimento
   */
  obtenerTotalConsumidoPorLote(loteId: string, tipoAlimentoId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/consumo-total/lote/${loteId}/alimento/${tipoAlimentoId}`);
  }

  /**
   * Obtener inventarios con stock bajo (alertas)
   */
  obtenerInventariosStockBajo(): Observable<InventarioAlimento[]> {
    return this.http.get<InventarioAlimento[]>(`${this.apiUrl}/inventarios/stock-bajo`);
  }

  /**
   * Crear datos de ejemplo para el inventario (solo para pruebas)
   */
  crearDatosEjemplo(): Observable<any> {
    return this.http.post(`${this.apiUrl}/inventarios/crear-datos-ejemplo`, {});
  }
}
