import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthDirectService } from './auth-direct.service';
import { map } from 'rxjs/operators';
import { User } from '../../shared/models/user.model';
import { ERole } from '../../shared/models/role.model';
import { LoginRequest } from '../../shared/models/auth.model';

/**
 * SERVICIO TEMPORAL - Solo para compatibilidad durante migración
 * Este servicio redirige todas las llamadas al AuthDirectService
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Agregar propiedades adicionales necesarias para compatibilidad
  private apiUrl = environment.apiUrl;
    constructor(
    private authDirectService: AuthDirectService,
    private http: HttpClient,
    private router: Router
  ) {
    console.warn('AuthService está en desuso. Use AuthDirectService directamente.');
  }

  // Propiedades reenviadas
  get currentUserValue(): User | null {
    return this.authDirectService.getCurrentUser();
  }

  // Métodos reenviados
  login(credentials: LoginRequest): Observable<User> {
    return this.authDirectService.login(credentials);
  }

  logout(): void {
    this.authDirectService.logout();
  }

  logoutPublic(): void {
    this.authDirectService.logout();
  }

  refreshToken(): Observable<any> {
    return this.authDirectService.refreshToken();
  }

  getToken(): string | null {
    return this.authDirectService.getToken();
  }

  isTokenValidPublic(token: string): boolean {
    // Implementación básica para asegurar compatibilidad
    return token != null && token.length > 0;
  }

  isAuthenticated(): boolean {
    return this.authDirectService.isAuthenticated();
  }
  cleanupStorage(): void {
    this.authDirectService.logout();
  }

  cleanupStoragePublic(): void {
    this.authDirectService.logout();
  }

  // Métodos faltantes requeridos por los componentes
  hasRole(role: ERole): boolean {
    return this.authDirectService.hasRole(role);
  }
  hasRolePublic(role: ERole): boolean {
    return this.authDirectService.hasRole(role);
  }

  // Métodos adicionales para compatibilidad
  getApiUrl(): string {
    return this.apiUrl;
  }
  // Agregar un BehaviorSubject para currentUser$
  public get currentUser$() {
    return this.authDirectService.authStatus.pipe(
      map(isAuthenticated => {
        if (isAuthenticated) {
          const user = this.authDirectService.getCurrentUser();
          if (user) {
            return user;
          }
        }
        return null;
      })
    );
  }

  // Método para prueba de conexión al servidor
  testServerConnection(): Observable<any> {
    console.log('Probando conexión al servidor...');
    return this.http.get(`${this.apiUrl}/api/health`);
  }
}
