import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { User } from '../../shared/models/user.model';
import { AuthDirectService } from '../services/auth-direct.service';
import { Router } from '@angular/router';

/**
 * Interceptor simplificado para manejo de autenticación
 * Esta versión es menos compleja y más directa
 */
@Injectable()
export class AuthInterceptorSimplified implements HttpInterceptor {
  
  constructor(
    private authService: AuthDirectService,
    private router: Router
  ) {
    console.log('AuthInterceptor simplificado inicializado');
  }

  // Lista de rutas públicas que no requieren autenticación
  private publicPaths = [
    '/login',
    '/register',
    '/health',
    '/api/auth',
    '/api/public'
  ];
  
  // Verificar si una ruta es pública
  private isPublicPath(url: string): boolean {
    return this.publicPaths.some(path => url.includes(path));
  }
  
  // Método principal del interceptor
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log(`Interceptando petición a: ${request.url}`);
    
    // Si es ruta pública, continuar sin token
    if (this.isPublicPath(request.url)) {
      console.log(`Ruta pública detectada: ${request.url} - No requiere token`);
      return next.handle(request);
    }

    // Obtener token del localStorage
    const token = localStorage.getItem('auth_token');
    
    // Si no hay token, intentar renovar
    if (!token) {
      return this.authService.refreshToken().pipe(
        switchMap((user: any) => {
          if (!user || !user.token) {
            console.warn('No se pudo renovar el token');
            this.router.navigate(['/login']);
            return throwError(() => new Error('Sesión expirada'));
          }
          
          // Crear nueva petición con el token renovado
          const authReq = request.clone({
            headers: request.headers
              .set('Authorization', `Bearer ${user.token}`)
              .set('Content-Type', 'application/json')
          });
          
          return next.handle(authReq);
        })
      );
    }

    // Si hay token, usarlo directamente
    const authReq = request.clone({
      headers: request.headers
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
    });

    // Intentar la petición original
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Intentar renovar token en caso de error 401
          return this.authService.refreshToken().pipe(
            switchMap((user: any) => {
              if (!user || !user.token) {
                this.authService.logout();
                this.router.navigate(['/login']);
                return throwError(() => error);
              }
              
              // Reintentar la petición con el nuevo token
              const newAuthReq = request.clone({
                headers: request.headers
                  .set('Authorization', `Bearer ${user.token}`)
                  .set('Content-Type', 'application/json')
              });
              
              return next.handle(newAuthReq);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
