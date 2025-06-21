import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { ERole } from '../../shared/models/role.model';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-usuarios-simple',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="users-container">
      <h1>Gestión de Usuarios</h1>
      
      <!-- Estado de carga o error -->
      <div *ngIf="loading" class="loading">Cargando usuarios...</div>
      
      <div *ngIf="error" class="error-message">
        <p>{{ error }}</p>
        <button (click)="loadUsers(true)">Reintentar</button>
        <button (click)="runDiagnosis()">Ejecutar diagnóstico</button>
      </div>
      
      <!-- Mostrar diagnóstico -->
      <div *ngIf="diagnosticInfo" class="diagnostic-info">
        <h3>Información de diagnóstico</h3>
        <pre>{{ diagnosticInfo | json }}</pre>
      </div>
      
      <!-- Lista de usuarios -->
      <div *ngIf="!loading && !error && users.length > 0" class="user-list">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>{{ user.username }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.roles ? user.roles.join(', ') : 'Sin roles' }}</td>
              <td>
                <button (click)="viewUserDetails(user)">Ver</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div *ngIf="!loading && !error && users.length === 0" class="empty-state">
        <p>No hay usuarios registrados en el sistema</p>
      </div>
      
      <!-- Botones de acción -->
      <div class="actions">
        <button (click)="returnToDashboard()">Volver al Dashboard</button>
        <button (click)="loadUsers(true)">Recargar usuarios</button>
      </div>
    </div>
  `,
  styles: [`
    .users-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .loading {
      padding: 20px;
      text-align: center;
      color: #666;
    }
    
    .error-message {
      padding: 15px;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #721c24;
      margin-bottom: 20px;
    }
    
    .user-list table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    .user-list th, .user-list td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    
    .user-list th {
      background-color: #f8f9fa;
    }
    
    .actions {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }
    
    button {
      padding: 8px 16px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background-color: #0069d9;
    }
    
    .diagnostic-info {
      padding: 15px;
      background-color: #f8f9fa;
      border: 1px solid #ddd;
      margin: 20px 0;
      overflow: auto;
    }
    
    pre {
      white-space: pre-wrap;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  `]
})
export class UsuariosSimpleComponent implements OnInit, OnDestroy {
  users: User[] = [];
  loading = false;
  error: string | null = null;
  diagnosticInfo: any = null;
  
  private destroy$ = new Subject<void>();
  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('Inicializando componente de usuarios (versión simplificada)');
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }  loadUsers(isRetry: boolean = false): void {
    this.loading = true;
    this.error = null;
    this.diagnosticInfo = null;
    
    console.log('Cargando usuarios...');
    
    // Forzamos una verificación del token actual
    const token = this.authService.getToken();
    console.log('Token actual antes de cargar usuarios:', token ? `${token.substring(0, 15)}...` : 'No hay token');
    
    // Verificamos si está autenticado (esto verifica también la validez del token)
    if (!this.authService.isAuthenticated()) {
      console.log('Usuario no autenticado o token inválido, intentando renovar sesión...');
      
      this.authService.refreshToken().subscribe({
        next: (response) => {
          console.log('Token renovado exitosamente:', response?.token?.substring(0, 15) + '...');
          // Si la renovación tiene éxito, intentar cargar usuarios
          this.cargarUsuariosDespuesDeRenovarToken();
        },
        error: (err) => {
          console.error('Error al renovar token:', err);
          this.loading = false;
          this.error = 'La sesión ha expirado y no se pudo renovar. Por favor, inicia sesión nuevamente.';
          
          // Solo si es explícitamente un 401 o 403, redirigir al login
          if (err.status === 401 || err.status === 403) {
            console.log('Redirigiendo al login debido a error de autenticación');
            this.authService.cleanupStorage();
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: '/admin/usuarios', reason: 'auth_error' }
            });
          }
        }
      });
      return;
    }
    
    // Si está autenticado, cargar los usuarios directamente
    this.cargarUsuariosDespuesDeRenovarToken();
  }
    private cargarUsuariosDespuesDeRenovarToken(): void {
    // Verificar nuevamente el token antes de la petición
    const token = this.authService.getToken();
    if (!token) {
      console.error('No hay token disponible después de renovar sesión');
      this.loading = false;
      this.error = 'No se pudo obtener un token de autenticación válido';
      return;
    }

    console.log('Cargando usuarios con token:', token.substring(0, 15) + '...');
    
    // Mostrar información del token para diagnóstico
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('Información del token:', {
          sub: payload.sub,
          exp: new Date(payload.exp * 1000).toLocaleString(),
          roles: payload.roles || payload.role || payload.authorities
        });
      }
    } catch (e) {
      console.warn('No se pudo decodificar el token JWT');
    }
    
    this.userService.getAllUsers()
      .pipe(
        finalize(() => this.loading = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (users) => {
          console.log(`Recibidos ${users.length} usuarios`);
          this.users = users;
          this.error = null; // Limpiar cualquier error previo
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error cargando usuarios:', error);
          
          if (error.status === 401) {
            this.error = 'Tu sesión ha expirado o no tienes autorización para ver usuarios';
            
            // Intento final: si recibimos un 401 aquí, es muy probable que haya un problema
            // con el token o con CORS. Intentemos diagnosticar
            this.runDiagnosis();
          } else if (error.status === 0) {
            this.error = 'No se pudo conectar con el servidor. Verifica que el backend esté funcionando.';
          } else {
            this.error = `Error (${error.status}): ${error.message}`;
            if (error.error?.message) {
              this.error += ` - ${error.error.message}`;
            }
          }
        }
      });
  }
  runDiagnosis(): void {
    this.loading = true;
    
    try {
      // Usar el nuevo método de diagnóstico
      const sessionDiagnosis = this.userService.diagnoseSesion();
      
      this.diagnosticInfo = {
        apiUrl: environment.apiUrl,
        useMockData: environment.useMockData,
        bypassAuth: environment.bypassAuth,
        currentUrl: this.router.url,
        currentTime: new Date().toLocaleString(),
        ...sessionDiagnosis
      };
      
      // Probar endpoint directamente con diferentes configuraciones
      console.log('Ejecutando prueba de endpoint de usuarios...');
      
      // Si estamos usando datos simulados, mostrar eso
      if (environment.useMockData) {
        this.diagnosticInfo.mockDataEnabled = true;
        this.loading = false;
        return;
      }
      
      // 1. Prueba estándar
      this.userService.testUsersEndpoint()
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (result) => {
            this.diagnosticInfo.endpointTest = result;
            
            // Si la prueba es exitosa, intentar cargar usuarios nuevamente
            if (result.success) {
              console.log('Prueba exitosa, intentando cargar usuarios nuevamente...');
              setTimeout(() => this.loadUsers(true), 1000);
            }
          },
          error: (err) => {
            console.error('Error en prueba de endpoint:', err);
            this.diagnosticInfo.endpointTestError = {
              status: err.status,
              message: err.message,
              details: err.error
            };
            
            // Intentar con método alternativo si hay error
            this.testBackendConnection();
          }
        });
          } catch (e: unknown) {
      console.error('Error ejecutando diagnóstico:', e);
      this.diagnosticInfo = { 
        error: 'Error ejecutando diagnóstico',
        details: e instanceof Error ? e.toString() : 'Error desconocido'
      };
      this.loading = false;
    }
  }
  
  // Método adicional para probar la conexión al backend
  private testBackendConnection(): void {
    console.log('Probando conexión al backend...');
      // Probar el endpoint de salud que no requiere autenticación
    this.http.get<any>(`${environment.apiUrl}/health`).subscribe({
        next: (result: any) => {
          this.diagnosticInfo.healthCheck = {
            success: true,
            result
          };
          console.log('Conexión al backend exitosa:', result);
        },
        error: (err: HttpErrorResponse) => {
          this.diagnosticInfo.healthCheck = {
            success: false,
            error: {
              status: err.status,
              message: err.message
            }
          };
          console.error('Error conectando al backend:', err);
        }
      });
  }

  viewUserDetails(user: User): void {
    console.log('Detalles de usuario:', user);
    // Aquí podríamos implementar una vista de detalles
  }

  returnToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
