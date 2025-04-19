import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Race } from '../interfaces/race.interface';

@Injectable({
  providedIn: 'root'
})
export class RaceService {
  private apiUrl = 'http://localhost:8080/race';
  
  // Definiendo encabezados HTTP comunes para todas las solicitudes
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  getRaces(): Observable<Race[]> {
    return this.http.get<Race[]>(this.apiUrl);
  }

  getRacesByAnimal(animalId: number): Observable<Race[]> {
    return this.http.get<Race[]>(`${this.apiUrl}/animal/${animalId}`);
  }

  getRace(id: number): Observable<Race> {
    return this.http.get<Race>(`${this.apiUrl}/${id}`);
  }

  createRace(race: Race): Observable<Race> {
    // Modificado para incluir el ID del animal en la URL como lo requiere el backend
    const animalId = race.animal.id;
    console.log('Enviando datos al backend:', race, 'para el animal ID:', animalId);
    
    return this.http.post<Race>(`${this.apiUrl}/${animalId}`, race, this.httpOptions)
      .pipe(
        catchError(error => {
          console.error('Error al crear la raza:', error);
          return throwError(() => new Error(`Error al crear la raza: ${error.message}`));
        })
      );
  }

  updateRace(race: Race): Observable<Race> {
    return this.http.put<Race>(`${this.apiUrl}`, race, this.httpOptions);
  }

  deleteRace(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.httpOptions);
  }
}