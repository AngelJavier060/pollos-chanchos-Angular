import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';

export interface InventarioProductoFront {
  id: number;
  product: Product;
  cantidadStock: number;
  unidadMedida?: string;
  stockMinimo?: number;
  costoUnitarioPromedio?: number;
  activo?: boolean;
  createDate?: string;
  updateDate?: string;
}

export type TipoMovimientoProducto = 'ENTRADA' | 'SALIDA' | 'CONSUMO_LOTE' | 'AJUSTE';

export interface MovimientoProductoRequest {
  productId: number;
  tipo: TipoMovimientoProducto;
  cantidad: number;
  costoUnitario?: number;
  loteId?: string;
  usuario?: string;
  observaciones?: string;
}

export interface MovimientoProductoResponse {
  id: number;
  tipoMovimiento: TipoMovimientoProducto;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  costoUnitario?: number;
  costoTotal?: number;
  fechaMovimiento: string;
}

@Injectable({ providedIn: 'root' })
export class InventarioProductoFrontService {
  private apiUrl = `${environment.apiUrl}/api/inventario-producto`;

  constructor(private http: HttpClient) {}

  listar(): Observable<InventarioProductoFront[]> {
    return this.http.get<InventarioProductoFront[]>(`${this.apiUrl}`);
    }

  porProducto(productId: number): Observable<InventarioProductoFront> {
    return this.http.get<InventarioProductoFront>(`${this.apiUrl}/producto/${productId}`);
  }

  registrarMovimiento(req: MovimientoProductoRequest): Observable<MovimientoProductoResponse> {
    return this.http.post<MovimientoProductoResponse>(`${this.apiUrl}/movimientos`, req);
  }

  // Sincronizar inventarios: crear faltantes y registrar entradas iniciales
  sincronizar(soloAlimentos: boolean = true): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sincronizar?soloAlimentos=${soloAlimentos}`, {});
  }

  // Listar movimientos por producto
  listarMovimientos(productId: number): Observable<MovimientoProductoResponse[]> {
    return this.http.get<MovimientoProductoResponse[]>(`${this.apiUrl}/movimientos/${productId}`);
  }

  // Agregado: disminución agrupada (SALIDA + CONSUMO_LOTE) por producto
  disminucionAgrupada(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/disminucion`);
  }
}
