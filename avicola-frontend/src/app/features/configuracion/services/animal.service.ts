import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Animal } from '../interfaces/animal.interface';

@Injectable({
  providedIn: 'root'
})
export class AnimalService {
  private apiUrl = 'http://localhost:8080/animal';
  
  // Definiendo encabezados HTTP comunes para todas las solicitudes
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  getAnimals(): Observable<Animal[]> {
    return this.http.get<Animal[]>(this.apiUrl);
  }

  createAnimal(animal: Animal): Observable<Animal> {
    return this.http.post<Animal>(this.apiUrl, animal, this.httpOptions);
  }

  updateAnimal(animal: Animal): Observable<Animal> {
    // Corregido para coincidir con el endpoint del backend que no usa ID en la URL
    return this.http.put<Animal>(`${this.apiUrl}`, animal, this.httpOptions);
  }

  deleteAnimal(id: number): Observable<void> {
    // Añadiendo headers para evitar el error 406
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.httpOptions);
  }
}