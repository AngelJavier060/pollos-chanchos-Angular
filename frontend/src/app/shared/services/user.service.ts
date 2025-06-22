import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User, RegisterUserDto, UserUpdateDto } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { AuthDirectService } from '../../core/services/auth-direct.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/users`;
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private authService: AuthDirectService,
    private router: Router
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    console.log('UserService: Obteniendo cabeceras, token disponible:', !!token);
    
    if (token) {
      console.log('UserService: Token encontrado, longitud:', token.length);
      return new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });
    }
    
    console.warn('UserService: No se encontró token para la petición');
    // Si no hay token, el AuthGuard se encargará de redirigir.
    // Devolvemos cabeceras sin Auth para que la petición falle y el Guard actúe.
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  private handleError(error: any): Observable<never> {
    console.error('UserService: Error detallado:', error);
    
    if (error.status === 401) {
      console.error('UserService: Error 401 - Token inválido o expirado');
      console.error('UserService: URL que falló:', error.url);
      console.error('UserService: Token actual:', this.authService.getToken() ? 'Presente' : 'Ausente');
    }
    
    // Ya no manejamos la lógica de logout aquí. El AuthGuard es el responsable.
    return throwError(() => new Error(`Error en el servicio de usuarios: ${error.status} - ${error.message || 'Error desconocido'}`));
  }

  public getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      tap(users => this.usersSubject.next(users)),
      catchError(error => this.handleError(error))
    );
  }

  public getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  public createUser(userData: RegisterUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, userData, { headers: this.getHeaders() }).pipe(
      tap(() => this.getUsers().subscribe()),
      catchError(error => this.handleError(error))
    );
  }

  public updateUser(id: number, userData: UserUpdateDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData, { headers: this.getHeaders() }).pipe(
      tap(() => this.getUsers().subscribe()),
      catchError(error => this.handleError(error))
    );
  }

  public deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`, { headers: this.getHeaders() }).pipe(
      tap(() => this.getUsers().subscribe()),
      catchError(error => this.handleError(error))
    );
  }

  public toggleUserStatus(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/toggle-status`, {}, { headers: this.getHeaders() }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  public uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Obtener el token más reciente y verificar su validez
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('No hay token de autenticación. Inicia sesión nuevamente.'));
    }
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${token}`);

    // Usar el endpoint correcto del backend
    return this.http.post<{ url: string }>(`/api/upload/profile-picture`, formData, { headers }).pipe(
      catchError(error => this.handleError(error))
    );
  }
}
