import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, catchError, map, of, retry } from 'rxjs';
import { Race } from '../interfaces/race.interface';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RaceService {
  private apiUrl = `${environment.apiUrl}/api/race`;
  
  // Definiendo encabezados HTTP comunes para todas las solicitudes
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  getRaces(): Observable<Race[]> {
    return this.http.get<Race[]>(this.apiUrl).pipe(
      retry(1), // Reintentar la solicitud una vez si falla
      catchError(this.handleError)
    );
  }

  getRacesByAnimal(animalId: number): Observable<Race[]> {
    return this.http.get<Race[]>(`${this.apiUrl}/animal/${animalId}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  // Método modificado para verificar si una raza existe usando el endpoint de lista
  checkRaceExists(id: number): Observable<boolean> {
    return this.getRaces().pipe(
      map(races => {
        const foundRace = races.find(race => race.id === id);
        return !!foundRace;
      }),
      catchError(() => of(false))
    );
  }

  createRace(race: Race): Observable<Race> {
    // Modificado para incluir el ID del animal en la URL como lo requiere el backend
    const animalId = race.animal.id;
    console.log('Enviando datos al backend:', race, 'para el animal ID:', animalId);
    
    return this.http.post<Race>(`${this.apiUrl}/${animalId}`, race, this.httpOptions).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  updateRace(race: Race): Observable<Race> {
    return this.http.put<Race>(`${this.apiUrl}`, race, this.httpOptions).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  deleteRace(id: number): Observable<void> {
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
    
    let errorMessage = 'Error al obtener las razas. Por favor, inténtelo de nuevo.';
    
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