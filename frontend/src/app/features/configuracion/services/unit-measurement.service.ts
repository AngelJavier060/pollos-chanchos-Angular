import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { UnitMeasurement } from '../interfaces/unit-measurement.interface';
import { ApiUrlService } from '../../../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class UnitMeasurementService {
  private apiUrl: string;
  
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
    this.apiUrl = this.apiUrlService.buildUrl('unitmeasurement');
  }

  getUnitMeasurements(): Observable<UnitMeasurement[]> {
    return this.http.get<UnitMeasurement[]>(this.apiUrl, this.httpOptions).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  createUnitMeasurement(unitMeasurement: UnitMeasurement): Observable<UnitMeasurement> {
    return this.http.post<UnitMeasurement>(this.apiUrl, unitMeasurement, this.httpOptions).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  updateUnitMeasurement(unitMeasurement: UnitMeasurement): Observable<UnitMeasurement> {
    return this.http.put<UnitMeasurement>(`${this.apiUrl}`, unitMeasurement, this.httpOptions).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  deleteUnitMeasurement(id: number): Observable<void> {
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
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error && typeof error.error === 'string') {
      errorMessage = error.error;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}