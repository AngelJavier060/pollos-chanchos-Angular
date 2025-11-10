import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CostosSanidadService {
  private apiUrl = `${environment.apiUrl}/api/costos/sanidad`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  crear(body: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, body, this.httpOptions).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  listar(options: { desde?: string; hasta?: string; loteId?: string; loteCodigo?: string } = {}): Observable<any[]> {
    let params = new HttpParams();
    if (options.desde) params = params.set('desde', options.desde);
    if (options.hasta) params = params.set('hasta', options.hasta);
    if (options.loteId) params = params.set('loteId', options.loteId);
    if (options.loteCodigo) params = params.set('loteCodigo', options.loteCodigo);
    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  actualizar(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, body, this.httpOptions).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.httpOptions).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ha ocurrido un error en la operación.';
    if (typeof error.error === 'string') {
      errorMessage = error.error;
    } else if (error.status === 0) {
      errorMessage = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
    } else if (error.status === 500) {
      errorMessage = 'Error interno del servidor. Por favor, inténtelo más tarde.';
    } else if ((error.error as any)?.message) {
      errorMessage = (error.error as any).message;
    }
    return throwError(() => new Error(errorMessage));
  }
}
