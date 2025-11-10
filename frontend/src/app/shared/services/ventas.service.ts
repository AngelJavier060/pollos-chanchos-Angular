import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VentaHuevoDTO {
  fecha: string;        // yyyy-MM-dd
  loteId: string;       // UUID o código como string
  loteCodigo?: string;
  animalId?: number;
  animalName?: string;
  cantidad: number;
  precioUnit: number;
  total?: number;
}

export interface VentaAnimalDTO {
  fecha: string;
  loteId: string;
  loteCodigo?: string;
  animalId?: number;
  animalName?: string;
  cantidad: number;
  precioUnit: number;
  total?: number;
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  crearVentaHuevo(body: VentaHuevoDTO): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ventas/huevos`, body);
    }

  crearVentaAnimal(body: VentaAnimalDTO): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ventas/animales`, body);
  }

  listarVentasHuevos(from?: string, to?: string): Observable<any[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<any[]>(`${this.baseUrl}/api/ventas/huevos`, { params });
  }

  listarVentasAnimales(from?: string, to?: string): Observable<any[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<any[]>(`${this.baseUrl}/api/ventas/animales`, { params });
  }

  listarVentasAnimalesPorLote(loteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/ventas/animales/lote/${loteId}`);
  }

  listarVentasAnimalesPorLoteEmitidas(loteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/ventas/animales/lote/${loteId}/emitidas`);
  }

  // --- Huevos: update/delete ---
  actualizarVentaHuevo(id: number, body: Partial<VentaHuevoDTO>): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/ventas/huevos/${id}`, body);
  }

  eliminarVentaHuevo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/ventas/huevos/${id}`);
  }

  // --- Animales: update/delete (requiere endpoints en backend) ---
  actualizarVentaAnimal(id: number, body: Partial<VentaAnimalDTO>): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/ventas/animales/${id}`, body);
  }

  eliminarVentaAnimal(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/ventas/animales/${id}`);
  }
}
