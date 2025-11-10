import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';

export interface InventarioEntrada {
  id: number;
  product: Product;
  provider?: any;
  codigoLote?: string;
  fechaIngreso?: string; // ISO
  fechaVencimiento?: string; // ISO
  unidadControl?: string;
  contenidoPorUnidad?: number; // en unidad base (kg/g/ml)
  cantidadUnidades?: number;
  costoUnitarioBase?: number;
  costoPorUnidadControl?: number;
  stockUnidadesRestantes?: number;
  stockBaseRestante?: number;
  activo?: boolean;
  observaciones?: string;
}

export interface CrearEntradaRequest {
  productId: number;
  codigoLote?: string;
  fechaIngreso?: string;        // ISO opcional
  fechaVencimiento?: string;    // ISO opcional
  unidadControl?: string;       // frasco/saco/sobre/unidad
  contenidoPorUnidadBase: number; // en unidad base (kg/g/ml)
  cantidadUnidades: number;
  observaciones?: string;
  providerId?: number;
  costoUnitarioBase?: number;
  costoPorUnidadControl?: number;
}

export interface ActualizarEntradaRequest {
  codigoLote?: string;
  fechaIngreso?: string;       // ISO
  fechaVencimiento?: string;   // ISO
  unidadControl?: string;
  observaciones?: string;
  providerId?: number;
  costoUnitarioBase?: number;
  costoPorUnidadControl?: number;
  contenidoPorUnidadBase?: number;
  cantidadUnidades?: number;
}

@Injectable({ providedIn: 'root' })
export class InventarioEntradasService {
  private apiUrl = `${environment.apiUrl}/api/inventario-entradas`;

  constructor(private http: HttpClient) {}

  crearEntrada(req: CrearEntradaRequest): Observable<InventarioEntrada> {
    return this.http.post<InventarioEntrada>(`${this.apiUrl}`, req);
  }

  listarPorProducto(productId: number): Observable<InventarioEntrada[]> {
    return this.http.get<InventarioEntrada[]>(`${this.apiUrl}?productId=${productId}`);
  }

  vencidas(productId?: number): Observable<InventarioEntrada[]> {
    const url = productId ? `${this.apiUrl}/vencidas?productId=${productId}` : `${this.apiUrl}/vencidas`;
    return this.http.get<InventarioEntrada[]>(url);
  }

  porVencer(productId?: number, dias: number = 15): Observable<InventarioEntrada[]> {
    const url = productId ? `${this.apiUrl}/por-vencer?productId=${productId}&dias=${dias}` : `${this.apiUrl}/por-vencer?dias=${dias}`;
    return this.http.get<InventarioEntrada[]>(url);
  }

  // Agregado: stock válido agrupado por producto (productId -> cantidad base disponible)
  stockValidoAgrupado(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/stock-valido`);
  }

  actualizarEntrada(id: number, req: ActualizarEntradaRequest): Observable<InventarioEntrada> {
    return this.http.put<InventarioEntrada>(`${this.apiUrl}/${id}`, req);
  }

  eliminarEntrada(id: number, observacion?: string): Observable<InventarioEntrada> {
    const url = observacion ? `${this.apiUrl}/${id}?observacion=${encodeURIComponent(observacion)}` : `${this.apiUrl}/${id}`;
    return this.http.delete<InventarioEntrada>(url);
  }
}
