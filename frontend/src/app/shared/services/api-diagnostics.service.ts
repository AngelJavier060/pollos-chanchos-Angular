import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  private readonly API_URL = `${environment.apiUrl}/api`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentUser: User | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  private getHeaders() {
    const token = this.authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  checkApiStatus(): Observable<ApiDiagnosticResult> {
    console.log('Iniciando verificación de API...');
    console.log('URL base:', this.API_URL);
    console.log('Token:', this.authService.getToken());

    return this.http.get(`${this.API_URL}/test/public`, { 
      headers: this.getHeaders(),
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
        
        return {
          timestamp: new Date().toISOString(),
          environment: environment.production ? 'Producción' : 'Desarrollo',
          apiUrl: this.API_URL,
          isAuthenticated: this.authService.isAuthenticatedPublic(),
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
    
    return this.http.get(`${this.API_URL}/debug/admin-check`, { 
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
    const info = [
      `Fecha/Hora: ${new Date().toISOString()}`,
      `Entorno: ${environment.production ? 'Producción' : 'Desarrollo'}`,
      `URL API: ${environment.apiUrl}`,
      `Usuario Autenticado: ${this.authService.isAuthenticatedPublic()}`,
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
}
