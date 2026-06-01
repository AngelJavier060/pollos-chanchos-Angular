import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChanchaGestacion } from './gestacion-chancha.interface';

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

  private toRequest(c: Partial<ChanchaGestacion>) {
    return {
      loteId: c.loteId,
      numeroEnLote: c.numeroEnLote,
      fechaInseminacion: c.fechaInseminacion,
      numeroParto: c.numeroParto ?? 1,
      observaciones: c.observaciones ?? null,
      activa: c.activa !== false
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
