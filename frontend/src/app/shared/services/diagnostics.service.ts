import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  auth?: boolean;
  db?: boolean;
  storage?: boolean;
  details?: {
    [key: string]: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  checkSystemHealth(): Observable<any> {
    // Usar el endpoint /health completo, asegurando que está bien formado
    const url = `${this.apiUrl}/health`;
    console.log('Verificando salud del sistema en:', url);    // Configuramos las opciones de la petición simplificadas para evitar problemas de CORS
    // Eliminamos el Cache-Control que estaba causando problemas
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'X-Skip-Auth': 'true' // Marcador opcional para ayudar al interceptor
      },
      // Agregar timestamp como parámetro de URL para evitar cacheo sin usar Cache-Control
      params: {
        '_t': new Date().getTime().toString()
      }
    };

    return this.http.get<HealthResponse>(url, options).pipe(
      timeout(3000), // Reducido de 5000ms a 3000ms para fallar más rápido si hay problemas
      map(response => {
        return {
          api: response.status === 'UP',
          auth: response.auth !== false,
          storage: response.storage !== false,
          details: {
            status: response.status,
            timestamp: response.timestamp,
            service: response.service,
            errors: []
          }
        };
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al verificar estado del sistema:', error);
        let errorMessage = 'Error al conectar con la API';
        let authStatus = false;
        let apiStatus = false;

        if (error.status === 0) {
          errorMessage = 'No se puede conectar con el servidor';
          // Verificar si tenemos un token de autenticación válido
          const token = localStorage.getItem('auth_token');
          if (token) {
            // Si tenemos un token, asumimos que la autenticación está bien aunque el servidor no responda
            authStatus = true;
            console.log('Error de conexión pero hay token disponible - asumiendo sesión válida');
            
            // Marcar el tiempo del error para la lógica de tolerancia
            localStorage.setItem('connection_error_time', Date.now().toString());
          }
        } else if (error.status === 401) {
          errorMessage = 'Error de autenticación en endpoint público';
          authStatus = false;
        } else if (error.status === 403) {
          errorMessage = 'No autorizado';
          authStatus = false;
        } else if (error.status >= 500) {
          errorMessage = 'Error interno del servidor';
          apiStatus = true; // El servidor responde, aunque con error
        }

        // Devolver un objeto con la estructura esperada pero con estado apropiado
        return of({
          api: apiStatus,
          auth: authStatus,
          storage: true,
          details: {
            status: 'DOWN',
            errors: [{
              message: errorMessage,
              status: error.status,
              statusText: error.statusText
            }]
          }
        });
      })
    );
  }

  checkAuthStatus(): Observable<boolean> {
    return this.checkSystemHealth().pipe(
      map(status => status.auth === true)
    );
  }

  checkStorageStatus(): Observable<boolean> {
    return this.checkSystemHealth().pipe(
      map(status => status.storage === true)
    );
  }
}
