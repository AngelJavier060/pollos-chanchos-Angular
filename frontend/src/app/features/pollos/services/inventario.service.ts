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
  tipoAlimentoId?: number;
  productId?: number; // Opcional: descuento específico por producto
  cantidadKg: number;
  observaciones?: string;
  fecha?: string; // yyyy-MM-dd (opcional) para registrar como fecha_movimiento
}

export interface RegistroConsumoResponse {
  success: boolean;
  message?: string;
  movimientoId?: number;
  stockAnterior?: number;
  stockNuevo?: number;
  cantidadConsumida?: number;
  cantidadPendiente?: number;
  bloqueoPorVencido?: boolean;
  detalles?: any;
  error?: string;
}

export interface ProductoConsumido {
  nombre: string;
  cantidad: number;
  unidad: string;
  productoId?: number;
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
   * Obtener detalle de productos consumidos por lote para un registro específico
   * @param loteId ID del lote
   * @param fechaHora Fecha/hora del registro (formato ISO: yyyy-MM-ddTHH:mm:ss)
   */
  obtenerConsumosDetallePorLote(loteId: string, fechaHora?: string): Observable<ProductoConsumido[]> {
    let url = `${this.apiUrl}/consumos-detalle/lote/${loteId}`;
    if (fechaHora) {
      url += `?fechaHora=${encodeURIComponent(fechaHora)}`;
    }
    console.log('📦 Consultando consumos detalle:', { loteId, fechaHora });
    return this.http.get<ProductoConsumido[]>(url);
  }

  /**
   * Crear datos de ejemplo para el inventario (solo para pruebas)
   */
  crearDatosEjemplo(): Observable<any> {
    return this.http.post(`${this.apiUrl}/inventarios/crear-datos-ejemplo`, {});
  }
}
