import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      // Verificar si la ruta requiere un rol específico
      if (route.data['roles'] && !route.data['roles'].includes(currentUser.role)) {
        // Rol no autorizado - redirigir a la página de inicio
        this.router.navigate(['/']);
        return false;
      }

      // Autorizado
      return true;
    }

    // No autenticado - redirigir a login con returnUrl
    this.router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}