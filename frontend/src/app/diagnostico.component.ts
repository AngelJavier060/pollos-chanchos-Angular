import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthDirectService } from './core/services/auth-direct.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-diagnostico',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  template: `
    <div class="container mx-auto p-4">
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h1 class="text-2xl font-bold mb-2">📊 Diagnóstico Sistema Avícola</h1>
        <p class="mb-2">Esta herramienta te ayudará a identificar problemas de conexión, autenticación y acceso a datos. Sigue los pasos en orden.</p>
        <div class="flex gap-3 mt-3">
          <button (click)="probarTodo()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            🔍 Ejecutar Todas las Pruebas
          </button>
          <button routerLink="/admin/usuarios" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
            👥 Ir a Usuarios
          </button>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Columna izquierda -->
        <div>
          <div class="mb-6 bg-white shadow-md rounded-lg p-4">
            <h2 class="text-xl font-semibold mb-3 flex items-center gap-2">
              <span class="text-blue-500">1</span> Configuración de API
            </h2>
            <div class="bg-gray-50 p-4 rounded border">
              <p><strong>API URL:</strong> {{apiUrl}}</p>
              <p><strong>URL base:</strong> {{baseUrl}}</p>
              <p><strong>Estado Conexión:</strong> 
                <span [ngClass]="{
                  'text-green-600': estadoBackend === 'conectado',
                  'text-red-600': estadoBackend === 'desconectado',
                  'text-orange-600': estadoBackend === 'desconocido'
                }">{{estadoBackendTexto}}</span>
              </p>
              <div class="mt-3">
                <button (click)="cambiarUrl()" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                  Cambiar URL
                </button>
              </div>
            </div>
          </div>
      
          <div class="mb-6 bg-white shadow-md rounded-lg p-4">
            <h2 class="text-xl font-semibold mb-3 flex items-center gap-2">
              <span class="text-blue-500">2</span> Prueba de Conexión Backend
            </h2>
            <button (click)="probarConexion()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mb-2 w-full">
              Probar Conexión
            </button>
            <div *ngIf="resultadoConexion" class="mt-2">
              <div [ngClass]="resultadoConexion.exito ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'" 
                   class="border-l-4 p-3 mt-2">
                <p><strong>Estado:</strong> {{resultadoConexion.exito ? '✅ ÉXITO' : '❌ ERROR'}}</p>
                <p><strong>Mensaje:</strong> {{resultadoConexion.mensaje}}</p>
                <p *ngIf="resultadoConexion.exito"><strong>Servidor:</strong> {{resultadoConexion?.datos?.server || 'No especificado'}}</p>
                <div *ngIf="!resultadoConexion.exito" class="mt-2">
                  <h4 class="font-semibold text-red-700">Soluciones posibles:</h4>
                  <ul class="list-disc ml-5">
                    <li>Verifica que el servidor backend esté en ejecución</li>
                    <li>Asegúrate que el puerto 8088 esté abierto y disponible</li>
                    <li>Revisa la consola del servidor para ver si hay errores</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mb-6 bg-white shadow-md rounded-lg p-4">
            <h2 class="text-xl font-semibold mb-3 flex items-center gap-2">
              <span class="text-blue-500">3</span> Prueba de Autenticación
            </h2>
            <div class="grid grid-cols-2 gap-3 mb-2">
              <input [(ngModel)]="credenciales.username" placeholder="Usuario" class="border p-2 rounded" />
              <input [(ngModel)]="credenciales.password" type="password" placeholder="Contraseña" class="border p-2 rounded" />
            </div>
            <button (click)="probarLogin()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full">
              Iniciar Sesión
            </button>
            <div *ngIf="resultadoLogin" class="mt-2">
              <div [ngClass]="resultadoLogin.exito ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'" 
                  class="border-l-4 p-3 mt-2">
                <p><strong>Estado:</strong> {{resultadoLogin.exito ? '✅ ÉXITO' : '❌ ERROR'}}</p>
                <p><strong>Mensaje:</strong> {{resultadoLogin.mensaje}}</p>
                <div *ngIf="resultadoLogin.exito">
                  <p><strong>Usuario:</strong> {{resultadoLogin?.datos?.username || credenciales.username}}</p>
                  <p><strong>Roles:</strong> {{mostrarRoles(resultadoLogin?.datos?.roles)}}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Columna derecha -->
        <div>
          <div class="mb-6 bg-white shadow-md rounded-lg p-4">
            <h2 class="text-xl font-semibold mb-3 flex items-center gap-2">
              <span class="text-blue-500">4</span> Prueba de API Usuarios
            </h2>
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">Token JWT</label>
              <textarea [(ngModel)]="token" placeholder="Token JWT (se rellena automáticamente después del login)" 
                class="border p-2 rounded w-full mb-2 text-xs font-mono h-20"></textarea>
            </div>
            <div class="flex gap-2">
              <button (click)="probarApi()" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex-1">
                Probar Acceso a API
              </button>
              <button (click)="simularFlujoCompleto()" class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded flex-1">
                Simular Flujo Completo
              </button>
            </div>
            <div *ngIf="resultadoApi" class="mt-2">
              <div [ngClass]="resultadoApi.exito ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'" 
                  class="border-l-4 p-3 mt-2">
                <p><strong>Estado:</strong> {{resultadoApi.exito ? '✅ ÉXITO' : '❌ ERROR'}}</p>
                <p><strong>Mensaje:</strong> {{resultadoApi.mensaje}}</p>
                <p *ngIf="resultadoApi.exito"><strong>Usuarios encontrados:</strong> {{resultadoApi?.datos?.length || 0}}</p>
                <div *ngIf="resultadoApi.exito && resultadoApi.datos?.length > 0" class="mt-2">
                  <h4 class="font-semibold">Primer usuario:</h4>
                  <p><strong>ID:</strong> {{resultadoApi.datos[0].id}}</p>
                  <p><strong>Username:</strong> {{resultadoApi.datos[0].username}}</p>
                  <p><strong>Roles:</strong> {{mostrarRoles(resultadoApi.datos[0].roles)}}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mb-6 bg-white shadow-md rounded-lg p-4">
            <h2 class="text-xl font-semibold mb-3 flex items-center gap-2">
              <span class="text-blue-500">5</span> Información de Sesión
            </h2>
            <button (click)="verificarToken()" class="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded w-full mb-3">
              Verificar Estado Sesión
            </button>
            
            <div *ngIf="infoToken" class="mt-2">
              <div [ngClass]="infoToken.valido ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'" 
                   class="border-l-4 p-3">
                <p><strong>Token válido:</strong> {{infoToken.valido ? '✅ Sí' : '❌ No'}}</p>
                
                <div *ngIf="infoToken.valido">
                  <p><strong>Usuario:</strong> {{infoToken.usuario}}</p>
                  <p><strong>Roles:</strong> {{mostrarRoles(infoToken.roles)}}</p>
                  <p><strong>Expira:</strong> {{infoToken.expira}}</p>
                  <p><strong>Tiempo restante:</strong> {{infoToken.tiempoRestante}}</p>
                </div>
                
                <div *ngIf="!infoToken.valido">
                  <p><strong>Razón:</strong> {{infoToken.razon}}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mb-6 bg-white shadow-md rounded-lg p-4">
            <h2 class="text-xl font-semibold mb-3 flex items-center gap-2">
              <span class="text-blue-500">6</span> Simulación de Navegación
            </h2>
            <div class="flex gap-2">
              <button (click)="simularNavegacionLoginUsuarios()" 
                      class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded flex-1">
                Simular Login → Usuarios
              </button>
              <button (click)="limpiarSesion()" 
                      class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex-1">
                Limpiar Sesión
              </button>
            </div>
            <div *ngIf="resultadoSimulacion" class="mt-3">
              <div [ngClass]="resultadoSimulacion.exito ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'" 
                   class="border-l-4 p-3">
                <p><strong>Estado:</strong> {{resultadoSimulacion.exito ? '✅ ÉXITO' : '❌ ERROR'}}</p>
                <p><strong>Mensaje:</strong> {{resultadoSimulacion.mensaje}}</p>
                <div *ngIf="resultadoSimulacion.pasos">
                  <h4 class="font-semibold mt-2">Pasos ejecutados:</h4>
                  <ul class="list-decimal ml-5">
                    <li *ngFor="let paso of resultadoSimulacion.pasos" 
                        [ngClass]="{'text-green-600': paso.exito, 'text-red-600': !paso.exito}">
                      {{paso.nombre}}: {{paso.mensaje}}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-4 bg-white shadow-md rounded-lg p-4">
        <h2 class="text-xl font-semibold mb-3">📋 Diagnóstico y Recomendaciones</h2>
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4">
          <p class="font-medium mb-2">Basado en los resultados, recomendamos:</p>
          <ul class="list-disc ml-5">
            <li *ngFor="let recomendacion of recomendaciones">
              {{ recomendacion }}
            </li>
            <li *ngIf="recomendaciones.length === 0">
              Ejecuta las pruebas para obtener recomendaciones específicas
            </li>
          </ul>
        </div>
      </div>
      
      <div class="mt-6 text-right">
        <button (click)="descargarInforme()" class="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded">
          📄 Descargar Informe
        </button>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 1200px; }
    pre { border-radius: 0.25rem; }
  `]
})
export class DiagnosticoComponent implements OnInit {
  apiUrl = environment.apiUrl;
  baseUrl = window.location.origin;
  token = '';
  
  // Estado del backend
  estadoBackend: 'conectado' | 'desconectado' | 'desconocido' = 'desconocido';
  get estadoBackendTexto(): string {
    switch (this.estadoBackend) {
      case 'conectado': return '✅ Conectado';
      case 'desconectado': return '❌ Sin conexión';
      case 'desconocido': return '⚠️ No verificado';
    }
  }
  
  credenciales = {
    username: 'admin',
    password: 'admin123'
  };
  
  resultadoConexion: any = null;
  resultadoLogin: any = null;
  resultadoApi: any = null;
  resultadoSimulacion: any = null;
  infoToken: any = null;
  
  recomendaciones: string[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthDirectService
  ) {}

  ngOnInit(): void {
    console.log('DiagnosticoComponent inicializado');
    
    // Intentar recuperar token guardado
    const savedToken = this.authService.getToken();
    if (savedToken) {
      this.token = savedToken;
      this.verificarToken();
      this.agregarRecomendacion('📝 Se ha encontrado un token guardado. Verifica su validez.');
    }
    
    // Verificar estado del backend
    this.verificarBackend();
  }
  
  /**
   * Ejecuta todas las pruebas en secuencia
   */
  probarTodo(): void {
    this.recomendaciones = [];
    this.agregarRecomendacion('🔄 Iniciando pruebas completas...');
    
    // 1. Verificar backend
    this.verificarBackend().then(() => {
      if (this.estadoBackend === 'desconectado') {
        this.agregarRecomendacion('⚠️ El backend no está disponible. Las demás pruebas fallarán.');
        this.agregarRecomendacion('📌 Inicia el servidor backend y vuelve a intentarlo.');
        return;
      }
      
      // 2. Probar login
      this.agregarRecomendacion('➡️ Iniciando prueba de login...');
      this.probarLogin();
      
      // 3. Ejecutar la simulación completa
      setTimeout(() => {
        this.simularFlujoCompleto();
      }, 1500);
    });
  }

  /**
   * Cambia la URL de la API
   */
  cambiarUrl(): void {
    const nuevaUrl = prompt('Introduce la nueva URL de la API:', this.apiUrl);
    if (nuevaUrl) {
      this.apiUrl = nuevaUrl;
      this.agregarRecomendacion(`✏️ URL de API cambiada a: ${nuevaUrl}`);
      this.verificarBackend();
    }
  }
  
  /**
   * Verifica si el backend está disponible
   */
  async verificarBackend(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.http.get(`${this.apiUrl}/health`).subscribe({
          next: () => {
            this.estadoBackend = 'conectado';
            resolve();
          },
          error: () => {
            this.estadoBackend = 'desconectado';
            reject();
          }
        });
      });
    } catch (error) {
      console.error('Error verificando backend:', error);
    }
  }

  /**
   * Prueba la conexión al backend
   */
  probarConexion(): void {
    this.resultadoConexion = null;
    
    // Probar endpoint básico de salud
    this.http.get(`${this.apiUrl}/health`).subscribe({
      next: (respuesta) => {
        this.resultadoConexion = {
          exito: true,
          mensaje: 'Conexión exitosa con el backend',
          datos: respuesta
        };
        this.estadoBackend = 'conectado';
        this.agregarRecomendacion('✅ La conexión al backend funciona correctamente');
      },
      error: (error) => {
        this.resultadoConexion = {
          exito: false,
          mensaje: `Error de conexión: ${error.message}`,
          datos: {
            status: error.status,
            statusText: error.statusText,
            url: error.url
          }
        };
        this.estadoBackend = 'desconectado';
        
        if (error.status === 0) {
          this.agregarRecomendacion('❌ No se puede conectar al backend. Verifica que el servidor esté en funcionamiento.');
          this.agregarRecomendacion(`📌 Comando para iniciar backend: cd backend && java -jar target/avicola_backend-0.0.1-SNAPSHOT.jar`);
          this.agregarRecomendacion('⚠️ El problema principal parece ser que el backend no está en ejecución.');
        } else {
          this.agregarRecomendacion(`❌ Error ${error.status} al conectar. Verifica la configuración del backend.`);
        }
      }
    });
  }

  /**
   * Prueba el login con las credenciales proporcionadas
   */
  probarLogin(): void {
    this.resultadoLogin = null;
    
    if (!this.credenciales.username || !this.credenciales.password) {
      this.resultadoLogin = {
        exito: false,
        mensaje: 'Debes proporcionar un usuario y contraseña'
      };
      return;
    }
    
    this.http.post(`${this.apiUrl}/api/auth/login`, this.credenciales).subscribe({
      next: (respuesta: any) => {
        this.resultadoLogin = {
          exito: true,
          mensaje: 'Login exitoso',
          datos: respuesta
        };
        
        if (respuesta && respuesta.token) {
          this.token = respuesta.token;
          // También guardar en localStorage para simular el comportamiento real
          localStorage.setItem('auth_token', respuesta.token);
          const user = {
            username: respuesta.username || this.credenciales.username,
            roles: respuesta.roles || []
          };
          localStorage.setItem('auth_user', JSON.stringify(user));
          
          this.verificarToken();
          this.agregarRecomendacion('✅ Login exitoso! El token ha sido guardado.');
        } else {
          this.agregarRecomendacion('⚠️ Login exitoso pero no se recibió un token válido');
        }
      },
      error: (error) => {
        this.resultadoLogin = {
          exito: false,
          mensaje: `Error de autenticación: ${error.message}`,
          datos: {
            status: error.status,
            statusText: error.statusText,
            error: error.error
          }
        };
        
        if (error.status === 401) {
          this.agregarRecomendacion('❌ Credenciales incorrectas. Verifica usuario y contraseña.');
          this.agregarRecomendacion('💡 Intenta con las credenciales por defecto: admin/admin123');
        } else if (error.status === 0) {
          this.agregarRecomendacion('❌ No se pudo conectar al servidor de autenticación.');
          this.agregarRecomendacion('⚠️ El backend no está respondiendo. Inicia el servidor.');
        } else {
          this.agregarRecomendacion(`❌ Error ${error.status} al intentar login.`);
        }
      }
    });
  }

  /**
   * Prueba el acceso a la API con el token actual
   */
  probarApi(): void {
    this.resultadoApi = null;
    
    if (!this.token) {
      this.resultadoApi = {
        exito: false,
        mensaje: 'No hay token disponible. Realiza login primero.'
      };
      return;
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    });
    
    this.http.get(`${this.apiUrl}/api/users`, { headers }).subscribe({
      next: (respuesta: any) => {
        this.resultadoApi = {
          exito: true,
          mensaje: 'Acceso exitoso a la API protegida',
          datos: respuesta
        };
        this.agregarRecomendacion('✅ El token funciona correctamente para acceder a recursos protegidos');
      },
      error: (error) => {
        this.resultadoApi = {
          exito: false,
          mensaje: `Error al acceder a la API: ${error.message}`,
          datos: {
            status: error.status,
            statusText: error.statusText,
            error: error.error
          }
        };
        
        if (error.status === 401) {
          this.agregarRecomendacion('❌ El token no es válido o ha expirado. Intenta iniciar sesión nuevamente.');
        } else if (error.status === 403) {
          this.agregarRecomendacion('❌ No tienes permisos suficientes para acceder a este recurso.');
        } else if (error.status === 0) {
          this.agregarRecomendacion('❌ No se pudo conectar al servidor. Verifica que el backend esté activo.');
        } else {
          this.agregarRecomendacion(`❌ Error ${error.status} al acceder a la API.`);
        }
      }
    });
  }
  
  /**
   * Verifica la validez del token actual
   */
  verificarToken(): void {
    this.infoToken = null;
    const token = this.token || this.authService.getToken();
    
    if (!token) {
      this.infoToken = {
        valido: false,
        razon: 'No hay token disponible'
      };
      return;
    }
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.infoToken = {
          valido: false,
          razon: 'El formato del token no es válido'
        };
        return;
      }
      
      // Decodificar y verificar expiración
      const payload = JSON.parse(atob(parts[1]));
      const expiry = new Date(payload.exp * 1000);
      const now = new Date();
      
      if (expiry <= now) {
        this.infoToken = {
          valido: false,
          razon: 'El token ha expirado',
          expira: expiry.toLocaleString()
        };
        return;
      }
      
      // Token válido
      const tiempoRestanteMs = expiry.getTime() - now.getTime();
      const minutos = Math.floor(tiempoRestanteMs / 60000);
      const horas = Math.floor(minutos / 60);
      
      this.infoToken = {
        valido: true,
        usuario: payload.sub,
        roles: payload.roles || [],
        expira: expiry.toLocaleString(),
        tiempoRestante: horas > 0 ? 
          `${horas} horas y ${minutos % 60} minutos` : 
          `${minutos} minutos`
      };
    } catch (e) {
      console.error('Error verificando token:', e);
      this.infoToken = {
        valido: false,
        razon: 'Error al decodificar el token'
      };
    }
  }

  /**
   * Simula el flujo completo: login -> obtener usuarios
   */
  simularFlujoCompleto(): void {
    this.resultadoSimulacion = null;
    const pasos: any[] = [];
    
    // 1. Probar conexión
    this.http.get(`${this.apiUrl}/health`).subscribe({
      next: () => {
        pasos.push({
          nombre: 'Conexión al backend',
          exito: true,
          mensaje: 'Conectado correctamente'
        });
        
        // 2. Login
        this.http.post(`${this.apiUrl}/api/auth/login`, this.credenciales).subscribe({
          next: (respuestaLogin: any) => {
            if (respuestaLogin && respuestaLogin.token) {
              const token = respuestaLogin.token;
              pasos.push({
                nombre: 'Inicio de sesión',
                exito: true,
                mensaje: 'Autenticación exitosa'
              });
              
              // 3. Acceder a API con el token
              const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
              });
              
              this.http.get(`${this.apiUrl}/api/users`, { headers }).subscribe({
                next: (usuarios: any) => {
                  pasos.push({
                    nombre: 'Acceso a datos de usuarios',
                    exito: true,
                    mensaje: `Se obtuvieron ${usuarios.length} usuarios`
                  });
                  
                  this.resultadoSimulacion = {
                    exito: true,
                    mensaje: 'Flujo completo ejecutado con éxito',
                    pasos
                  };
                  
                  this.agregarRecomendacion('✅ El flujo completo funciona correctamente');
                },
                error: (err) => {
                  pasos.push({
                    nombre: 'Acceso a datos de usuarios',
                    exito: false,
                    mensaje: `Error ${err.status}: ${err.message}`
                  });
                  
                  this.resultadoSimulacion = {
                    exito: false,
                    mensaje: 'Error al acceder a los datos de usuarios',
                    pasos
                  };
                  
                  this.diagnosticarProblemaUsuarios(err);
                }
              });
            } else {
              pasos.push({
                nombre: 'Inicio de sesión',
                exito: false,
                mensaje: 'No se recibió token en la respuesta'
              });
              
              this.resultadoSimulacion = {
                exito: false,
                mensaje: 'El login no devolvió un token válido',
                pasos
              };
              
              this.agregarRecomendacion('❌ El servidor no está devolviendo un token en la respuesta de login');
            }
          },
          error: (errLogin) => {
            pasos.push({
              nombre: 'Inicio de sesión',
              exito: false,
              mensaje: `Error ${errLogin.status}: ${errLogin.message}`
            });
            
            this.resultadoSimulacion = {
              exito: false,
              mensaje: 'Error en el inicio de sesión',
              pasos
            };
            
            if (errLogin.status === 401) {
              this.agregarRecomendacion('❌ Credenciales incorrectas. Verifica usuario y contraseña.');
            } else {
              this.agregarRecomendacion('❌ Error en el servidor al procesar el login');
            }
          }
        });
      },
      error: (errConexion) => {
        pasos.push({
          nombre: 'Conexión al backend',
          exito: false,
          mensaje: `Error ${errConexion.status}: ${errConexion.message}`
        });
        
        this.resultadoSimulacion = {
          exito: false,
          mensaje: 'No se pudo conectar al backend',
          pasos
        };
        
        this.agregarRecomendacion('❌ No se puede conectar al backend. Verifica que el servidor esté en funcionamiento.');
      }
    });
  }
  
  /**
   * Simula la navegación desde login hasta usuarios
   */
  simularNavegacionLoginUsuarios(): void {
    this.resultadoSimulacion = null;
    const pasos: any[] = [];
    
    // 1. Limpiar sesión actual
    this.limpiarSesion();
    pasos.push({
      nombre: 'Limpiar sesión',
      exito: true,
      mensaje: 'Sesión limpiada'
    });
    
    // 2. Login
    this.http.post(`${this.apiUrl}/api/auth/login`, this.credenciales).subscribe({
      next: (respuestaLogin: any) => {
        if (respuestaLogin && respuestaLogin.token) {
          // Guardar token como lo haría el servicio real
          localStorage.setItem('auth_token', respuestaLogin.token);
          const user = {
            username: respuestaLogin.username || this.credenciales.username,
            roles: respuestaLogin.roles || []
          };
          localStorage.setItem('auth_user', JSON.stringify(user));
          
          pasos.push({
            nombre: 'Inicio de sesión',
            exito: true,
            mensaje: 'Autenticación exitosa y token guardado'
          });
          
          // 3. Simular navegación a /admin/usuarios
          setTimeout(() => {
            // Verificar si el token sigue siendo válido
            const savedToken = localStorage.getItem('auth_token');
            if (!savedToken) {
              pasos.push({
                nombre: 'Navegación a Usuarios',
                exito: false,
                mensaje: 'El token ya no está disponible'
              });
              
              this.resultadoSimulacion = {
                exito: false,
                mensaje: 'Error: Token no encontrado después del login',
                pasos
              };
              return;
            }
            
            // Intentar acceder a la API de usuarios con el token guardado
            const headers = new HttpHeaders({
              'Authorization': `Bearer ${savedToken}`
            });
            
            this.http.get(`${this.apiUrl}/api/users`, { headers }).subscribe({
              next: () => {
                pasos.push({
                  nombre: 'Acceso a API Usuarios',
                  exito: true,
                  mensaje: 'Se pudo acceder a la API protegida'
                });
                
                // La navegación debería funcionar
                pasos.push({
                  nombre: 'Navegación a Usuarios',
                  exito: true,
                  mensaje: 'La navegación debería ser exitosa'
                });
                
                this.resultadoSimulacion = {
                  exito: true,
                  mensaje: 'La simulación de navegación fue exitosa',
                  pasos
                };
                
                this.agregarRecomendacion('✅ La simulación de navegación funciona correctamente. Deberías poder acceder a /admin/usuarios sin problemas.');
              },
              error: (err) => {
                pasos.push({
                  nombre: 'Acceso a API Usuarios',
                  exito: false,
                  mensaje: `Error ${err.status}: ${err.message}`
                });
                
                // Simulación de navegación fallida
                pasos.push({
                  nombre: 'Navegación a Usuarios',
                  exito: false,
                  mensaje: 'La navegación fallará debido a problemas de autorización'
                });
                
                this.resultadoSimulacion = {
                  exito: false,
                  mensaje: 'La simulación de navegación falló',
                  pasos
                };
                
                this.diagnosticarProblemaUsuarios(err);
              }
            });
          }, 500);
        } else {
          pasos.push({
            nombre: 'Inicio de sesión',
            exito: false,
            mensaje: 'No se recibió token en la respuesta'
          });
          
          this.resultadoSimulacion = {
            exito: false,
            mensaje: 'El login no devolvió un token válido',
            pasos
          };
        }
      },
      error: (errLogin) => {
        pasos.push({
          nombre: 'Inicio de sesión',
          exito: false,
          mensaje: `Error ${errLogin.status}: ${errLogin.message}`
        });
        
        this.resultadoSimulacion = {
          exito: false,
          mensaje: 'Error en el inicio de sesión',
          pasos
        };
      }
    });
  }
  
  /**
   * Limpia la sesión actual
   */
  limpiarSesion(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.token = '';
    this.infoToken = null;
    
    // También limpiar otros posibles lugares donde se guarda el token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    this.agregarRecomendacion('🧹 Se ha limpiado la sesión actual.');
  }
  
  /**
   * Diagnostica problemas específicos con acceso a usuarios
   */
  private diagnosticarProblemaUsuarios(error: HttpErrorResponse): void {
    if (error.status === 401) {
      this.agregarRecomendacion('❌ El token no es válido o está siendo rechazado por el backend.');
      this.agregarRecomendacion('💡 Verifica que el formato del token sea correcto en las llamadas API.');
      this.agregarRecomendacion('💡 Revisa si el backend está validando correctamente el token.');
    } else if (error.status === 403) {
      this.agregarRecomendacion('❌ No tienes permisos suficientes para acceder a los usuarios.');
      this.agregarRecomendacion('💡 Verifica que el usuario tenga el rol ROLE_ADMIN.');
    } else if (error.status === 0) {
      this.agregarRecomendacion('❌ No se pudo conectar con el backend durante la navegación.');
      this.agregarRecomendacion('💡 Asegúrate que el backend sigue ejecutándose.');
    } else if (error.status === 500) {
      this.agregarRecomendacion('❌ Error interno del servidor al procesar la solicitud.');
      this.agregarRecomendacion('💡 Revisa los logs del backend para más detalles.');
    } else {
      this.agregarRecomendacion(`❌ Error ${error.status}: Problema no identificado.`);
    }
    
    // Recomendación general
    this.agregarRecomendacion('💡 Prueba la herramienta de diagnóstico directo en /admin/usuarios-directo para aislar el problema.');
  }
  
  /**
   * Muestra un arreglo de roles de manera legible
   */
  mostrarRoles(roles: any[]): string {
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return 'Sin roles';
    }
    return roles.join(', ');
  }
  
  /**
   * Descarga un informe con todos los resultados de diagnóstico
   */
  descargarInforme(): void {
    const informe = {
      fecha: new Date().toLocaleString(),
      entorno: {
        apiUrl: this.apiUrl,
        baseUrl: this.baseUrl,
        estadoBackend: this.estadoBackend
      },
      resultados: {
        conexion: this.resultadoConexion,
        login: this.resultadoLogin,
        api: this.resultadoApi,
        simulacion: this.resultadoSimulacion,
        token: this.infoToken
      },
      recomendaciones: this.recomendaciones
    };
    
    const blob = new Blob([JSON.stringify(informe, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-avicola-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Agrega una recomendación si no existe ya
   */
  private agregarRecomendacion(recomendacion: string): void {
    if (!this.recomendaciones.includes(recomendacion)) {
      this.recomendaciones.push(recomendacion);
    }
  }
}
