import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { User, RegisterUserDto, UserUpdateDto } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { ERole } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Asegurarse de que esta URL es correcta para la API del backend
  private apiUrl = `${environment.apiUrl}/api/users`;
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {
    // Al iniciar el servicio, verificar y corregir roles para admin
    this.ensureAdminRoles();
  }

  /**
   * Obtiene la lista de usuarios desde la API
   */
  getUsers(): Observable<User[]> {
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${this.authService.getToken()}`);

    return this.http.get<User[]>(`${this.apiUrl}/list`, { headers })
      .pipe(
        tap(users => {
          console.log('Usuarios cargados desde API:', users);
          this.usersSubject.next(users);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Manejo de errores para las llamadas HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error en el servicio de usuarios:', error);
    
    if (error.status === 401) {
      // Token expirado o inválido
      this.authService.logout();
      this.router.navigate(['/auth/login/admin']);
    }

    return throwError(() => error);
  }
    // Método para asegurarse que el usuario admin tenga los roles correctos
  private ensureAdminRoles(): void {
    try {
      // Verificar si hay información de usuario en localStorage
      const userStr = localStorage.getItem('auth_user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        
        // Si el usuario es admin, SIEMPRE asignarle el rol ROLE_ADMIN
        if (userData && userData.username === 'admin') {
          console.log('UserService: Detectado usuario admin - verificando roles');
          
          if (!userData.roles || !Array.isArray(userData.roles) || !userData.roles.includes('ROLE_ADMIN')) {
            console.log('UserService: Corrigiendo roles para el usuario admin');
            if (!userData.roles || !Array.isArray(userData.roles)) {
              userData.roles = [];
            }
            if (!userData.roles.includes('ROLE_ADMIN')) {
              userData.roles.push('ROLE_ADMIN');
            }
            localStorage.setItem('auth_user', JSON.stringify(userData));
            localStorage.setItem('user_roles', JSON.stringify(userData.roles));
            console.log('UserService: Roles actualizados para admin:', userData.roles);
          } else {
            console.log('UserService: El usuario admin ya tiene el rol ROLE_ADMIN');
          }
        }
      } else {
        console.log('UserService: No se encontró información de usuario en localStorage');
      }
      
      // Verificar también si hay token y extraer info adicional si es necesario
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          console.log('UserService: Verificando token para información adicional');
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const username = payload.sub || '';
            
            // Si el usuario en el token es admin, asegurar que tenga el rol adecuado
            if (username.toLowerCase() === 'admin') {
              console.log('UserService: Token pertenece a usuario admin, verificando roles');
              
              // Establecer explícitamente el rol ROLE_ADMIN en localStorage
              localStorage.setItem('user_roles', JSON.stringify(['ROLE_ADMIN']));
              console.log('UserService: Roles forzados para usuario admin desde token');
            }
          }
        } catch (e) {
          console.error('Error al verificar token para roles:', e);
        }
      }
    } catch (e) {
      console.error('Error al verificar roles de admin:', e);
    }
  }
  
  // Método para generar usuarios de prueba
  private getMockUsers(): User[] {
    return [
      {
        id: 1,
        username: 'admin',
        name: 'Administrador',
        email: 'admin@example.com',
        active: true,
        roles: [ERole.ROLE_ADMIN],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        token: 'mock-token-admin',
        refreshToken: 'mock-refresh-token-admin',
        photoUrl: 'assets/avatar-admin.png'
      },
      {
        id: 2,
        username: 'user1',
        name: 'Usuario Normal',
        email: 'user@example.com',
        active: true,
        roles: [ERole.ROLE_USER],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        token: 'mock-token-user',
        refreshToken: 'mock-refresh-token-user',
        photoUrl: 'assets/avatar-user.png'
      },
      {
        id: 3,
        username: 'supervisor',
        name: 'Supervisor',
        email: 'supervisor@example.com',
        active: true,
        roles: [ERole.ROLE_SUPERVISOR],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        token: 'mock-token-supervisor',
        refreshToken: 'mock-refresh-token-supervisor',
        photoUrl: 'assets/avatar-supervisor.png'
      }
    ];
  }
    
  private getHeaders(): HttpHeaders {
    console.log('Obteniendo headers para petición de usuarios');
    // Obtener el token directamente
    const token = this.authService.getToken();
    console.log('Token disponible para petición:', token ? 'SÍ' : 'NO');
    
    if (!token) {
      console.warn('No hay token disponible para la petición');
      
      // Verificar token en localStorage directamente como respaldo
      const localToken = localStorage.getItem('auth_token');
      if (localToken) {
        console.log('Token encontrado en localStorage. Usando como respaldo.');
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localToken}`
        });
        return headers;
      }
      
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
    
    // Verificar validez del token 
    if (!this.authService.isTokenValidPublic(token)) {
      console.warn('Token inválido o expirado, se intentará renovar automáticamente');
      // No lanzar error aquí, dejar que el interceptor maneje la renovación
    }
      // Verificar los roles del token
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('Payload del token JWT:', payload);
        
        // Buscar roles en diferentes ubicaciones posibles del token
        let roles: string[] = [];
        if (payload.roles && Array.isArray(payload.roles)) {
          roles = payload.roles;
          console.log('Roles encontrados en campo roles del token:', roles);
        } else if (payload.authorities && Array.isArray(payload.authorities)) {
          roles = payload.authorities;
          console.log('Roles encontrados en campo authorities del token:', roles);
        } else if (payload.scope && typeof payload.scope === 'string') {
          // Algunos tokens usan scope en lugar de roles
          roles = payload.scope.split(' ');
          console.log('Roles extraídos del campo scope del token:', roles);
        }
        
        // Si no hay roles o están vacíos, buscar en localStorage o asignar para admin
        if (!roles.length) {
          console.warn('El token no contiene roles o están vacíos');
          
          // Verificar si hay roles en localStorage
          const rolesStr = localStorage.getItem('user_roles');
          if (rolesStr) {
            try {
              const storedRoles = JSON.parse(rolesStr) as string[];
              if (Array.isArray(storedRoles) && storedRoles.length > 0) {
                console.log('Usando roles almacenados en localStorage:', storedRoles);
                roles = storedRoles;
              }
            } catch (e) {
              console.error('Error al leer roles de localStorage:', e);
            }
          }
          
          // Si el usuario es admin, añadir roles de respaldo
          const userKey = localStorage.getItem('auth_user');
          if (userKey) {
            const userData = JSON.parse(userKey);
            if (userData.username === 'admin' && (!roles.length || !roles.includes('ROLE_ADMIN'))) {
              console.log('Forzando rol ROLE_ADMIN para usuario admin');
              roles = ['ROLE_ADMIN'];
              userData.roles = roles;
              localStorage.setItem('auth_user', JSON.stringify(userData));
              localStorage.setItem('user_roles', JSON.stringify(roles));
            }
          }
        }
      }
    } catch (e) {
      console.error('Error al decodificar token para verificar roles:', e);
    }
    
    console.log('Usando token para la petición:', token.substring(0, 15) + '...');
    // Crear objeto de headers con el token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    console.log('Headers generados:', headers.keys());
    return headers;
  }
    private handleError(error: HttpErrorResponse) {
    console.error('Error en UserService:', error);
    let errorMessage = 'Ha ocurrido un error';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      console.log('Estado del error en UserService:', error.status);
      
      if (error.status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
        console.log('Error 401 en UserService, redirigiendo al login');
        
        // Verificar si ya estamos en la página de login
        if (this.router.url.includes('/login')) {
          console.log('Ya estamos en la página de login, no redirigir');
          return throwError(() => new Error(errorMessage));
        }
        
        // Inspeccionar el token actual
        const token = this.authService.getToken();
        if (token) {
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              console.log('Token info:', {
                exp: new Date(payload.exp * 1000).toLocaleString(),
                expirado: new Date(payload.exp * 1000) < new Date() ? 'SÍ' : 'NO',
                sub: payload.sub || 'no disponible'
              });
            }
          } catch (e) {
            console.error('Error analizando token:', e);
          }
        }
        
        // En lugar de redirigir inmediatamente, guardamos la URL actual
        // para poder volver después de iniciar sesión
        const returnUrl = this.router.url || '/admin/usuarios';
        console.log(`Guardando URL de retorno: ${returnUrl}`);
        
        this.router.navigate(['/login'], {
          queryParams: { 
            returnUrl,
            reason: 'session_expired',
            timestamp: new Date().getTime() // Evitar caché
          }
        });
      } else if (error.status === 403) {
        errorMessage = 'No tiene permisos para realizar esta acción.';
      } else if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error (código ${error.status}): ${error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  private getImageUrl(imagePath: string | undefined): string | undefined {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http')) return imagePath;
    return `${environment.apiUrl}/uploads/${imagePath}`;
  }
  
  getAllUsers(): Observable<User[]> {
    console.log('Iniciando getAllUsers()');
    
    // Verificar si debemos usar datos simulados
    if (environment.useMockData) {
      console.log('Usando datos simulados para getAllUsers()');
      return of(this.getMockUsers()).pipe(
        tap(users => {
          console.log('Usuarios simulados cargados:', users);
          this.usersSubject.next(users);
        })
      );
    }
    
    // Verificar autenticación
    if (!this.authService.currentUserValue) {
      console.warn('No hay sesión de usuario al intentar cargar usuarios');
      // Intentar renovar la sesión automáticamente
      return this.authService.refreshToken().pipe(
        switchMap(() => {
          return this.loadRealUsers();
        }),
        catchError(error => {
          console.error('Error renovando token:', error);
          return throwError(() => new Error('No hay sesión de usuario activa. Por favor, inicia sesión nuevamente.'));
        })
      );
    }
    
    return this.loadRealUsers();
  }
  private loadRealUsers(): Observable<User[]> {
    // Lógica para cargar usuarios reales del backend
    console.log(`Realizando petición real GET a: ${this.apiUrl}`);
    
    // Verificar token antes de hacer la petición
    const token = this.authService.getToken();
    if (!token) {
      console.error('No hay token disponible para la petición de usuarios');
      return throwError(() => new Error('No hay token disponible'));
    }
    
    console.log('Token disponible para petición de usuarios:', token.substring(0, 15) + '...');
    
    // Creamos headers explícitos para esta petición crítica
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Requested-With': 'XMLHttpRequest' // Ayuda con CORS
    });
    
    // Realizar la petición con headers explícitos
    return this.http.get<User[]>(this.apiUrl, { headers, withCredentials: true }).pipe(
      map(users => {
        console.log('Respuesta sin procesar:', users);
        return users.map(user => ({
          ...user,
          photoUrl: user.photoUrl || user.profilePicture
        }));
      }),
      tap(users => {
        console.log('Usuarios procesados:', users);
        this.usersSubject.next(users);
      }),      catchError((error) => {
        console.error('Error en getAllUsers:', error);
        
        // Información de diagnóstico detallada
        if (error.status === 401) {
          console.error('Error 401 Unauthorized - Posible problema con el token');
          
          // Intentar decodificar el token para ver si está expirado
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const expiry = new Date(payload.exp * 1000);
              console.log('Token expira en:', expiry.toLocaleString());
              console.log('Hora actual:', new Date().toLocaleString());
              console.log('¿Token expirado?:', expiry < new Date() ? 'SÍ' : 'NO');
            }
          } catch (e) {
            console.error('Error decodificando token:', e);
          }
          
          // Intentar renovar el token automáticamente antes de devolver el error
          return this.authService.refreshToken().pipe(
            switchMap((response) => {
              console.log('Token renovado, reintentando obtener usuarios');
              const newToken = response.token || this.authService.getToken();              const newHeaders = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newToken}`,
                'X-Requested-With': 'XMLHttpRequest'
              });
                // Mostrar el token que estamos usando para diagnóstico
              console.log('Usando nuevo token para reintento:', newToken ? newToken.substring(0, 15) + '...' : 'token no disponible');
              
              // Hacemos la petición con el nuevo token
              return this.http.get<User[]>(this.apiUrl, { 
                headers: newHeaders,
                withCredentials: true 
              });
            }),
            map(users => {
              console.log('Respuesta después de renovar token:', users);
              return Array.isArray(users) ? users.map(user => ({
                ...user,
                photoUrl: user.photoUrl || user.profilePicture
              })) : [];
            }),
            tap(users => {
              console.log(`${users.length} usuarios procesados después de renovar token`);
              this.usersSubject.next(users);
            }),
            catchError(retryError => {
              console.error('Error después de renovar token:', retryError);
              return this.handleError(retryError);
            })
          );
        }
        return this.handleError(error);
      })
    );
  }

  getUsers(): Observable<User[]> {
    return this.getAllUsers();
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      map(user => ({
        ...user,
        photoUrl: user.photoUrl || user.profilePicture
      })),
      catchError(this.handleError.bind(this))
    );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  createUser(userData: RegisterUserDto): Observable<User> {
    console.log('Creando usuario con datos:', userData);
    return this.http.post<User>(this.apiUrl, userData, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(user => {
        console.log('Usuario creado exitosamente:', user);
        const currentUsers = this.usersSubject.value;
        this.usersSubject.next([...currentUsers, user]);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  updateUser(id: number, userData: UserUpdateDto): Observable<User> {
    console.log(`Actualizando usuario ID ${id} con datos:`, userData);
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(updatedUser => {
        console.log('Usuario actualizado exitosamente:', updatedUser);
        const currentUsers = this.usersSubject.value;
        const updatedUsers = currentUsers.map(user => 
          user.id === updatedUser.id ? updatedUser : user
        );
        this.usersSubject.next(updatedUsers);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  toggleUserStatus(id: number): Observable<void> {
    console.log(`Cambiando estado del usuario ID ${id}`);
    return this.http.post<void>(`${this.apiUrl}/${id}/toggle-status`, {}, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        console.log(`Estado del usuario ID ${id} actualizado correctamente`);
        const currentUsers = this.usersSubject.value;
        const updatedUsers = currentUsers.map(user => {
          if (user.id === id) {
            return { ...user, active: !user.active };
          }
          return user;
        });
        this.usersSubject.next(updatedUsers);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  deleteUser(userId: number): Observable<void> {
    const headers = this.getHeaders();
    return this.http.delete<void>(`${this.apiUrl}/${userId}`, { headers })
      .pipe(
        tap(() => {
          const users = this.usersSubject.value.filter(u => u.id !== userId);
          this.usersSubject.next(users);
        }),
        catchError(this.handleError.bind(this))
      );
  }

  uploadImage(formData: FormData): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('No hay sesión activa. Por favor, inicie sesión nuevamente.'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(`${environment.apiUrl}/api/upload/profile-picture`, formData, { 
      headers 
    }).pipe(
      map((response: any) => {
        if (response && response.url) {
          // Construir la URL completa
          return `${environment.apiUrl}/uploads/${response.url}`;
        }
        throw new Error('Error al procesar la respuesta del servidor');
      }),
      catchError(error => {
        console.error('Error en la carga de imagen:', error);
        if (error.status === 401) {
          this.authService.logoutPublic();
          return throwError(() => new Error('Sesión expirada. Por favor, inicie sesión nuevamente.'));
        }
        return throwError(() => new Error(error.error?.message || 'Error al subir la imagen'));
      })
    );
  }

  updateUserPhoto(id: number, photoUrl: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/photo`, { photoUrl }, {
      headers: this.getHeaders()
    }).pipe(
      tap(updatedUser => {
        console.log('Foto de usuario actualizada exitosamente:', updatedUser);
        const currentUsers = this.usersSubject.value;
        const updatedUsers = currentUsers.map(user => 
          user.id === updatedUser.id ? updatedUser : user
        );
        this.usersSubject.next(updatedUsers);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  uploadProfilePicture(userId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.apiUrl}/${userId}/upload-photo`, formData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.authService.getToken()}`
      })
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Método de diagnóstico para probar directamente el endpoint de usuarios
   */
  testUsersEndpoint(): Observable<any> {
    console.log('Ejecutando prueba directa de endpoint /api/users');
    
    // Obtener token directamente
    const token = this.authService.getToken();
    if (!token) {
      return of({
        success: false,
        message: 'No hay token de autenticación disponible'
      });
    }
    
    // Probar los tres formatos de autorización
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    console.log('Probando con formato "Bearer token"');
    console.log('Token utilizado:', token.substring(0, 20) + '...');
    
    return this.http.get(`${this.apiUrl}`, { 
      headers: headers
    }).pipe(
      map(() => ({
        success: true,
        message: 'Conexión exitosa con formato "Bearer token"'
      })),
      catchError((error: HttpErrorResponse) => {
        console.warn(`Error con formato "Bearer token": ${error.status}`);
        
        // Probar sin el prefijo "Bearer"
        const headersSimple = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': token
        });
        
        console.log('Probando con formato "token" (sin Bearer)');
        
        return this.http.get(`${this.apiUrl}`, { 
          headers: headersSimple
        }).pipe(
          map(() => ({
            success: true,
            message: 'Conexión exitosa con formato "token" (sin Bearer)'
          })),
          catchError((error2: HttpErrorResponse) => {
            return of({
              success: false,
              message: `Error de conexión (código ${error.status}): ${error.statusText}`,
              details: error.error
            });
          })
        );
      })
    );
  }

  /**
   * Método para diagnóstico de la sesión y el token
   * Útil para determinar problemas con la autenticación
   */  diagnoseSesion(): any {
    const token = this.authService.getToken();
    const currentUser = this.authService.currentUserValue;
    const isAuthenticated = this.authService.isAuthenticated();
    
    console.log('Diagnóstico de sesión:');
    console.log('- Usuario autenticado:', isAuthenticated ? 'SÍ' : 'NO');
    console.log('- Usuario actual:', currentUser?.username || 'No hay usuario');
    console.log('- Token presente:', token ? 'SÍ' : 'NO');
    
    // Definir el tipo de tokenInfo como any para evitar errores de tipo
    let tokenInfo: any = null;
    
    if (token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiry = new Date(payload.exp * 1000);
          const isExpired = expiry < new Date();
          
          tokenInfo = {
            subject: payload.sub || 'no disponible',
            roles: payload.roles || payload.authorities || 'no especificados',
            issuedAt: payload.iat ? new Date(payload.iat * 1000).toLocaleString() : 'no disponible',
            expiresAt: expiry.toLocaleString(),
            isExpired: isExpired,
            timeUntilExpiry: isExpired ? 'expirado' : `${Math.round((expiry.getTime() - Date.now()) / 1000 / 60)} minutos`
          };
          
          console.log('- Información del token:', tokenInfo);
        }
      } catch (e) {
        console.error('Error analizando token:', e);
        tokenInfo = { error: 'Error analizando token' };
      }
    }
    
    return {
      isAuthenticated,
      currentUser: currentUser ? {
        id: currentUser.id,
        username: currentUser.username,
        roles: currentUser.roles
      } : null,
      hasToken: !!token,
      tokenInfo
    };
  }
}
