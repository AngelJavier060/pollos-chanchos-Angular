import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AlertaRapida {
  fechaObjetivo: string; // ISO date
  diaDeVida: number;
  asignacionId: number;
  loteId: string | null;
  loteCodigo: string | null;
  planDetalleId: number;
  productId: number | null;
  productName: string | null;
  tipo: string; // evento_unico
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class PlanEjecucionServiceFront {
  private baseUrl = `${environment.apiUrl}/api/plan-ejecucion`;

  constructor(private http: HttpClient) {}

  getAlertas(dias?: number, fechaBase?: string): Observable<AlertaRapida[]> {
    let params = new HttpParams();
    if (dias != null) params = params.set('dias', String(dias));
    if (fechaBase) params = params.set('fechaBase', fechaBase);
    return this.http.get<AlertaRapida[]>(`${this.baseUrl}/alertas`, { params });
  }
}
