import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthDirectService } from './auth-direct.service';
import { LoginRequest, AuthResponse } from '../../shared/models/auth.model';
import { User } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public currentUser$: Observable<User | null>;

  constructor(
    private authDirectService: AuthDirectService
  ) {
    this.currentUser$ = this.authDirectService.currentUser;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.authDirectService.login(credentials);
  }

  logout(): void {
    this.authDirectService.logout();
  }

  refreshToken(): Observable<AuthResponse> {
    return this.authDirectService.refreshToken();
  }
  
  isAuthenticated(): boolean {
    return this.authDirectService.isAuthenticated();
  }

  getCurrentUser(): User | null {
    return this.authDirectService.currentUserValue;
  }
  
  hasRole(role: string): boolean {
    return this.authDirectService.hasRole(role);
  }

  isAdmin(): boolean {
    return this.authDirectService.isAdmin();
  }

  getToken(): string | null {
    return this.authDirectService.getToken();
  }

  // Métodos de compatibilidad para componentes existentes
  clearAuth(): void {
    this.authDirectService.logout();
  }

  hasRolePublic(role: any): boolean {
    return this.authDirectService.hasRole(role);
  }
  
  isTokenValidPublic(token: string): boolean {
    if (!token) return false;
    
    try {
      const tokenExpiry = localStorage.getItem('token_expiry');
      if (tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        if (!isNaN(expiryTime)) {
          return expiryTime > Date.now();
        }
      }
      return true;
    } catch (e) {
      console.error('Error al verificar validez del token:', e);
      return false;
    }
  }
  
  cleanupStorage(): void {
    this.clearAuth();
  }
  
  cleanupStoragePublic(): void {
    this.clearAuth();
  }
} 