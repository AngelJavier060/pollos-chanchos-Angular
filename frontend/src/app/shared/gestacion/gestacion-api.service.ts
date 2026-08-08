import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChanchaGestacion,
  RegistrarNoPrenadaPayload,
  RegistrarPartoPayload,
  RegistroNoPrenada,
  RegistroPartoGestacion
} from './gestacion-chancha.interface';

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class GestacionApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/gestacion`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  listar(): Observable<ChanchaGestacion[]> {
    return this.http.get<ApiResponse<ChanchaGestacion[]>>(this.baseUrl, this.httpOptions).pipe(
      map(res => {
        if (res.success === false) {
          throw new Error(res.message || 'Error al cargar gestaciones');
        }
        return Array.isArray(res.data) ? res.data : [];
      }),
      catchError(err => this.handleError(err))
    );
  }

  crear(chancha: Partial<ChanchaGestacion>): Observable<ChanchaGestacion> {
    return this.http
      .post<ApiResponse<ChanchaGestacion>>(this.baseUrl, this.toRequest(chancha), this.httpOptions)
      .pipe(
        map(res => this.extractData(res, 'Error al registrar gestación')),
        catchError(err => this.handleError(err))
      );
  }

  actualizar(id: string, chancha: Partial<ChanchaGestacion>): Observable<ChanchaGestacion> {
    return this.http
      .put<ApiResponse<ChanchaGestacion>>(
        `${this.baseUrl}/${id}`,
        this.toRequest(chancha),
        this.httpOptions
      )
      .pipe(
        map(res => this.extractData(res, 'Error al actualizar gestación')),
        catchError(err => this.handleError(err))
      );
  }

  reactivar(id: string): Observable<ChanchaGestacion> {
    return this.http
      .post<ApiResponse<ChanchaGestacion>>(`${this.baseUrl}/${id}/reactivar`, {}, this.httpOptions)
      .pipe(
        map(res => this.extractData(res, 'Error al reactivar gestación')),
        catchError(err => this.handleError(err))
      );
  }

  eliminar(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`, this.httpOptions)
      .pipe(
        map(res => {
          if (res.success === false) {
            throw new Error(res.message || 'Error al eliminar');
          }
        }),
        catchError(err => this.handleError(err))
      );
  }

  uploadFoto(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<ApiResponse<string> & { url?: string }>(`${this.baseUrl}/upload-foto`, formData)
      .pipe(
        map(res => {
          if (res.success === false) {
            throw new Error(res.message || 'Error al subir imagen');
          }
          const url = res.data || res.url;
          if (!url) throw new Error('No se recibió URL de imagen');
          return url;
        }),
        catchError(err => this.handleError(err))
      );
  }

  registrarParto(gestacionId: string, payload: RegistrarPartoPayload): Observable<RegistroPartoGestacion> {
    return this.http
      .post<ApiResponse<RegistroPartoGestacion>>(
        `${this.baseUrl}/${gestacionId}/parto`,
        payload,
        this.httpOptions
      )
      .pipe(
        map(res => this.extractData(res, 'Error al registrar parto')),
        catchError(err => this.handleError(err))
      );
  }

  registrarNoPrenada(
    gestacionId: string,
    payload: RegistrarNoPrenadaPayload
  ): Observable<RegistroNoPrenada> {
    return this.http
      .post<ApiResponse<RegistroNoPrenada>>(
        `${this.baseUrl}/${gestacionId}/no-prenada`,
        payload,
        this.httpOptions
      )
      .pipe(
        map(res => this.extractData(res, 'Error al registrar no gestante')),
        catchError(err => this.handleError(err))
      );
  }

  listarNoPrenadas(): Observable<RegistroNoPrenada[]> {
    return this.http
      .get<ApiResponse<RegistroNoPrenada[]>>(`${this.baseUrl}/no-prenadas`, this.httpOptions)
      .pipe(
        map(res => {
          if (res.success === false) {
            throw new Error(res.message || 'Error al cargar historial de no gestantes');
          }
          return Array.isArray(res.data) ? res.data : [];
        }),
        catchError(err => this.handleError(err))
      );
  }

  actualizarParto(partoId: string, payload: RegistrarPartoPayload): Observable<RegistroPartoGestacion> {
    return this.http
      .put<ApiResponse<RegistroPartoGestacion>>(
        `${this.baseUrl}/partos/${partoId}`,
        payload,
        this.httpOptions
      )
      .pipe(
        map(res => this.extractData(res, 'Error al actualizar parto')),
        catchError(err => this.handleError(err))
      );
  }

  listarPartos(loteId?: string, numeroEnLote?: number): Observable<RegistroPartoGestacion[]> {
    let params = new HttpParams();
    if (loteId && numeroEnLote != null) {
      params = params.set('loteId', loteId).set('numeroEnLote', String(numeroEnLote));
    }
    return this.http
      .get<ApiResponse<RegistroPartoGestacion[]>>(`${this.baseUrl}/partos`, {
        ...this.httpOptions,
        params
      })
      .pipe(
        map(res => {
          if (res.success === false) {
            throw new Error(res.message || 'Error al cargar historial de partos');
          }
          return Array.isArray(res.data) ? res.data : [];
        }),
        catchError(err => this.handleError(err))
      );
  }

  siguienteNumeroParto(loteId: string, numeroEnLote: number): Observable<number> {
    const params = new HttpParams()
      .set('loteId', loteId)
      .set('numeroEnLote', String(numeroEnLote));
    return this.http
      .get<ApiResponse<number>>(`${this.baseUrl}/siguiente-parto`, {
        ...this.httpOptions,
        params
      })
      .pipe(
        map(res => {
          if (res.success === false || res.data == null) {
            throw new Error(res.message || 'Error al obtener número de parto');
          }
          return Number(res.data) || 1;
        }),
        catchError(err => this.handleError(err))
      );
  }

  private toRequest(c: Partial<ChanchaGestacion> & { correccionAdmin?: boolean }) {
    return {
      loteId: c.loteId,
      numeroEnLote: c.numeroEnLote,
      fechaInseminacion: c.fechaInseminacion,
      numeroParto: c.numeroParto ?? 1,
      observaciones: c.observaciones ?? null,
      fotoUrl: c.fotoUrl ?? null,
      activa: c.activa !== false,
      correccionAdmin: c.correccionAdmin === true
    };
  }

  private extractData<T>(res: ApiResponse<T>, fallback: string): T {
    if (res.success === false || res.data === undefined) {
      throw new Error(res.message || fallback);
    }
    return res.data as T;
  }

  private handleError(err: unknown): Observable<never> {
    const e = err as { error?: { message?: string }; message?: string };
    const msg = e?.error?.message || e?.message || 'Error de conexión con el servidor';
    return throwError(() => new Error(msg));
  }
}
