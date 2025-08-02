import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RefreshTokenRequest } from './../../shared/models/auth.model';
import { User } from '../../shared/models/user.model';
import { ERole } from '../../shared/models/role.model';

/**
 * Servicio principal de autenticación
 */
@Injectable({
  providedIn: 'root'
})
export class AuthDirectService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(private http: HttpClient, private router: Router) {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      this.getUserFromLocalStorage()
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public getToken(): string | null {
    if (typeof window !== 'undefined') {
      // Intentar con la clave principal
      let token = localStorage.getItem('accessToken');
      
      // Si no existe, intentar con la clave alternativa (para compatibilidad)
      if (!token) {
        token = localStorage.getItem('auth_token');
      }
      
      return token;
    }
    return null;
  }

  public getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  public hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user?.roles?.includes(role) ?? false;
  }

  public isAdmin(): boolean {
    return this.hasRole(ERole.ROLE_ADMIN);
  }

  private getUserFromLocalStorage(): User | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        return JSON.parse(userStr);
      }
    }
    return null;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/api/auth/login`, credentials)
      .pipe(
        tap((response) => this.setSession(response)),
        catchError((error) => {
          console.error('Error durante el login:', error);
          this.clearLocalStorage();
          this.currentUserSubject.next(null);
          return throwError(() => error);
        })
      );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available.'));
    }
    const body: RefreshTokenRequest = { refreshToken };
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/refresh-token`, body)
      .pipe(
        tap((response: AuthResponse) => {
          this.setSession(response);
        }),
        catchError((error) => {
          console.error('Error al refrescar el token.', error);
          this.logout();
          return throwError(() => error);
        })
      );
  }

  private setSession(authResponse: AuthResponse): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    if (authResponse && authResponse.token) {
      const user: User = {
        id: authResponse.id,
        username: authResponse.username,
        email: authResponse.email,
        name: authResponse.name,
        profilePicture: authResponse.profilePicture,
        roles: authResponse.roles,
        token: authResponse.token,
        refreshToken: authResponse.refreshToken,
      };

      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('accessToken', authResponse.token);
      localStorage.setItem('auth_token', authResponse.token); // Guardar también con clave alternativa para compatibilidad
      if (authResponse.refreshToken) {
        localStorage.setItem('refreshToken', authResponse.refreshToken);
      }
      this.currentUserSubject.next(user);
    } else {
      this.logout();
    }
  }

  logout(): void {
    this.clearLocalStorage();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  private clearLocalStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('auth_token'); // Limpiar también la clave alternativa
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user'); // Limpiar también esta clave por compatibilidad
      localStorage.removeItem('token'); // Y esta también
      localStorage.removeItem('refresh_token'); // Y esta también
      localStorage.removeItem('token_expiry'); // Y esta también
    }
  }
}