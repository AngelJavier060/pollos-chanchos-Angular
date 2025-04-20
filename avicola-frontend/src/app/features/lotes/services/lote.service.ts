import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Lote } from '../interfaces/lote.interface';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoteService {
  private apiUrl = `${environment.apiUrl}/lote`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  getLotes(): Observable<Lote[]> {
    return this.http.get<any[]>(this.apiUrl, this.httpOptions).pipe(
      map(lotes => this.transformLotes(lotes)),
      catchError((error) => this.handleError(error))
    );
  }

  private transformLotes(lotes: any[]): Lote[] {
    console.log('Datos recibidos del backend:', lotes); // Agregamos log para debug
    return lotes.map(lote => {
      // Verificamos la estructura de race para acceder correctamente a sus propiedades
      let raceName = 'No asignada';
      let animalId = 0;
      let animalName = 'Sin nombre';
      
      // Si race existe y tiene las propiedades necesarias
      if (lote.race) {
        raceName = lote.race.name || 'No asignada';
        
        // Si race.animal existe y tiene las propiedades necesarias
        if (lote.race.animal) {
          animalId = lote.race.animal.id || 0;
          animalName = lote.race.animal.name || 'Sin nombre';
        }
      }
      
      return {
        id: lote.id,
        codigo: lote.codigo,
        name: lote.name,
        quantity: Number(lote.quantity),
        birthdate: lote.birthdate ? new Date(lote.birthdate) : null,
        cost: Number(lote.cost),
        race: {
          id: lote.race?.id || 0,
          name: raceName,
          animal: {
            id: animalId,
            name: animalName
          }
        },
        create_date: lote.create_date ? new Date(lote.create_date) : undefined,
        update_date: lote.update_date ? new Date(lote.update_date) : undefined
      };
    });
  }

  createLote(raceId: number, lote: Lote): Observable<Lote> {
    // Usamos la nueva ruta /lote/nuevo
    const url = `${this.apiUrl}/nuevo`;
    
    // Incluimos la raza completa en la solicitud
    const loteToSend = {
      name: lote.name?.trim() || '',
      quantity: Number(lote.quantity) || 0,
      birthdate: lote.birthdate instanceof Date ? 
                lote.birthdate.toISOString().split('T')[0] : 
                new Date(lote.birthdate || new Date()).toISOString().split('T')[0],
      cost: Number(lote.cost) || 0,
      race: {
        id: raceId
      }
    };

    console.log('Datos preparados para enviar:', loteToSend);
    
    return this.http.post<any>(url, loteToSend, this.httpOptions).pipe(
      map(response => this.transformLoteResponse(response)),
      catchError((error) => this.handleError(error))
    );
  }

  updateLote(lote: Lote): Observable<Lote> {
    const loteToUpdate = {
      id: lote.id,
      name: lote.name?.trim(),
      quantity: Number(lote.quantity),
      birthdate: lote.birthdate instanceof Date ? 
                lote.birthdate.toISOString().split('T')[0] : 
                new Date(lote.birthdate || new Date()).toISOString().split('T')[0],
      cost: Number(lote.cost),
      race_id: lote.race?.id
    };

    return this.http.put<any>(this.apiUrl, loteToUpdate, this.httpOptions).pipe(
      map(response => this.transformLoteResponse(response)),
      catchError((error) => this.handleError(error))
    );
  }

  deleteLote(id: number): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url, this.httpOptions).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  private transformLoteResponse(lote: any): Lote {
    console.log('Respuesta recibida para un solo lote:', lote); // Log para debug
    
    // Verificamos la estructura de race para acceder correctamente a sus propiedades
    let raceName = 'No asignada';
    let animalId = 0;
    let animalName = 'Sin nombre';
    
    // Si race existe y tiene las propiedades necesarias
    if (lote.race) {
      raceName = lote.race.name || 'No asignada';
      
      // Si race.animal existe y tiene las propiedades necesarias
      if (lote.race.animal) {
        animalId = lote.race.animal.id || 0;
        animalName = lote.race.animal.name || 'Sin nombre';
      }
    }
    
    return {
      id: lote.id,
      codigo: lote.codigo,
      name: lote.name,
      quantity: Number(lote.quantity),
      birthdate: lote.birthdate ? new Date(lote.birthdate) : null,
      cost: Number(lote.cost),
      race: {
        id: lote.race?.id || 0,
        name: raceName,
        animal: {
          id: animalId,
          name: animalName
        }
      },
      create_date: lote.create_date ? new Date(lote.create_date) : undefined,
      update_date: lote.update_date ? new Date(lote.update_date) : undefined
    };
  }

  // Método para filtrar lotes por tipo de animal - versión mejorada y dinámica
  filterLotesByAnimalType(lotes: Lote[], animalType: 'pollo' | 'cerdo' | 'all'): Lote[] {
    if (animalType === 'all') {
      return lotes;
    }
    
    console.log('Filtrando por tipo de animal:', animalType);
    console.log('Total de lotes disponibles:', lotes.length);
    
    // Filtramos por el nombre del animal directamente en lugar de usar códigos
    return lotes.filter(lote => {
      if (!lote.race?.animal?.name) return false;
      
      const animalName = lote.race.animal.name.toLowerCase();
      
      // Comprobamos si el nombre del animal coincide con el tipo buscado
      if (animalType === 'pollo') {
        return animalName.includes('pollo') || animalName.includes('ave') || 
               animalName.includes('gallina') || animalName === 'pollos';
      } 
      else if (animalType === 'cerdo') {
        return animalName.includes('cerdo') || animalName.includes('puerco') || 
               animalName.includes('chancho') || animalName === 'cerdos' || 
               animalName === 'duroc'; // Específico para la raza Duroc que aparece en tu imagen
      }
      
      return false;
    });
  }

  // Método para verificar si un nombre ya está en uso para un tipo de animal específico
  checkDuplicateLoteName(name: string, animalId: number): Observable<boolean> {
    const url = `${this.apiUrl}/check-duplicate?name=${name}&animalId=${animalId}`;
    return this.http.get<boolean>(url, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error al verificar nombre de lote duplicado:', error);
        return throwError(() => new Error('Error al verificar el nombre del lote'));
      })
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error detallado:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error
    });

    let errorMessage = 'Ha ocurrido un error en la operación.';

    if (typeof error.error === 'string') {
      errorMessage = error.error;
    } else if (error.status === 0) {
      errorMessage = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
    } else if (error.status === 500) {
      errorMessage = 'Error interno del servidor. Por favor, inténtelo más tarde.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}