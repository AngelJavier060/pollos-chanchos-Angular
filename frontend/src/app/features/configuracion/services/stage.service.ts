import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Stage } from '../interfaces/stage.interface';
import { ApiUrlService } from '../../../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class StageService {
  private apiUrl: string;
  
  // Definiendo encabezados HTTP comunes para todas las solicitudes
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(
    private http: HttpClient,
    private apiUrlService: ApiUrlService
  ) { 
    // Configuración automática según el entorno
    this.apiUrl = this.apiUrlService.buildUrl('stage');
  }

  getStages(): Observable<Stage[]> {
    return this.http.get<Stage[]>(this.apiUrl, this.httpOptions).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  createStage(stage: Stage): Observable<Stage> {
    return this.http.post<Stage>(this.apiUrl, stage, this.httpOptions).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  updateStage(stage: Stage): Observable<Stage> {
    return this.http.put<Stage>(`${this.apiUrl}`, stage, this.httpOptions).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  deleteStage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.httpOptions).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Error detallado:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error
    });
    
    let errorMessage = 'Ha ocurrido un error en la operación. Por favor, inténtelo de nuevo.';
    
    if (error.status === 0) {
      errorMessage = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
    } else if (error.status === 500) {
      errorMessage = 'Error interno del servidor. Por favor, inténtelo más tarde.';
    } else if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error && typeof error.error === 'string') {
      // El backend devolvió un mensaje de error como string
      errorMessage = error.error;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}