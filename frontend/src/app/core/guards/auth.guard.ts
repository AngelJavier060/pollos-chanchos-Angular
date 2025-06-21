import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router,
  UrlTree 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuthDirectService } from '../services/auth-direct.service';
import { ERole } from '../../shared/models/role.model';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private authDirectService: AuthDirectService,
    private router: Router
  ) {}  
  
  /**
   * Método principal para verificar si se puede activar una ruta
   */  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log('AuthGuard: Verificando acceso a ruta:', state.url);
      
    // Para la ruta de login, permitir siempre
    if (state.url.includes('/login')) {
      // Si el usuario ya está autenticado y es admin, redirigir al dashboard
      if (this.isUserAuthenticated() && this.hasAdminRole()) {
        console.log('Usuario ya autenticado como admin, redirigiendo al dashboard');
        this.router.navigate(['/admin/dashboard']);
        return false;
      }
      return true;
    }
    
    // Para rutas del diagnóstico, siempre permitir acceso
    if (state.url.includes('/diagnostico')) {
      console.log('Permitiendo acceso a diagnóstico sin autenticación');
      return true;
    }
    
    // VERIFICACIÓN RÁPIDA - SI ES USUARIO ADMIN, PERMITIR DIRECTAMENTE
    const isAdminUserByName = this.isAdminByUsername();
    if (isAdminUserByName) {
      console.log('AuthGuard: Usuario admin detectado por nombre de usuario - acceso directo permitido');
      return true;
    }
    
    // Si se configuró saltarse la verificación de autenticación (para desarrollo)
    if (route.data['skipAuthCheck'] === true) {
      console.log('AuthGuard: Saltando verificación de autenticación por configuración');
      return true;
    }
    
    // Verificar si el usuario está autenticado (en cualquiera de los servicios)
    if (!this.isUserAuthenticated()) {
      console.log('AuthGuard: Usuario no autenticado o token inválido');
      
      // Para rutas de admin, guardar la URL de retorno
      const returnUrl = state.url.startsWith('/admin') ? state.url : '/admin/dashboard';
      
      // Redirigir al login con la URL de retorno
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl }
      });
      
      return false;
    }

    // Verificaciones adicionales solo si es área administrativa
    if (state.url.includes('/admin')) {
      console.log('AuthGuard: Verificando acceso a área administrativa');
      
      // Verificar si tiene rol de admin
      if (!this.hasAdminRole()) {
        console.log('AuthGuard: Usuario sin rol ADMIN intentando acceder al panel de administración');
        // Si no tiene permisos, redirigir a la página principal
        this.router.navigate(['/'], { 
          queryParams: { message: 'unauthorized' }
        });
        return false;
      }
      
      console.log('AuthGuard: Usuario verificado como administrador');
    }
      
    // Si hay roles adicionales requeridos en la ruta, verificarlos
    const requiredRoles = route.data['roles'] as ERole[];
    if (requiredRoles && requiredRoles.length > 0) {
      console.log('AuthGuard: Roles requeridos adicionales:', requiredRoles);
      
      const hasRequiredRole = requiredRoles.some(role => {
        const hasRole = this.hasRole(role as ERole);
        console.log(`AuthGuard: Verificando rol ${role}: ${hasRole}`);
        return hasRole;
      });

      if (!hasRequiredRole) {
        console.log('AuthGuard: Usuario no tiene los roles adicionales requeridos');
        
        // Si es una ruta que debe mantenerse en el panel admin, asegurar navegación dentro del admin
        if (route.data['keepAdmin'] === true) {
          console.log('AuthGuard: Manteniendo navegación dentro del panel admin');
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/admin/dashboard']);
        }
        return false;
      }
    }
    
    console.log('AuthGuard: Acceso permitido a', state.url);
    return true;
  }
  
  /**
   * Verifica si el usuario está autenticado usando cualquiera de los servicios disponibles
   */
  private isUserAuthenticated(): boolean {
    console.log('AuthGuard: Verificando autenticación del usuario');
    
    // Paso 1: Verificar primero con AuthDirectService (prioridad)
    if (this.authDirectService.isAuthenticated()) {
      console.log('AuthGuard: Usuario autenticado en AuthDirectService');
      return true;
    }
    
    // Paso 2: Verificar con AuthService
    if (this.authService.isAuthenticated && this.authService.isAuthenticated()) {
      console.log('AuthGuard: Usuario autenticado en AuthService');
      return true;
    }
    
    // Paso 3: Verificar directamente localStorage de auth-direct-service
    const authDirectToken = localStorage.getItem('auth_token');
    const authDirectUser = localStorage.getItem('auth_user');
    
    // Paso 4: Verificar localStorage del AuthService principal
    const userJson = localStorage.getItem('user');
    
    console.log('AuthGuard: Tokens encontrados - AuthDirectToken:', !!authDirectToken, 
                'AuthDirectUser:', !!authDirectUser,
                'User JSON:', !!userJson);
    
    // Si hay cualquier token o usuario guardado, consideramos que está autenticado
    if (authDirectToken || (authDirectUser && authDirectToken) || userJson) {
      console.log('AuthGuard: Tokens encontrados en localStorage');
      
      // Si hay un userJson, verificar que tenga token también
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user && user.token) {
            console.log('AuthGuard: Token válido encontrado en user JSON');
            
            // Asegurarnos de que ambos servicios tienen la info correcta
            if (!authDirectToken) {
              console.log('AuthGuard: Sincronizando token con AuthDirectService');
              localStorage.setItem('auth_token', user.token);
            }
            return true;
          }
        } catch (e) {
          console.error('AuthGuard: Error al analizar user JSON', e);
        }
      }
      
      // Si hay token directo, también consideramos autenticado
      if (authDirectToken) {
        return true;
      }
    }
    
    console.log('AuthGuard: Usuario no autenticado en ningún servicio');
    return false;
  }
  
  /**
   * Verifica si el usuario tiene rol de administrador
   */
  private hasAdminRole(): boolean {
    console.log('AuthGuard: Verificando rol de administrador');
    
    // Verificar primero en el servicio directo
    if (this.authDirectService.isAdmin()) {
      console.log('AuthGuard: Usuario es admin según AuthDirectService');
      return true;
    }
      // Si no, verificar en el servicio principal
    try {
      if (this.authService.hasRole && this.authService.hasRole(ERole.ROLE_ADMIN)) {
        console.log('AuthGuard: Usuario es admin según AuthService');
        return true;
      }
    } catch (e) {
      console.warn('AuthGuard: Error al verificar rol en AuthService:', e);
    }
    
    // Verificar directamente en localStorage
    const directRoles = this.getDirectRoles();
    if (directRoles.includes('ROLE_ADMIN') || directRoles.includes('ADMIN')) {
      console.log('AuthGuard: Rol admin encontrado en roles directos:', directRoles);
      return true;
    }
    
    // Verificar si el usuario es explícitamente 'admin'
    try {
      // Revisar en ambos formatos de usuario
      const userStr = localStorage.getItem('auth_user') || localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData && userData.username && userData.username.toLowerCase() === 'admin') {
          console.log('AuthGuard: Usuario es admin por nombre de usuario');
          // Sincronizar roles si es necesario
          if (userData.roles && Array.isArray(userData.roles) && !userData.roles.includes('ROLE_ADMIN')) {
            userData.roles.push('ROLE_ADMIN');
            if (localStorage.getItem('auth_user')) {
              localStorage.setItem('auth_user', JSON.stringify(userData));
            }
            if (localStorage.getItem('user')) {
              localStorage.setItem('user', JSON.stringify(userData));
            }
            localStorage.setItem('user_roles', JSON.stringify(['ROLE_ADMIN']));
          }
          return true;
        }
      }
    } catch (e) {
      console.error('Error al verificar usuario admin:', e);
    }
    
    console.log('AuthGuard: Usuario no tiene rol admin');
    return false;
  }
  
  /**
   * Obtiene los roles desde el servicio directo
   */
  private getDirectRoles(): string[] {
    try {
      const rolesStr = localStorage.getItem('user_roles');
      if (rolesStr) {
        return JSON.parse(rolesStr);
      }
    } catch (e) {
      console.error('Error al obtener roles directos:', e);
    }
    return [];
  }
  
  /**
   * Verifica si el usuario tiene un rol específico
   */
  private hasRole(role: ERole): boolean {    // Verificar en servicio directo
    const roles = this.getDirectRoles();
    if (roles.includes(role)) {
      return true;
    }
    
    // Verificar en AuthService
    try {
      return this.authService.hasRole(role);
    } catch (e) {
      console.warn('AuthGuard: Error al verificar rol en AuthService:', e);
      return false;
    }
  }
  
  /**
   * Verifica si el usuario es admin por su nombre de usuario
   */
  private isAdminByUsername(): boolean {
    const user = this.authDirectService.getCurrentUser();
    if (user && user.username && user.username.toLowerCase() === 'admin') {
      console.log('AuthGuard: Usuario es admin por nombre de usuario');
      return true;
    }
    return false;
  }
}