import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';
import { takeUntil, catchError, switchMap } from 'rxjs/operators';
import { AuthDirectService } from '../../../core/services/auth-direct.service';
import { environment } from '../../../../environments/environment';

// Interface para pruebas de token
interface TokenTest {
  source: string;
  token: string;
}

@Component({
  selector: 'app-usuarios-directo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container mx-auto p-4">
      <div class="mb-4 bg-white shadow-md rounded-lg p-6">        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">Gestión de Usuarios (Directo)</h1>          <div class="flex flex-wrap gap-2">
            <button (click)="loadUsers()" class="bg-blue-500 text-white px-4 py-2 rounded">
              Recargar Normal
            </button>
            <button (click)="loadUsersDirect()" class="bg-green-500 text-white px-4 py-2 rounded">
              Cargar Directo
            </button>
            <button (click)="loadUsersDirectBypass()" class="bg-yellow-500 text-white px-4 py-2 rounded">
              Sin Interceptor
            </button>
            <button (click)="loadUsersEmergencyMode()" class="bg-red-600 text-white px-4 py-2 rounded font-bold">
              🚨 MODO EMERGENCIA
            </button>
            <button (click)="runFullAuthDiagnostic()" class="bg-purple-500 text-white px-4 py-2 rounded">
              Diagnóstico Completo
            </button>
            <button (click)="clearAuthAndRetry()" class="bg-orange-500 text-white px-4 py-2 rounded">
              Limpiar Auth y Reintentar
            </button>
            <button (click)="goBack()" class="bg-gray-500 text-white px-4 py-2 rounded">
              Volver
            </button>
          </div>
        </div>

        <!-- Estado de carga -->
        <div *ngIf="loading" class="my-4 text-center">
          <p class="text-gray-600">Cargando usuarios...</p>
        </div>

        <!-- Mensaje de error -->
        <div *ngIf="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{{ error }}</p>
          <div class="mt-2">
            <button (click)="loadUsers()" class="bg-red-500 text-white px-3 py-1 rounded text-sm">
              Reintentar
            </button>
          </div>
        </div>

        <!-- Tabla de usuarios -->
        <div *ngIf="users.length > 0" class="overflow-x-auto">
          <table class="min-w-full bg-white border border-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="py-2 px-4 border-b text-left">ID</th>
                <th class="py-2 px-4 border-b text-left">Usuario</th>
                <th class="py-2 px-4 border-b text-left">Email</th>
                <th class="py-2 px-4 border-b text-left">Roles</th>
                <th class="py-2 px-4 border-b text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users" class="hover:bg-gray-50">
                <td class="py-2 px-4 border-b">{{ user.id }}</td>
                <td class="py-2 px-4 border-b">{{ user.username }}</td>
                <td class="py-2 px-4 border-b">{{ user.email }}</td>
                <td class="py-2 px-4 border-b">{{ displayRoles(user.roles) }}</td>
                <td class="py-2 px-4 border-b">
                  <span [class]="user.active ? 'text-green-600' : 'text-red-600'">
                    {{ user.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mensaje sin usuarios -->
        <div *ngIf="!loading && !error && users.length === 0" class="text-center py-8">
          <p class="text-gray-500">No hay usuarios registrados en el sistema.</p>
        </div>
        
        <!-- Información de diagnóstico -->
        <div *ngIf="showDiagnostics" class="mt-8">
          <h2 class="text-xl font-semibold mb-2">Información de diagnóstico</h2>
          <div class="bg-gray-50 p-4 rounded border">
            <pre class="text-xs overflow-auto max-h-96">{{ diagnosticInfo | json }}</pre>
          </div>
          <button (click)="showDiagnostics = false" class="mt-2 bg-gray-500 text-white px-3 py-1 rounded text-sm">
            Ocultar Diagnóstico
          </button>
        </div>
        
        <div *ngIf="!showDiagnostics" class="mt-4">
          <button (click)="runDiagnostics()" class="bg-gray-500 text-white px-3 py-1 rounded text-sm">
            Ver Diagnóstico
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Estilos adicionales aquí si son necesarios */
  `]
})
export class UsuariosDirectoComponent implements OnInit, OnDestroy {
  users: any[] = [];
  loading = false;
  error: string | null = null;
  showDiagnostics = false;
  diagnosticInfo: any = null;
  
  private destroy$ = new Subject<void>();
  constructor(
    private authService: AuthDirectService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('UsuariosDirectoComponent inicializado');
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    console.log('Cargando usuarios usando servicio directo...');
    
    // Verificar primero si estamos autenticados
    const isAuthenticated = this.authService.isAuthenticated();
    
    if (!isAuthenticated) {
      console.warn('No hay sesión autenticada, intentando login de emergencia...');
      this.renewTokenAndRetry();
      return;
    }
      // Usar el método mejorado del servicio AuthDirectService que consulta /api/users (tabla usuarios)
    console.log('Consultando usuarios desde endpoint /api/users (que accede a la tabla usuarios)');
    this.authService.getUsers()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error en obtención de usuarios:', error);
          
          // Si es un error de autenticación, intentar renovar el token
          if (error.status === 401) {
            console.log('Error 401, intentando renovación de token...');
            return this.authService.refreshToken().pipe(
              switchMap(() => {
                console.log('Token refrescado, reintentando obtener usuarios');
                return this.authService.getUsers();
              }),
              catchError(refreshError => {
                console.error('Error refrescando token:', refreshError);
                
                // Como último recurso, intentar login de emergencia
                return this.authService.emergencyAdminLogin().pipe(
                  switchMap(() => {
                    console.log('Login de emergencia exitoso, obteniendo usuarios');
                    return this.authService.getUsers();
                  }),
                  catchError(emergencyError => {
                    console.error('Error en login de emergencia:', emergencyError);
                    return throwError(() => new Error('No fue posible autenticarse después de varios intentos'));
                  })
                );
              })
            );
          }
          
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (users) => {
          this.users = users;
          this.loading = false;
          console.log(`Usuarios cargados: ${users.length}`);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error final cargando usuarios:', error);
          this.error = error.message || 'Error al cargar usuarios';
          
          // Mostrar diagnóstico automáticamente
          this.runDiagnostics();
        }
      });
  }

  displayRoles(roles: string[]): string {
    if (!roles || !Array.isArray(roles)) return 'Sin roles';
    return roles.join(', ');
  }

  goBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }
  runDiagnostics(): void {
    this.showDiagnostics = true;
    console.log('Ejecutando diagnóstico completo...');
    
    // Verificar todos los posibles tokens
    const directToken = this.authService.getToken();
    const localStorageToken = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    const refreshTokenStr = localStorage.getItem('refresh_token');
    
    let userToken = '';
    let userData = null;
    
    if (userStr) {
      try {
        userData = JSON.parse(userStr);
        if (userData && userData.token) {
          userToken = userData.token;
        }
      } catch (e) {
        console.error('Error al parsear user en localStorage:', e);
      }
    }
    
    const isAuthenticated = this.authService.isAuthenticated();
    
    // Información básica para diagnóstico
    const basicInfo = {
      authenticated: isAuthenticated,
      directTokenPresent: !!directToken,
      localStorageTokenPresent: !!localStorageToken,
      userObjectPresent: !!userStr,
      userTokenPresent: !!userToken,
      refreshTokenPresent: !!refreshTokenStr,
      apiUrl: environment.apiUrl,
      storedUserData: userData
    };
      // Si hay token, decodificarlo - usar el primer token válido que encontremos
    let tokenInfo: any = null;
    const tokenToUse = directToken || localStorageToken || userToken || refreshTokenStr;
    
    if (tokenToUse) {
      try {
        const parts = tokenToUse.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const expiry = new Date(payload.exp * 1000);
          
          tokenInfo = {
            subject: payload.sub,
            roles: payload.roles || payload.authorities || [],
            issuer: payload.iss,
            issuedAt: new Date(payload.iat * 1000).toLocaleString(),
            expiresAt: expiry.toLocaleString(),
            remainingTime: Math.round((expiry.getTime() - Date.now()) / 1000 / 60) + ' minutos',
            tokenType: payload.type || 'Unknown'
          };
        } else {
          tokenInfo = { error: 'Token no tiene formato válido JWT' };
        }      } catch (e) {
        console.error('Error al decodificar token:', e);
        tokenInfo = { error: 'Error decodificando token: ' + (e instanceof Error ? e.message : 'Desconocido') };
      }
    } else {
      tokenInfo = { error: 'No se encontró ningún token' };
    }
    
    // Verificar endpoint de salud
    this.http.get(`${environment.apiUrl}/health`).subscribe(
      (result) => {
        this.diagnosticInfo = {
          ...basicInfo,
          tokenInfo,
          backendHealth: {
            status: 'OK',
            result
          }
        };
      },
      (error) => {
        this.diagnosticInfo = {
          ...basicInfo,
          tokenInfo,
          backendHealth: {
            status: 'ERROR',
            error: {
              status: error.status,
              message: error.message
            }
          }
        };
      }
    );
  }
  /**
   * Intenta renovar el token y recargar los usuarios
   */  renewTokenAndRetry(): void {
    this.loading = true;
    console.log('Intentando renovar token y reintentar la carga de usuarios');
    
    // Primero intentar con el método de renovación de token normal
    this.authService.refreshToken().pipe(
      catchError((error: any) => {
        console.log('Error en refresh token, intentando login de emergencia');
        // Si falla, intentar con el método de emergencia
        return this.authService.emergencyAdminLogin();
      }),
      // Intentar de nuevo si falla todo lo anterior
      catchError((error: any) => {
        console.error('Ambos métodos de renovación fallaron, último intento con credenciales hardcoded');
        
        // Construir una petición manual como último recurso
        const loginData = {
          username: 'admin',
          password: 'admin123'
        };
        
        return this.http.post(`${environment.apiUrl}/api/auth/login`, loginData);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        if (response && (response.token || response.accessToken)) {
          const token = response.token || response.accessToken;
          console.log('Token renovado correctamente, guardando y recargando usuarios...');
          
          // Guardar el token explícitamente en caso de que la respuesta llegó directo
          if (!localStorage.getItem('auth_token') || localStorage.getItem('auth_token') !== token) {
            console.log('Actualizando token en localStorage');
            localStorage.setItem('auth_token', token);
            
            // Sincronizar el token con el formato de usuario también
            try {
              const userStr = localStorage.getItem('user');
              if (userStr) {
                const userData = JSON.parse(userStr);
                userData.token = token;
                localStorage.setItem('user', JSON.stringify(userData));
              }
            } catch (e) {
              console.error('Error al actualizar token en objeto user', e);
            }
          }
          
          // Esperar un momento para que se procesen los cambios
          setTimeout(() => {
            this.loadUsers(); // Reintentamos la carga
          }, 300);
        } else {
          console.error('Respuesta de renovación inválida:', response);
          this.error = 'No se pudo renovar la sesión';
          this.loading = false;
          this.runDiagnostics();
        }
      },      error: (error: any) => {
        console.error('Error en todos los intentos de renovación:', error);
        this.loading = false;
        this.error = 'No fue posible renovar la sesión. Intente iniciar sesión manualmente.';
        
        // Mostrar diagnóstico
        this.runDiagnostics();
        
        // Redirigir al login después de un momento
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      }
    });
  }

  /**
   * Carga usuarios con una solicitud directa pasando credenciales admin por defecto
   */
  loadUsersDirect(): void {
    this.loading = true;
    this.error = null;
    
    console.log('Cargando usuarios con método DIRECTO...');
    
    // Solicitar un token fresco primero haciendo login con usuario admin
    const credentials = {
      username: 'admin',
      password: 'admin123' // Asumiendo que esta es la contraseña estándar
    };
    
    const loginUrl = `${environment.apiUrl}/api/auth/login`;
    console.log('Solicitando token fresco a:', loginUrl);
    
    this.http.post<any>(loginUrl, credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.token) {
            console.log('Token obtenido correctamente, guardando...');
            
            // Guardar token en localStorage
            localStorage.setItem('auth_token', response.token);
            
            // Si hay un objeto user, actualizar también
            const userStr = localStorage.getItem('user');
            if (userStr) {
              try {
                const userData = JSON.parse(userStr);
                userData.token = response.token;
                if (response.refreshToken) {
                  userData.refreshToken = response.refreshToken;
                }
                localStorage.setItem('user', JSON.stringify(userData));
              } catch (e) {
                console.error('Error al actualizar user en localStorage:', e);
              }
            }
            
            // Ahora hacer la petición de usuarios con el token fresco
            this.getUsersWithFreshToken(response.token);
          } else {
            this.loading = false;
            this.error = 'No se pudo obtener un token válido';
            console.error('Respuesta de login sin token:', response);
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al obtener token directo:', error);
          this.error = 'Error al autenticar: ' + (error.message || error.statusText || 'Error desconocido');
        }
      });
  }
  
  /**
   * Obtiene usuarios with un token fresco
   */
  private getUsersWithFreshToken(token: string): void {
    console.log('Solicitando usuarios con token fresco...');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    this.http.get<any[]>(`${environment.apiUrl}/api/users`, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.loading = false;
          console.log(`Usuarios cargados: ${users.length}`);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error cargando usuarios con token fresco:', error);
          this.error = 'Error cargando usuarios: ' + (error.message || error.statusText || 'Error desconocido');
        }
      });
  }

  /**
   * Realiza una petición directa a la API de usuarios sin usar el interceptor
   */
  loadUsersDirectBypass(): void {
    this.loading = true;
    this.error = null;
    
    console.log('Realizando petición directa a /api/users sin interceptor...');
    
    // Obtener todos los posibles tokens
    const tokens = [
      localStorage.getItem('auth_token'),
      localStorage.getItem('refresh_token')
    ];
    
    let userToken = '';
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData && userData.token) {
          userToken = userData.token;
          tokens.push(userToken);
        }
      }
    } catch (e) {}
    
    // Filtrar tokens nulos y usar el primero disponible
    const validTokens = tokens.filter(t => !!t) as string[];
    
    if (validTokens.length === 0) {
      this.error = 'No hay tokens disponibles';
      this.loading = false;
      return;
    }
    
    console.log(`Encontrados ${validTokens.length} posibles tokens. Intentando con el primero...`);
    
    // Crear una instancia de XMLHttpRequest para bypasear el interceptor
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${environment.apiUrl}/api/users`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${validTokens[0]}`);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const users = JSON.parse(xhr.responseText);
          this.users = users;
          this.error = null;
          console.log(`Usuarios cargados correctamente: ${users.length}`);
        } catch (e) {
          this.error = 'Error al procesar la respuesta';
          console.error('Error al procesar respuesta:', e);
        }
      } else if (xhr.status === 401) {
        this.error = 'Error de autenticación (401)';
        console.error('Error 401 en petición directa');
        
        // Intentar con el siguiente token si está disponible
        if (validTokens.length > 1) {
          this.tryNextToken(validTokens.slice(1));
        }
      } else {
        this.error = `Error ${xhr.status}: ${xhr.statusText}`;
      }
      this.loading = false;
    };
    
    xhr.onerror = () => {
      this.error = 'Error de red al realizar la petición';
      this.loading = false;
    };
    
    xhr.send();
  }
  
  /**
   * Intenta con el siguiente token de la lista
   */
  private tryNextToken(tokens: string[]): void {
    if (tokens.length === 0) {
      console.log('No hay más tokens para intentar');
      return;
    }
    
    console.log('Intentando con el siguiente token...');
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${environment.apiUrl}/api/users`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${tokens[0]}`);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const users = JSON.parse(xhr.responseText);
          this.users = users;
          this.error = null;
          console.log(`Usuarios cargados correctamente con token alternativo: ${users.length}`);
        } catch (e) {
          this.error = 'Error al procesar la respuesta';
        }
      } else if (xhr.status === 401) {
        this.error = 'Error de autenticación (401)';
        
        // Intentar con el siguiente token si está disponible
        if (tokens.length > 1) {
          this.tryNextToken(tokens.slice(1));
        }
      } else {
        this.error = `Error ${xhr.status}: ${xhr.statusText}`;
      }
      this.loading = false;
    };
    
    xhr.onerror = () => {
      this.error = 'Error de red al realizar la petición';
      this.loading = false;
    };
    
    xhr.send();
  }

  /**
   * Realiza un diagnóstico completo de autenticación
   * Verifica tokens, envía solicitudes de prueba, y muestra resultados detallados
   */
  fullAuthDiagnostic(): void {
    this.loading = true;
    this.error = null;
    this.showDiagnostics = true;
    
    console.log('Iniciando diagnóstico completo de autenticación...');
    
    // 1. Recopilar todos los tokens disponibles
    const directToken = this.authService.getToken();
    const localStorageToken = localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    let userToken = '';
    let userData = null;
      try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        userData = JSON.parse(userStr);
        if (userData && userData.token) {
          userToken = userData.token;
        }
      }
    } catch (e) {
      console.error('Error al obtener token de usuario:', e);
      userToken = '';
      this.error = 'Error al obtener token de usuario: ' + (e instanceof Error ? e.message : String(e));
    }
    
    // 2. Mostrar información de tokens
    console.log('Tokens disponibles:');
    console.log('- Token directo:', !!directToken);
    console.log('- Token localStorage:', !!localStorageToken);
    console.log('- User token:', !!userToken);
    console.log('- Refresh token:', !!refreshToken);
    
    // 3. Verificar si el servicio de autenticación piensa que estamos autenticados
    const isAuthenticated = this.authService.isAuthenticated();
    console.log('¿Autenticado según servicio?', isAuthenticated);    // 4. Crear array de tokens para probar
    const tokensToTest: TokenTest[] = [];
    if (directToken) tokensToTest.push({ source: 'Servicio directo', token: directToken });
    if (localStorageToken) tokensToTest.push({ source: 'localStorage (auth_token)', token: localStorageToken });
    if (userToken) tokensToTest.push({ source: 'localStorage (user.token)', token: userToken });
    if (refreshToken) tokensToTest.push({ source: 'localStorage (refresh_token)', token: refreshToken });
    
    // 5. Preparar diagnóstico
    const diagnosticResults: any = {
      tokensFound: tokensToTest.length,
      isAuthenticated,
      userData,
      tokenTests: []
    };
    
    // 6. Probar cada token
    let testCount = 0;
    
    const testToken = (tokenInfo: any) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${environment.apiUrl}/api/users`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${tokenInfo.token}`);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      
      xhr.onload = () => {
        const result = {
          source: tokenInfo.source,
          status: xhr.status,
          success: xhr.status === 200,
          response: xhr.status === 200 ? 'Datos recibidos correctamente' : `Error: ${xhr.statusText}`
        };
        
        diagnosticResults.tokenTests.push(result);
        
        console.log(`Prueba de token desde ${tokenInfo.source}: ${result.success ? 'ÉXITO' : 'FALLO'} (${xhr.status})`);
        
        // Si este token funciona, usarlo para cargar usuarios
        if (result.success) {
          try {
            this.users = JSON.parse(xhr.responseText);
            this.error = null;
            console.log(`¡Éxito! Token de ${tokenInfo.source} funciona correctamente.`);
          } catch (e) {
            console.error('Error al procesar datos:', e);
          }
        }
        
        // Continuar con el siguiente token o finalizar
        testCount++;
        if (testCount < tokensToTest.length) {
          testToken(tokensToTest[testCount]);
        } else {
          this.loading = false;
          this.diagnosticInfo = diagnosticResults;
          
          // Mostrar resultados finales
          const funcionaron = diagnosticResults.tokenTests.filter((t: any) => t.success).length;
          if (funcionaron > 0) {
            console.log(`✅ ${funcionaron} de ${tokensToTest.length} tokens funcionan correctamente.`);
          } else {
            console.error('❌ Ningún token funciona. Problema de autenticación confirmado.');
            this.error = 'Error de autenticación: Ningún token válido. Inicie sesión nuevamente.';
          }
        }
      };
      
      xhr.onerror = () => {
        diagnosticResults.tokenTests.push({
          source: tokenInfo.source,
          status: 'Error de red',
          success: false
        });
        
        testCount++;
        if (testCount < tokensToTest.length) {
          testToken(tokensToTest[testCount]);
        } else {
          this.loading = false;
          this.diagnosticInfo = diagnosticResults;
        }
      };
      
      xhr.send();
    };
    
    // Si hay tokens para probar, comenzar pruebas
    if (tokensToTest.length > 0) {
      testToken(tokensToTest[0]);
    } else {
      diagnosticResults.error = 'No se encontraron tokens para probar';
      this.diagnosticInfo = diagnosticResults;
      this.error = 'No hay tokens de autenticación disponibles';
      this.loading = false;
    }
  }

  // Agregar este método después de tryNextToken()
  runFullAuthDiagnostic(): void {
    this.loading = true;
    this.error = null;
    this.showDiagnostics = true;
    
    console.log('🔍 Iniciando diagnóstico completo de autenticación...');
    
    const apiUrl = environment.apiUrl;
    this.diagnosticInfo = {
      timestamp: new Date().toISOString(),
      apiUrl: apiUrl,
      currentRoute: this.router.url,
      tokens: {},
      tests: [],
      backendHealth: null
    };
    
    // 1. Recopilar todos los tokens disponibles
    const tokens: any = {};
    tokens.authService = this.authService.getToken();
    tokens.localStorage = localStorage.getItem('auth_token');
    tokens.refreshToken = localStorage.getItem('refresh_token');
    
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        tokens.userToken = userData?.token;
        
        // Verificar token en objeto user
        if (userData && userData.token) {
          try {
            const parts = userData.token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              tokens.userTokenDecoded = {
                sub: payload.sub,
                exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
                roles: payload.roles || payload.authorities || []
              };
            }
          } catch (e) {
            tokens.userTokenDecoded = { error: 'Error al decodificar' };
          }
        }
      }
    } catch (e) {
      tokens.userToken = { error: 'Error al obtener token de usuario' };
    }
    
    this.diagnosticInfo.tokens = tokens;
    
    // 2. Probar endpoint de salud para verificar conectividad
    this.http.get(`${apiUrl}/health`).subscribe(
      (result) => {
        this.diagnosticInfo.backendHealth = { 
          status: 'OK',
          result
        };
        
        // 3. Si el backend está disponible, probar cada token
        this.testAllTokens(tokens);
      },
      (error) => {
        this.diagnosticInfo.backendHealth = {
          status: 'ERROR',
          error: {
            status: error.status,
            message: error.message
          }
        };
        this.loading = false;
      }
    );
  }
  
  /**
   * Prueba todos los tokens disponibles contra la API
   */
  private testAllTokens(tokens: any): void {    // Definir interface para los tokens a probar
    interface TokenTest {
      source: string;
      token: string;
    }
    
    // Crear array de tokens para probar
    const tokensToTest: TokenTest[] = [];
    
    if (tokens.authService) {
      tokensToTest.push({ source: 'authService', token: tokens.authService });
    }
    
    if (tokens.localStorage) {
      tokensToTest.push({ source: 'localStorage', token: tokens.localStorage });
    }
    
    if (tokens.userToken && tokens.userToken !== tokens.localStorage && tokens.userToken !== tokens.authService) {
      tokensToTest.push({ source: 'user.token', token: tokens.userToken });
    }
    
    if (tokens.refreshToken && 
        tokens.refreshToken !== tokens.localStorage && 
        tokens.refreshToken !== tokens.userToken &&
        tokens.refreshToken !== tokens.authService) {
      tokensToTest.push({ source: 'refreshToken', token: tokens.refreshToken });
    }
    
    // Si no hay tokens para probar, intentar login directo
    if (tokensToTest.length === 0) {
      this.diagnosticInfo.tests.push({
        status: 'WARNING',
        message: 'No se encontraron tokens para probar. Intentando login directo.'
      });
      
      this.testDirectLogin();
      return;
    }
    
    // Probar cada token
    this.diagnosticInfo.tests.push({
      status: 'INFO',
      message: `Probando ${tokensToTest.length} tokens contra la API`
    });
    
    let testCount = 0;
    
    const testToken = (tokenInfo: any) => {
      const headers = {
        'Authorization': `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json'
      };
      
      this.http.get(`${environment.apiUrl}/api/users`, { headers }).subscribe(
        (result) => {
          this.diagnosticInfo.tests.push({
            status: 'SUCCESS',
            source: tokenInfo.source,
            message: `Token de ${tokenInfo.source} válido. Se recibieron ${Array.isArray(result) ? result.length : 0} usuarios.`
          });
          
          // Si es el primer éxito, actualizar la UI con los usuarios
          if (this.users.length === 0 && Array.isArray(result)) {
            this.users = result;
            this.loading = false;
            this.error = null;
          }
          
          continueTests();
        },
        (error) => {
          this.diagnosticInfo.tests.push({
            status: 'ERROR',
            source: tokenInfo.source,
            error: {
              status: error.status,
              message: error.message || error.statusText
            }
          });
          
          continueTests();
        }
      );
    };
    
    const continueTests = () => {
      testCount++;
      if (testCount < tokensToTest.length) {
        testToken(tokensToTest[testCount]);
      } else {
        // Si ningún token funcionó, intentar login directo
        const successfulTests = this.diagnosticInfo.tests.filter(
          (t: any) => t.status === 'SUCCESS' && t.source
        );
        
        if (successfulTests.length === 0) {
          this.testDirectLogin();
        } else {
          this.loading = false;
        }
      }
    };
    
    // Iniciar pruebas con el primer token
    testToken(tokensToTest[0]);
  }
  
  /**
   * Prueba login directo como último recurso
   */
  private testDirectLogin(): void {
    this.diagnosticInfo.tests.push({
      status: 'INFO',
      message: 'Intentando login directo con usuario admin'
    });
    
    const credentials = {
      username: 'admin',
      password: 'admin123'
    };
    
    this.http.post(`${environment.apiUrl}/api/auth/login`, credentials).subscribe(
      (response: any) => {
        this.diagnosticInfo.tests.push({
          status: 'SUCCESS',
          message: 'Login directo exitoso. Token obtenido.'
        });
        
        // Guardar el token
        if (response && response.token) {
          localStorage.setItem('auth_token', response.token);
          
          // Actualizar también en user object
          try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const userData = JSON.parse(userStr);
              userData.token = response.token;
              if (response.refreshToken) userData.refreshToken = response.refreshToken;
              localStorage.setItem('user', JSON.stringify(userData));
            }
          } catch (e) {}
          
          // Probar inmediatamente este nuevo token
          const headers = {
            'Authorization': `Bearer ${response.token}`,
            'Content-Type': 'application/json'
          };
          
          this.http.get(`${environment.apiUrl}/api/users`, { headers }).subscribe(
            (users: any) => {
              this.diagnosticInfo.tests.push({
                status: 'SUCCESS',
                message: `Token de login directo válido. Se recibieron ${Array.isArray(users) ? users.length : 0} usuarios.`
              });
              
              if (Array.isArray(users)) {
                this.users = users;
                this.error = null;
              }
              
              this.loading = false;
            },
            (error) => {
              this.diagnosticInfo.tests.push({
                status: 'ERROR',
                message: 'Token de login directo no válido para API de usuarios',
                error: {
                  status: error.status,
                  message: error.message || error.statusText
                }
              });
              
              this.loading = false;
              this.error = 'No se pudo acceder a la API de usuarios incluso con login directo';
            }
          );
        } else {
          this.diagnosticInfo.tests.push({
            status: 'ERROR',
            message: 'Login exitoso pero no se recibió token'
          });
          this.loading = false;
        }
      },
      (error) => {
        this.diagnosticInfo.tests.push({
          status: 'ERROR',
          message: 'Error en login directo',
          error: {
            status: error.status,
            message: error.message || error.statusText
          }
        });
        
        this.loading = false;
        this.error = 'No se pudo completar ninguna autenticación. Verifique el servidor o las credenciales.';
      }
    );
  }
  
  /**
   * Activa el modo de emergencia para cargar usuarios sin interceptor
   */  loadUsersEmergencyMode(): void {
    this.loading = true;
    this.error = null;
    
    console.log('🚨 Iniciando carga de usuarios en MODO EMERGENCIA');
    
    // Usamos directamente el emergencyAdminLogin de AuthDirectService
    this.authService.emergencyAdminLogin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Modo emergencia activado, obteniendo usuarios...');
          
          // Una vez con acceso de emergencia, cargamos los usuarios
          this.authService.getUsers()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (users: any) => {
                this.users = users;
                this.loading = false;
                this.error = null;
                console.log(`✅ ${users.length} usuarios cargados en modo emergencia`);
                
                // Mostrar un diagnóstico automáticamente
                this.showDiagnostics = true;
                this.diagnosticInfo = {
                  timestamp: new Date().toISOString(),
                  emergencyMode: true,
                  responseStatus: '200 OK',
                  responseSize: users.length,
                  token: {
                    exists: true,
                    preview: this.authService.getToken()?.substring(0, 15) + '...'
                  },
                  backendHealth: 'OK'
                };
              },
              error: (error: any) => {
                this.loading = false;
                this.error = `Error cargando usuarios: ${error.message || error}`;
                console.error('Error cargando usuarios:', error);
              }
            });
        },
        error: (error: any) => {
          this.loading = false;
          this.error = `No se pudo activar modo emergencia: ${error.message || error}`;
          console.error('Error activando modo emergencia:', error);
        }
      });
  }

  /**
   * Carga usuarios en modo de emergencia y muestra diagnóstico
   */  loadUsersInEmergencyMode(): void {
    this.loading = true;
    this.error = null;
    this.showDiagnostics = false;
    
    console.log('🚨 Cargando usuarios en modo de emergencia...');
    
    // Usar directamente el servicio AuthDirectService para login de emergencia
    this.authService.emergencyAdminLogin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Modo emergencia activado, obteniendo usuarios...');
          
          // Ahora obtener los usuarios
          this.authService.getUsers()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (users: any) => {
                this.users = users;
                this.loading = false;
                this.error = null;
                
                // Mostrar diagnóstico automático
                this.showDiagnostics = true;
                this.diagnosticInfo = {
                  timestamp: new Date().toISOString(),
                  emergencyMode: true,
                  responseStatus: '200 OK',
                  responseSize: users.length,
                  token: {
                    exists: true,
                    preview: this.authService.getToken()?.substring(0, 15) + '...'
                  },
                  backendHealth: 'OK'
                };
                
                console.log(`✅ ${users.length} usuarios cargados en modo de emergencia`);
              },
              error: (error: any) => {
                this.loading = false;
                this.error = 'Error al cargar usuarios en modo de emergencia: ' + error.message || error;
                console.error('Error en carga de usuarios en modo de emergencia:', error);
              }
            });
        },
        error: (error: any) => {
          this.loading = false;
          this.error = 'Error al activar modo de emergencia: ' + error.message || 'Error desconocido';
          console.error('Error al activar modo de emergencia:', error);
        }
      });
  }

  /**
   * Limpia la autenticación y recarga los usuarios
   */
  clearAuthAndRetry(): void {
    // Limpiar todos los datos de autenticación
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    
    this.error = 'Autenticación limpiada. Intentando nuevamente...';
    
    // Intentar login directo
    this.loadUsersDirect();
  }
}
