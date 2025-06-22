import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthDirectService } from '../services/auth-direct.service';
import { ERole } from '../../shared/models/role.model';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private authService: AuthDirectService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    if (this.authService.isAuthenticated()) {
      const requiredRoles = route.data['roles'] as string[];
      if (requiredRoles) {
        const hasRole = requiredRoles.some(role => this.authService.hasRole(role));
        if (hasRole) {
          return true;
        } else {
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }
      return true;
    }

    // No está autenticado, intentar refrescar
    return this.authService.refreshToken().pipe(
      map(isRefreshed => {
        if (isRefreshed) {
          return true;
        }
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      })
    );
  }
}