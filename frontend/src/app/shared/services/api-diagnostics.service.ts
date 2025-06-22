import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, map, timeout, switchMap, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../models/user.model';

export interface ApiDiagnosticResult {
  serverAvailable: boolean;
  apiAvailable: boolean;
  authValid: boolean;
  error?: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiDiagnosticsService {
  private readonly TIMEOUT_MS = 5000;
  private apiBaseUrl = environment.apiUrl;
  private currentUser: User | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  checkApiStatus(): Observable<ApiDiagnosticResult> {
    console.log('Iniciando verificación de API...');
    console.log('URL base:', this.apiBaseUrl);
    console.log('Token:', this.authService.getToken());

    return this.http.get(`${this.apiBaseUrl}/api/test/public`, { 
      headers: this.getAuthHeaders(),
      observe: 'response'
    }).pipe(
      timeout(this.TIMEOUT_MS),
      map(response => {
        console.log('Respuesta del servidor:', response);
        return {
          serverAvailable: true,
          apiAvailable: true,
          authValid: true
        };
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al verificar servidor base:', error);
        
        if (error.status === 401) {
          return of({
            serverAvailable: true,
            apiAvailable: true,
            authValid: false,
            error: 'Token de autenticación inválido o expirado',
            details: error
          });
        }

        return of({
          serverAvailable: false,
          apiAvailable: false,
          authValid: false,
          error: `Error de conexión con el servidor: ${error.status} ${error.statusText}`,
          details: error
        });
      })
    );
  }

  getDiagnosticInfo(): Observable<any> {
    return this.checkApiStatus().pipe(
      map(result => {
        const currentUser = this.currentUser;
        
        return {          timestamp: new Date().toISOString(),
          environment: environment.production ? 'Producción' : 'Desarrollo',
          apiUrl: this.apiBaseUrl,
          isAuthenticated: this.authService.isAuthenticated(),
          userRoles: currentUser?.roles || [],
          diagnosticResult: result
        };
      })
    );
  }

  /**
   * Verifica si el usuario actual tiene permisos de administrador
   * @returns Observable con el resultado de la verificación
   */
  checkAdminPermissions(): Observable<{
    hasAdminPermission: boolean;
    details?: any;
    error?: string;
  }> {
    const token = this.authService.getToken();
    
    if (!token) {
      return of({
        hasAdminPermission: false,
        error: 'No hay token de autenticación disponible'
      });
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    return this.http.get(`${this.apiBaseUrl}/api/debug/admin-check`, { 
      headers,
      observe: 'response'
    }).pipe(
      timeout(5000),
      map(response => {
        return {
          hasAdminPermission: true,
          details: response.body
        };
      }),
      catchError(error => {
        let errorMsg = '';
        
        if (error.status === 403) {
          errorMsg = 'El usuario no tiene permisos de administrador';
        } else if (error.status === 401) {
          errorMsg = 'Token inválido o expirado';
        } else {
          errorMsg = `Error al verificar permisos: ${error.status} ${error.statusText}`;
        }
        
        return of({
          hasAdminPermission: false,
          error: errorMsg,
          details: error
        });
      })
    );
  }

  /**
   * Genera un informe de estado general del sistema
   * @returns Cadena con información de diagnóstico
   */
  generateDiagnosticInfo(): string {
    const info = [      `Fecha/Hora: ${new Date().toISOString()}`,
      `Entorno: ${environment.production ? 'Producción' : 'Desarrollo'}`,
      `URL API: ${environment.apiUrl}`,
      `Usuario Autenticado: ${this.authService.isAuthenticated()}`,
      `Roles: ${this.currentUser?.roles?.join(', ') || 'No disponible'}`,
    ];
    
    return info.join('\n');
  }

  getCurrentUserInfo(): string {
    if (!this.currentUser) {
      return 'No hay usuario autenticado';
    }

    return `
      Usuario: ${this.currentUser.username}
      Email: ${this.currentUser.email}
      Roles: ${this.currentUser.roles?.join(', ') || 'No disponible'}
    `;
  }

  private createHeaders(includeAuth: boolean = false): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    });
    if (includeAuth) {
      const token = this.authService.getToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  checkApiHealth(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/health`, { headers: this.createHeaders(), responseType: 'text' })
      .pipe(
        map(response => ({ status: 'UP', details: response })),
        catchError(err => throwError(() => ({ message: 'El endpoint /health del backend no está accesible.', error: err })))
      );
  }

  checkPublicEndpoint(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/api/auth/test/public`, { headers: this.createHeaders(), responseType: 'text' })
      .pipe(
        map(response => ({ status: 'OK', details: response })),
        catchError(err => throwError(() => ({ message: 'El endpoint público /api/auth/test/public no responde correctamente.', error: err })))
      );
  }
  
  checkLocalStorageToken(): Observable<any> {
      const token = this.authService.getToken();
      if (token) {
          try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              return of({ 
                  tokenFound: true, 
                  token,
                  payload
              });
          } catch(e) {
              return throwError(() => ({ message: 'Se encontró un token pero no se pudo decodificar (malformado).', token, error: e}));
          }
      } else {
        return throwError(() => ({ message: 'No se encontró ningún token de autenticación en el Local Storage.' }));
      }
  }

  checkAdminEndpoint(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/api/test/admin`, { headers: this.createHeaders(true), responseType: 'text' })
       .pipe(
        map(response => ({ status: 'OK', details: response })),
        catchError(err => throwError(() => ({ message: 'Falló el acceso al endpoint protegido /api/test/admin. El token podría ser inválido.', error: err })))
      );
  }
  
  checkUsersEndpoint(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/api/users`, { headers: this.createHeaders(true) })
       .pipe(
        map(response => ({ status: 'OK', details: response })),
        catchError(err => throwError(() => ({ message: 'Falló el acceso al endpoint de usuarios /api/users. El token podría ser inválido o el usuario no tener permisos.', error: err })))
      );
  }
}
