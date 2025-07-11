import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthDirectService } from '../services/auth-direct.service';

/**
 * Interceptor unificado para manejo de autenticación
 * Este es el único interceptor HTTP para la aplicación, y centraliza toda
 * la lógica de autenticación y manejo de tokens para evitar conflictos
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthDirectService) {}

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(new Date().getTime() / 1000);
      console.log('[AuthInterceptor] Token exp:', payload.exp, 'Now:', now, 'Expired:', payload.exp < now);
      return payload.exp < now;
    } catch (e) {
      console.error('[AuthInterceptor] Error decodificando token:', e);
      return true;
    }
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    
    // Lista de rutas públicas que NO necesitan token
    const publicPaths = [
      '/api/auth/',
      '/api/public/',
      '/health',
      '/uploads/',
      '/api/plan-ejecucion/', // 🔥 AGREGAR: Todas las rutas de plan-ejecucion son públicas
      '/debug/' // 🔥 AGREGAR: Todas las rutas de debug son públicas
    ];
    
    // ✅ CORREGIDO: TODAS las rutas de plan-alimentacion son públicas (GET, POST, PUT, DELETE)
    const isPublicPlanPath = request.url.includes('/api/plan-alimentacion/');
    
    // Verificar si es una ruta pública
    const isPublicPath = publicPaths.some(path => request.url.includes(path)) || isPublicPlanPath;

    // Solo mostrar logs detallados en desarrollo
    if (!environment.production) {
      console.log('[AuthInterceptor] 🔄 Interceptando:', request.method, request.url);
      console.log('[AuthInterceptor] Es ruta pública:', isPublicPath);
      console.log('[AuthInterceptor] Token presente:', !!token);
      console.log('[AuthInterceptor] Usuario:', this.authService.currentUserValue?.username || 'No usuario');
      
      if (token) {
        const isExpired = this.isTokenExpired(token);
        console.log('[AuthInterceptor] Token expirado:', isExpired);
        
        if (isExpired) {
          console.warn('[AuthInterceptor] ⚠️ TOKEN EXPIRADO - Esto puede causar 401');
        }
      }
    }

    // Si es ruta pública, NO enviar token (evita errores 401)
    if (isPublicPath) {
      if (!environment.production) {
        console.log('[AuthInterceptor] 🟢 SALTANDO token para ruta pública:', request.url);
      }
      
      return next.handle(request).pipe(
        tap(event => {
          if (event.type === 4 && !environment.production) { // HttpEventType.Response
            console.log('[AuthInterceptor] ✅ Respuesta exitosa (ruta pública):', (event as any).status);
          }
        }),
        catchError(error => {
          console.error('[AuthInterceptor] ❌ Error en ruta pública:', request.url);
          console.error('[AuthInterceptor] Status:', error.status);
          
          // 🔥 AGREGAR: Logging detallado del error
          if (error.status === 400) {
            console.error('[AuthInterceptor] 🔥 ERROR 400 DETALLADO:');
            console.error('  - URL:', request.url);
            console.error('  - Método:', request.method);
            console.error('  - Headers:', request.headers);
            console.error('  - Body:', request.body);
            console.error('  - Error completo:', error);
            console.error('  - Error.error:', error.error);
            console.error('  - Error.message:', error.message);
            
            if (error.error && typeof error.error === 'string') {
              console.error('  - Mensaje del backend:', error.error);
            } else if (error.error && error.error.message) {
              console.error('  - Mensaje del backend:', error.error.message);
            }
          }
          
          return throwError(() => error);
        })
      );
    }

    // Para rutas protegidas, enviar token si existe
    if (token && token.trim() !== '') {
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!environment.production) {
        console.log('[AuthInterceptor] 🔑 Agregando header Authorization');
      }
      
      return next.handle(authReq).pipe(
        tap(event => {
          if (event.type === 4 && !environment.production) { // HttpEventType.Response
            console.log('[AuthInterceptor] ✅ Respuesta exitosa:', (event as any).status);
          }
        }),
        catchError(error => {
          console.error('[AuthInterceptor] ❌ Error en petición:', request.url);
          console.error('[AuthInterceptor] Status:', error.status);
          
          // 🔥 AGREGAR: Logging detallado del error
          if (error.status === 400) {
            console.error('[AuthInterceptor] 🔥 ERROR 400 DETALLADO (RUTA PROTEGIDA):');
            console.error('  - URL:', request.url);
            console.error('  - Método:', request.method);
            console.error('  - Headers:', request.headers);
            console.error('  - Body:', request.body);
            console.error('  - Error completo:', error);
            console.error('  - Error.error:', error.error);
            console.error('  - Error.message:', error.message);
            
            if (error.error && typeof error.error === 'string') {
              console.error('  - Mensaje del backend:', error.error);
            } else if (error.error && error.error.message) {
              console.error('  - Mensaje del backend:', error.error.message);
            }
          }
          
          if (error.status === 401) {
            console.error('[AuthInterceptor] 🔐 ERROR 401: Token rechazado por el backend');
            
            // Verificar si el token está expirado
            if (token && this.isTokenExpired(token)) {
              console.error('[AuthInterceptor] 💀 CAUSA: Token expirado');
            }
          }
          
          return throwError(() => error);
        })
      );
    } else {
      if (!token && !environment.production) {
        console.warn('[AuthInterceptor] ⚠️ No se encontró token JWT para:', request.url);
      }
      return next.handle(request).pipe(
        tap(event => {
          if (event.type === 4 && !environment.production) { // HttpEventType.Response
            console.log('[AuthInterceptor] ✅ Respuesta exitosa (sin token):', (event as any).status);
          }
        }),
        catchError(error => {
          console.error('[AuthInterceptor] ❌ Error en petición (sin token):', request.url);
          console.error('[AuthInterceptor] Status:', error.status);
          
          // 🔥 AGREGAR: Logging detallado del error
          if (error.status === 400) {
            console.error('[AuthInterceptor] 🔥 ERROR 400 DETALLADO (SIN TOKEN):');
            console.error('  - URL:', request.url);
            console.error('  - Método:', request.method);
            console.error('  - Headers:', request.headers);
            console.error('  - Body:', request.body);
            console.error('  - Error completo:', error);
            console.error('  - Error.error:', error.error);
            console.error('  - Error.message:', error.message);
            
            if (error.error && typeof error.error === 'string') {
              console.error('  - Mensaje del backend:', error.error);
            } else if (error.error && error.error.message) {
              console.error('  - Mensaje del backend:', error.error.message);
            }
          }
          
          return throwError(() => error);
        })
      );
    }
  }
}