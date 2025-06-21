import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auth-flow-debug',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  template: `
    <div class="container mx-auto p-4 bg-white shadow-lg rounded-lg">
      <h1 class="text-2xl font-bold mb-4 text-center">Depurador de Flujo de Autenticación</h1>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h2 class="font-bold">¿Te redirige a login después de iniciar sesión?</h2>
        <p class="mb-2">Esta herramienta analiza paso a paso el flujo de autenticación para encontrar exactamente dónde ocurre el problema.</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Panel de credenciales -->
        <div class="bg-white shadow rounded p-4">
          <h3 class="font-semibold text-lg mb-3">Credenciales</h3>
          <div class="mb-3">
            <label class="block text-sm mb-1">Usuario</label>
            <input [(ngModel)]="credentials.username" class="w-full border rounded p-2" placeholder="admin" />
          </div>
          <div class="mb-3">
            <label class="block text-sm mb-1">Contraseña</label>
            <input [(ngModel)]="credentials.password" type="password" class="w-full border rounded p-2" placeholder="********" />
          </div>
          <div class="text-center">
            <button (click)="iniciarPrueba()" 
                    class="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded">
              Iniciar Análisis
            </button>
          </div>
        </div>
        
        <!-- Panel de resultados -->
        <div class="bg-gray-50 shadow rounded p-4">
          <h3 class="font-semibold text-lg mb-3">Estado de la Prueba</h3>
          <div *ngIf="!isRunning && !results.length" class="text-center text-gray-500 p-4">
            Presiona "Iniciar Análisis" para comenzar la prueba
          </div>
          <div *ngIf="isRunning" class="text-center text-blue-600 p-4">
            Ejecutando análisis... Por favor espera.
          </div>
          <div *ngIf="results.length > 0" class="mt-4">
            <div *ngFor="let result of results; let i = index" class="mb-2 p-3 rounded" 
                [ngClass]="{'bg-green-50': result.success, 'bg-red-50': !result.success}">
              <div class="flex items-start">
                <span class="mr-2" [ngClass]="{'text-green-600': result.success, 'text-red-600': !result.success}">
                  {{ result.success ? '✅' : '❌' }}
                </span>
                <div>
                  <h4 class="font-semibold">{{ i + 1 }}. {{ result.name }}</h4>
                  <p class="text-sm">{{ result.message }}</p>
                  <div *ngIf="result.details" class="mt-2">
                    <button (click)="result.showDetails = !result.showDetails" 
                            class="text-xs text-blue-600 underline">
                      {{ result.showDetails ? 'Ocultar detalles' : 'Ver detalles' }}
                    </button>
                    <pre *ngIf="result.showDetails" class="mt-2 bg-gray-100 p-2 text-xs overflow-auto">{{ result.details | json }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Diagnóstico y recomendaciones -->
      <div *ngIf="diagnosis" class="mt-6 bg-white shadow rounded p-4">
        <h3 class="text-lg font-semibold mb-3 border-b pb-2">Diagnóstico</h3>
        <div class="mb-4" [ngClass]="{'text-red-600': diagnosis.severity === 'high', 'text-orange-600': diagnosis.severity === 'medium', 'text-blue-600': diagnosis.severity === 'low'}">
          <p class="font-bold mb-2">{{ diagnosis.title }}</p>
          <p>{{ diagnosis.description }}</p>
        </div>
        
        <h3 class="text-lg font-semibold mb-3 border-b pb-2">Solución Recomendada</h3>
        <ul class="list-disc pl-6">
          <li *ngFor="let step of diagnosis.solution" class="mb-2">
            {{ step }}
          </li>
        </ul>
        
        <div class="mt-6 flex justify-between">
          <button (click)="iniciarPrueba()" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
            Reiniciar Prueba
          </button>
          <button (click)="irADiagnosticoCompleto()" class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded">
            Diagnóstico Completo
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AuthFlowDebugComponent implements OnInit {
  apiUrl = environment.apiUrl;
  isRunning = false;
  results: any[] = [];
  diagnosis: any = null;
  
  credentials = {
    username: 'admin',
    password: 'admin123'
  };
  
  token: string | null = null;
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Verificar si ya hay un token guardado
    const savedToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (savedToken) {
      this.token = savedToken;
      this.addResult({
        name: 'Token encontrado',
        message: 'Se encontró un token guardado en el navegador',
        success: true,
        details: { tokenLength: savedToken.length, tokenStart: savedToken.substring(0, 20) + '...' }
      });
    }
  }
  
  /**
   * Inicia toda la serie de pruebas
   */
  iniciarPrueba(): void {
    this.results = [];
    this.diagnosis = null;
    this.isRunning = true;
    
    // Iniciar el flujo de pruebas
    this.probarConexionBackend();
  }
  
  /**
   * Prueba 1: Verificar conexión con el backend
   */
  private probarConexionBackend(): void {
    this.http.get(`${this.apiUrl}/health`).subscribe({
      next: (response: any) => {
        this.addResult({
          name: 'Conexión al backend',
          message: 'El servidor backend está en línea y respondiendo correctamente',
          success: true,
          details: response
        });
        
        // Siguiente prueba
        this.probarAutenticacion();
      },
      error: (error: HttpErrorResponse) => {
        this.addResult({
          name: 'Conexión al backend',
          message: `Error de conexión: ${error.message}`,
          success: false,
          details: {
            status: error.status,
            statusText: error.statusText,
            message: error.message
          }
        });
        
        this.finalizarPruebas('backend_down');
      }
    });
  }
  
  /**
   * Prueba 2: Intentar autenticación
   */
  private probarAutenticacion(): void {
    this.http.post(`${this.apiUrl}/api/auth/login`, this.credentials).subscribe({
      next: (response: any) => {
        if (response && response.token) {
          this.token = response.token;
          
          // Guardar token y datos de usuario como lo haría la app real
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('auth_user', JSON.stringify({
            username: response.username || this.credentials.username,
            roles: response.roles || []
          }));
          
          this.addResult({
            name: 'Autenticación',
            message: 'Inicio de sesión exitoso, token recibido y guardado',
            success: true,
            details: {
              username: response.username || this.credentials.username,
              roles: response.roles || [],
              tokenLength: response.token.length,
              tokenStart: response.token.substring(0, 20) + '...'
            }
          });
          
          // Siguiente prueba
          this.probarAccesoApiUsuarios();
        } else {
          this.addResult({
            name: 'Autenticación',
            message: 'La autenticación fue exitosa pero no se recibió un token',
            success: false,
            details: response
          });
          
          this.finalizarPruebas('no_token');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.addResult({
          name: 'Autenticación',
          message: `Error en autenticación: ${error.message}`,
          success: false,
          details: {
            status: error.status,
            statusText: error.statusText,
            error: error.error
          }
        });
        
        this.finalizarPruebas('auth_error');
      }
    });
  }
  
  /**
   * Prueba 3: Probar acceso a API protegida de usuarios
   */
  private probarAccesoApiUsuarios(): void {
    if (!this.token) {
      this.addResult({
        name: 'Acceso a usuarios',
        message: 'No hay token disponible para realizar la prueba',
        success: false
      });
      
      this.finalizarPruebas('token_missing');
      return;
    }
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`
    });
    
    this.http.get(`${this.apiUrl}/api/users`, { headers }).subscribe({
      next: (response: any) => {
        this.addResult({
          name: 'Acceso a usuarios',
          message: `Se obtuvo acceso exitoso a la API de usuarios. Se encontraron ${response.length} usuarios.`,
          success: true,
          details: {
            usersCount: response.length,
            firstUser: response.length > 0 ? response[0] : null
          }
        });
        
        // Siguiente prueba: Simular navegación
        this.probarNavegacion();
      },
      error: (error: HttpErrorResponse) => {
        this.addResult({
          name: 'Acceso a usuarios',
          message: `Error al acceder a API de usuarios: ${error.message}`,
          success: false,
          details: {
            status: error.status,
            statusText: error.statusText,
            error: error.error
          }
        });
        
        this.finalizarPruebas('api_access_error');
      }
    });
  }
  
  /**
   * Prueba 4: Probar validación de token en navegación
   */
  private probarNavegacion(): void {
    // Verificar si hay datos de usuario guardados
    const userStr = localStorage.getItem('auth_user');
    if (!userStr) {
      this.addResult({
        name: 'Información de usuario',
        message: 'No se encontró información de usuario guardada en el navegador',
        success: false
      });
      
      this.finalizarPruebas('user_data_missing');
      return;
    }
    
    // Analizar si hay datos de roles
    try {
      const userData = JSON.parse(userStr);
      const hasRoles = userData && Array.isArray(userData.roles) && userData.roles.length > 0;
      const hasAdminRole = hasRoles && userData.roles.some((role: string) => 
        role === 'ROLE_ADMIN' || role === 'ADMIN'
      );
      
      if (!hasRoles) {
        this.addResult({
          name: 'Roles de usuario',
          message: 'El usuario no tiene roles definidos',
          success: false,
          details: userData
        });
        
        this.finalizarPruebas('no_roles');
      } else if (!hasAdminRole) {
        this.addResult({
          name: 'Rol Administrador',
          message: 'El usuario no tiene el rol ROLE_ADMIN necesario para acceder a la sección de usuarios',
          success: false,
          details: {
            availableRoles: userData.roles
          }
        });
        
        this.finalizarPruebas('not_admin');
      } else {
        this.addResult({
          name: 'Roles de usuario',
          message: 'El usuario tiene el rol ROLE_ADMIN necesario',
          success: true,
          details: {
            roles: userData.roles
          }
        });
        
        // Verificar funcionalidad de token en localStorage
        this.validarAlmacenamientoToken();
      }
    } catch (error) {
      this.addResult({
        name: 'Información de usuario',
        message: 'Error al analizar los datos de usuario guardados',
        success: false,
        details: { 
          error: (error instanceof Error) ? error.message : 'Error desconocido',
          userDataRaw: userStr
        }
      });
      
      this.finalizarPruebas('user_data_invalid');
    }
  }
  
  /**
   * Prueba final: Verificar almacenamiento consistente del token
   */
  private validarAlmacenamientoToken(): void {
    const authToken = localStorage.getItem('auth_token');
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('auth_user');
    const userOldStr = localStorage.getItem('user');
    
    // Verificar los diferentes tokens para buscar inconsistencias
    if (!authToken && !token) {
      this.addResult({
        name: 'Almacenamiento de token',
        message: 'No se encontró token en ninguna ubicación de almacenamiento',
        success: false
      });
      
      this.finalizarPruebas('token_not_stored');
      return;
    }
    
    // Verificar inconsistencias entre token almacenados
    if (authToken && token && authToken !== token) {
      this.addResult({
        name: 'Tokens inconsistentes',
        message: 'Se encontraron diferentes tokens almacenados en distintas claves',
        success: false,
        details: {
          'auth_token': authToken.substring(0, 15) + '...',
          'token': token.substring(0, 15) + '...'
        }
      });
    } else {
      this.addResult({
        name: 'Almacenamiento de token',
        message: 'El token está almacenado correctamente',
        success: true
      });
    }
    
    // Verificar UserInfo en diferentes ubicaciones
    if (userStr && userOldStr && userStr !== userOldStr) {
      this.addResult({
        name: 'Datos de usuario inconsistentes',
        message: 'Se encontraron diferentes datos de usuario almacenados',
        success: false,
        details: {
          'auth_user': JSON.parse(userStr),
          'user': JSON.parse(userOldStr)
        }
      });
    }
    
    // Todas las pruebas completadas con éxito
    this.finalizarPruebas('all_success');
  }
  
  /**
   * Finalizar pruebas y mostrar diagnóstico según el código de error
   */
  private finalizarPruebas(resultCode: string): void {
    this.isRunning = false;
    
    // Generar diagnóstico según el código
    switch (resultCode) {
      case 'backend_down':
        this.diagnosis = {
          severity: 'high',
          title: 'El servidor backend no está respondiendo',
          description: 'No se pudo establecer conexión con el servidor backend. Este es el problema principal que impide todo el flujo de autenticación.',
          solution: [
            'Verifica que el servidor backend esté en ejecución en el puerto correcto (8088).',
            'Ejecuta el servidor con: cd backend && java -jar target/avicola_backend-0.0.1-SNAPSHOT.jar',
            'Asegúrate de que no haya errores en la consola del servidor.',
            'Verifica que el puerto 8088 no esté siendo utilizado por otra aplicación.'
          ]
        };
        break;
      
      case 'auth_error':
        this.diagnosis = {
          severity: 'high',
          title: 'Error en la autenticación',
          description: 'El servidor backend rechazó las credenciales proporcionadas.',
          solution: [
            'Verifica que las credenciales sean correctas.',
            'Asegúrate de que el usuario exista en la base de datos.',
            'Revisa los logs del backend para más detalles sobre el error.',
            'Intenta con las credenciales por defecto: admin/admin123'
          ]
        };
        break;
        
      case 'no_token':
        this.diagnosis = {
          severity: 'high',
          title: 'No se recibió token de autenticación',
          description: 'El backend aceptó las credenciales pero no devolvió un token JWT válido, lo que impide la autenticación.',
          solution: [
            'Verifica la configuración JWT en el backend (avicola.app.jwtSecret).',
            'Revisa los logs del backend para ver si hay errores al generar el token.',
            'Asegúrate de que las dependencias JWT estén correctamente configuradas.',
            'Revisa el controlador de autenticación en el backend.'
          ]
        };
        break;
        
      case 'token_missing':
        this.diagnosis = {
          severity: 'high',
          title: 'Token no disponible para llamadas API',
          description: 'El token no está disponible para realizar llamadas a la API protegida.',
          solution: [
            'Verifica que el token se esté guardando correctamente en localStorage.',
            'Revisa si hay algún error en la consola del navegador.',
            'Asegúrate de que el servicio de autenticación esté guardando el token.',
            'Verifica si hay múltiples servicios de autenticación que se están sobrescribiendo.'
          ]
        };
        break;
        
      case 'api_access_error':
        this.diagnosis = {
          severity: 'high',
          title: 'Error al acceder a la API de usuarios',
          description: 'El backend rechazó la solicitud a la API de usuarios a pesar de tener un token.',
          solution: [
            'Verifica que el token esté siendo enviado correctamente en el header Authorization.',
            'Asegúrate de que el token no haya expirado.',
            'Revisa la configuración CORS en el backend.',
            'Verifica que el usuario tenga los permisos necesarios para acceder a la API.'
          ]
        };
        break;
        
      case 'user_data_missing':
        this.diagnosis = {
          severity: 'medium',
          title: 'Información de usuario no almacenada',
          description: 'La información del usuario no se está guardando correctamente después del login.',
          solution: [
            'Revisa el servicio de autenticación para asegurar que se guarde la información del usuario.',
            'Verifica si hay errores al procesar la respuesta del login.',
            'Asegúrate de que el backend esté devolviendo la información de usuario junto con el token.'
          ]
        };
        break;
        
      case 'no_roles':
        this.diagnosis = {
          severity: 'medium',
          title: 'Usuario sin roles definidos',
          description: 'El usuario autenticado no tiene roles definidos, lo que puede causar problemas de autorización.',
          solution: [
            'Verifica que el usuario tenga roles asignados en la base de datos.',
            'Asegúrate de que el backend esté incluyendo los roles en la respuesta de autenticación.',
            'Revisa si los roles se están guardando correctamente en localStorage.'
          ]
        };
        break;
        
      case 'not_admin':
        this.diagnosis = {
          severity: 'medium',
          title: 'Usuario sin rol de administrador',
          description: 'El usuario no tiene el rol ROLE_ADMIN necesario para acceder a la sección de administración.',
          solution: [
            'Asigna el rol ROLE_ADMIN al usuario en la base de datos.',
            'Verifica que los roles se estén procesando correctamente en el backend.',
            'Asegúrate de que el guard de autenticación esté verificando correctamente los roles.'
          ]
        };
        break;
        
      case 'user_data_invalid':
        this.diagnosis = {
          severity: 'medium',
          title: 'Datos de usuario inválidos',
          description: 'Los datos de usuario almacenados están dañados o en un formato incorrecto.',
          solution: [
            'Limpia los datos de sesión en el navegador (localStorage).',
            'Verifica el formato de los datos guardados en localStorage.',
            'Revisa el servicio de autenticación para asegurar que guarde los datos correctamente.'
          ]
        };
        break;
        
      case 'token_not_stored':
        this.diagnosis = {
          severity: 'high',
          title: 'Token no almacenado después del login',
          description: 'El token se recibió pero no se guardó correctamente, lo que causa la redirección al login.',
          solution: [
            'Revisa el servicio de autenticación para asegurar que guarde el token en localStorage.',
            'Verifica si hay algún error en la consola del navegador.',
            'Asegúrate de que no haya conflictos entre diferentes servicios de autenticación.'
          ]
        };
        break;
        
      case 'all_success':
        this.diagnosis = {
          severity: 'low',
          title: '¡Todas las pruebas fueron exitosas!',
          description: 'Todas las pruebas fueron exitosas, lo que indica que el flujo de autenticación debería funcionar correctamente.',
          solution: [
            'Si aún tienes problemas, prueba limpiando completamente la caché del navegador.',
            'Usa la herramienta de diagnóstico completo para más detalles.',
            'Asegúrate de que no haya problemas en la implementación del guard de autenticación.',
            'Prueba usar el componente de usuarios directo: /admin/usuarios-directo'
          ]
        };
        break;
        
      default:
        this.diagnosis = {
          severity: 'medium',
          title: 'Diagnóstico incompleto',
          description: 'No se pudo determinar la causa exacta del problema.',
          solution: [
            'Revisa los resultados de las pruebas para más detalles.',
            'Usa la herramienta de diagnóstico completo para analizar a fondo el problema.',
            'Verifica los logs del backend y del navegador.'
          ]
        };
    }
  }
  
  /**
   * Agrega un resultado de prueba
   */
  private addResult(result: any): void {
    this.results.push({
      ...result,
      timestamp: new Date().toISOString(),
      showDetails: false
    });
  }
  
  /**
   * Navega al diagnóstico completo
   */
  irADiagnosticoCompleto(): void {
    this.router.navigate(['/diagnostico']);
  }
}
