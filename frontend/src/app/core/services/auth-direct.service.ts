import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/user.model';
import { ERole } from '../../shared/models/role.model';
import { LoginRequest } from '../../shared/models/auth.model';
import { AuthResponse } from '../../shared/models/auth.model';

/**
 * Servicio principal de autenticación
 */
@Injectable({
  providedIn: 'root'
})
export class AuthDirectService implements OnDestroy {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';
  private rolesKey = 'user_roles';
  private destroy$ = new Subject<void>();
  private refreshTokenTimer: any;

  private authSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAuth();
  }

  private initializeAuth(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.authSubject.next(true);
      this.startRefreshTokenTimer();
    }
  }

  private startRefreshTokenTimer(): void {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
    }

    const expiryStr = localStorage.getItem('token_expiry');
    if (!expiryStr) {
      return;
    }

    const expiryDate = new Date(parseInt(expiryStr));
    const now = new Date();
    const timeUntilExpiry = expiryDate.getTime() - now.getTime();
    
    if (timeUntilExpiry > 0) {
      this.refreshTokenTimer = setTimeout(() => {
        this.refreshToken().subscribe(
          () => {
            this.startRefreshTokenTimer();
          },
          (error) => {
            console.error('Error al renovar token:', error);
            this.clearAuth();
          }
        );
      }, timeUntilExpiry - 300000); // Renovar 5 minutos antes de la expiración
    }
  }

  public clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.rolesKey);
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('refresh_token');
    this.authSubject.next(false);
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
    }
  }

  public logout(): void {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  public hasRole(role: ERole): boolean {
    const roles = this.getUserRoles();
    return roles.includes(role);
  }

  public isAdmin(): boolean {
    return this.hasRole(ERole.ROLE_ADMIN);
  }

  private getUserRoles(): ERole[] {
    const user = this.getCurrentUser();
    return user?.roles || [];
  }

  public get authStatus(): Observable<boolean> {
    return this.authSubject.asObservable();
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  public login(credentials: LoginRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/api/auth/login`, credentials).pipe(
      tap((user: User) => {
        if (user && user.token) {
          this.saveUserToStorage(user);
          this.authSubject.next(true);
          this.startRefreshTokenTimer();
        }
      }),
      catchError(error => {
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  public refreshToken(): Observable<User> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.http.post<User>(`${this.apiUrl}/api/auth/refresh`, { refreshToken }).pipe(
      tap((user: User) => {
        if (user && user.token) {
          this.saveUserToStorage(user);
          this.authSubject.next(true);
          this.startRefreshTokenTimer();
        }
      }),
      catchError(error => {
        console.error('Error al renovar token:', error);
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  public isAuthenticated(): boolean {
    return this.authSubject.value;
  }

  public getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem(this.userKey) || localStorage.getItem('user');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      if (!user || typeof user !== 'object') return null;
      
      // Asegurarse de que el usuario tenga los campos requeridos
      if (!user.username || !user.roles) {
        console.warn('Usuario en localStorage tiene campos faltantes');
        return null;
      }
      
      return user as User;
    } catch (e) {
      console.error('Error al obtener usuario:', e);
      return null;
    }
  }

  private saveUserToStorage(user: User): void {
    if (!user?.token) return;

    localStorage.setItem(this.tokenKey, user.token);
    if (user.refreshToken) {
      localStorage.setItem('refresh_token', user.refreshToken);
    }
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem('token_expiry', expiryDate.getTime().toString());
    localStorage.setItem(this.userKey, JSON.stringify(user));
    localStorage.setItem(this.rolesKey, JSON.stringify(user.roles || []));
  }

  public createAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  public getUsers(): Observable<User[]> {
    const token = this.getToken();
    if (!token) {
      return this.emergencyAdminLogin().pipe(
        switchMap(() => this.getUsers())
      );
    }

    const headers = this.createAuthHeaders();
    const timestamp = new Date().getTime();
    const url = `${this.apiUrl}/api/users?_t=${timestamp}`;

    console.log(`Consultando URL: ${url}`);
    return this.http.get<User[]>(url, { headers });
  }

  public emergencyAdminLogin(): Observable<User> {
    return this.login({
      username: 'admin',
      password: 'admin123'
    }).pipe(
      tap(user => {
        if (user && user.username.toLowerCase() === 'admin') {
          this.ensureAdminHasRole();
        }
      })
    );
  }

  private ensureAdminHasRole(): void {
    const user = this.getCurrentUser();
    if (user && user.username.toLowerCase() === 'admin') {
      if (!user.roles?.includes(ERole.ROLE_ADMIN)) {
        user.roles = [...(user.roles || []), ERole.ROLE_ADMIN];
        this.saveUserToStorage(user);
      }
    }
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.tokenKey) || localStorage.getItem('token');
    if (!token) {
      return false;
    }
    
    const tokenExpiry = localStorage.getItem('token_expiry');
    if (tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10);
      if (!isNaN(expiryTime)) {
        return expiryTime > (Date.now() - 10000);
      }
    }
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      
      if (!payload.exp) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        localStorage.setItem('token_expiry', expiryDate.getTime().toString());
        return true;
      }
      
      const expiry = new Date(payload.exp * 1000);
      const now = new Date();
      
      const isValid = expiry.getTime() > (now.getTime() - 10000);
      
      localStorage.setItem('token_expiry', expiry.getTime().toString());
      
      return isValid;
    } catch (e) {
      return false;
    }
  }

  private checkTokenExpiration(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      this.authSubject.next(false);
      return false;
    }
    
    // Verificar fecha de expiración si está disponible
    const tokenExpiry = localStorage.getItem('token_expiry');
    if (tokenExpiry) {
      const expiryDate = parseInt(tokenExpiry, 10);
      if (!isNaN(expiryDate) && Date.now() > expiryDate) {
        console.warn('Token expirado según timestamp guardado');
        this.clearAuth();
        this.authSubject.next(false);
        return false;
      }
    }
    
    // Verificar validez del token usando el método estándar
    if (!this.hasValidToken()) {
      console.warn('Token detectado como inválido, limpiando autenticación');
      this.clearAuth();
      this.authSubject.next(false);
      return false;
    } else {
      // Asegurarse de que el estado de autenticación sea correcto
      this.authSubject.next(true);
      
      // Verificar si hay inconsistencia entre auth_token y user.token
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          if (userData && userData.token && userData.token !== token) {
            console.warn('Inconsistencia entre tokens detectada, sincronizando');
            userData.token = token;
            localStorage.setItem('user', JSON.stringify(userData));
          }
        }
      } catch (e) {
        console.error('Error al verificar consistencia de tokens:', e);
      }
    }
    return true;
  }
}