import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
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

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (token && token.trim() !== '') {
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(authReq);
    } else {
      if (!token) {
        console.warn('[AuthInterceptor] No se encontró token JWT para la petición:', request.url);
      }
      return next.handle(request);
    }
  }
}