import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConsumoManualRequest {
  loteId: string;
  fecha?: string; // ISO date
  nombreProductoId?: number;
  nombreLibre?: string;
  unidadMedida: string; // kg, g, ml, L, unidad
  cantidad?: number; // total
  cantidadPorAnimal?: number; // opcional
  animalesVivos?: number; // opcional
  costoUnitario?: number; // opcional
  costoTotal?: number; // opcional
  observaciones?: string;
}

export interface ConsumoManualResponse {
  id: number;
  loteId: string;
  fecha: string;
  nombreProducto?: { id: number; nombre: string } | null;
  nombreLibre?: string | null;
  unidadMedida: string;
  cantidad: number;
  costoUnitario?: number | null;
  costoTotal?: number | null;
  observaciones?: string | null;
  usuarioRegistro?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ConsumoManualServiceFront {
  private baseUrl = `${environment.apiUrl}/api/consumos/manual`;

  constructor(private http: HttpClient) {}

  registrarConsumo(body: ConsumoManualRequest): Observable<ConsumoManualResponse> {
    return this.http.post<ConsumoManualResponse>(this.baseUrl, body);
    }

  listarConsumos(loteId: string, inicio?: string, fin?: string): Observable<ConsumoManualResponse[]> {
    const params: any = { loteId };
    if (inicio) params.inicio = inicio;
    if (fin) params.fin = fin;
    return this.http.get<ConsumoManualResponse[]>(this.baseUrl, { params });
  }
}
