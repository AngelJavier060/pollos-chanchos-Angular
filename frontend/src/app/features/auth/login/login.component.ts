import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthDirectService } from '../../../core/services/auth-direct.service';
import { environment } from '../../../../environments/environment';
import { ERole } from '../../../shared/models/role.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  pageTitle = 'Panel de Administrador';
  private returnUrl: string;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authDirectService: AuthDirectService,
    private http: HttpClient
  ) {
    // Construir el formulario
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    // Obtener URL de retorno si existe, asegurándonos que siempre sea una ruta del admin
    const queryReturnUrl = this.route.snapshot.queryParams['returnUrl'];
    // Asegurarse de que la URL de retorno siempre sea de la sección admin
    this.returnUrl = queryReturnUrl && queryReturnUrl.startsWith('/admin') 
      ? queryReturnUrl 
      : '/admin/dashboard';
    
    // NO limpiamos la sesión automáticamente en el constructor
    // Lo haremos solo cuando sea necesario
  }

  ngOnInit() {
    // No hacemos ninguna redirección automática
    // Forzamos siempre el ingreso de credenciales
    console.log('Componente de login inicializado. URL de retorno:', this.returnUrl);
    
    // Verificar si hay una sesión existente y válida
    const tokenValido = this.authDirectService.isAuthenticated();
    if (tokenValido) {
      console.log('Se detectó una sesión activa. Manteniendo sesión.');
      // Si hay una sesión válida y venimos de una redirección por expiración,
      // intentar refrescar el token automáticamente
      this.authDirectService.refreshToken().subscribe({
        next: (response) => {
          console.log('Token refrescado automáticamente en inicio de login');
          // Verificar si debemos redirigir al usuario a una página protegida
          if (this.returnUrl && this.returnUrl !== '/login') {
            setTimeout(() => {
              console.log('Redirigiendo a URL de retorno después de refresh:', this.returnUrl);
              this.router.navigateByUrl(this.returnUrl);
            }, 100);
          }
        },
        error: (err) => {
          console.warn('No se pudo refrescar token automáticamente:', err);
          // No limpiar sesión, permitir que el usuario ingrese las credenciales
        }
      });
    } else {
      console.log('No hay sesión activa válida. Limpiando datos de autenticación antiguos.');
      this.authDirectService.clearAuth();
    }
  }

  get usernameControl() { return this.loginForm.get('username'); }
  get passwordControl() { return this.loginForm.get('password'); }

  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Este campo es requerido';
    }
    
    return '';
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.error = '';

    // Validar los campos manualmente una vez más
    const username = this.loginForm.get('username')?.value;
    const password = this.loginForm.get('password')?.value;
    
    if (!username || !password) {
      this.error = 'Debe proporcionar usuario y contraseña';
      this.loading = false;
      return;
    }
    
    const loginData = {
      username: username.trim(),
      password: password.trim()
    };

    console.log('Enviando solicitud de login para:', loginData.username);
    
    // Limpiar datos de sesión solo si estamos intentando un login con credenciales diferentes
    const currentUser = localStorage.getItem('auth_user');
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        if (userData.username !== loginData.username) {
          console.log('Cambiando de usuario, limpiando sesión anterior');
          this.authDirectService.clearAuth();
        } else {
          console.log('Reintento de login con el mismo usuario, manteniendo datos de sesión');
        }
      } catch (e) {
        console.error('Error al analizar datos de usuario actual:', e);
        this.authDirectService.clearAuth();
      }
    }

    this.authDirectService.login(loginData).subscribe({
      next: (response) => {
        console.log('Login exitoso, verificando permisos');
        this.loading = false;
        
        // Usando servicio directo ahora
        const isAuthenticated = this.authDirectService.isAuthenticated();
        console.log('Usuario autenticado:', isAuthenticated);
        
        if (!isAuthenticated) {
          console.error('No se validó la autenticación después del login');
          this.error = 'Error al procesar la sesión';
          return;
        }
        
        console.log('Login directo exitoso');
        
        // Verificar roles del usuario desde localStorage
        const userStr = localStorage.getItem('auth_user');
        let isAdmin = false;
        
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            console.log('Datos de usuario en localStorage:', userData);
            
            if (userData && userData.roles && Array.isArray(userData.roles)) {
              // Verificar si tiene rol de admin
              isAdmin = userData.roles.some((role: string) => 
                role === 'ROLE_ADMIN' || role === 'ADMIN');
              console.log('¿Usuario tiene rol admin?', isAdmin);
            } else if (userData && userData.username === 'admin') {
              // Si el usuario es admin y no hay información de roles, asumimos que es admin
              isAdmin = true;
              console.log('Usuario es admin pero no tiene roles definidos. Asumiendo ROLE_ADMIN');
              
              // Actualizar localStorage con el rol de ADMIN
              userData.roles = ['ROLE_ADMIN'];
              localStorage.setItem('auth_user', JSON.stringify(userData));
            }
          } catch (e) {
            console.error('Error al analizar datos de usuario:', e);
          }
        } else {
          console.warn('No hay información de usuario en localStorage');
          
          // Si el usuario es admin pero no hay información guardada, asumimos rol de admin
          if (this.loginForm.get('username')?.value === 'admin') {
            isAdmin = true;
            console.log('Usuario es admin. Estableciendo datos por defecto');
            
            // Crear datos de usuario
            const userData = {
              username: 'admin',
              roles: ['ROLE_ADMIN']
            };
            localStorage.setItem('auth_user', JSON.stringify(userData));
          }
        }
        
        if (isAdmin) {
          console.log('Usuario tiene rol ADMIN, redirigiendo a panel de administración');
          console.log('URL de retorno configurada:', this.returnUrl);
          
          // Verificar que los datos también estén sincronizados con AuthService
          const authUser = localStorage.getItem('user');
          if (!authUser) {
            console.warn('Los datos no están sincronizados con AuthService. Sincronizando...');
            // Forzar sincronización
            const adminUser = {
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
              name: 'Administrador',
              roles: ['ROLE_ADMIN'],
              token: localStorage.getItem('auth_token') || '',
              refreshToken: localStorage.getItem('auth_token') || ''
            };
            localStorage.setItem('user', JSON.stringify(adminUser));
            localStorage.setItem('refresh_token', localStorage.getItem('auth_token') || '');
          }
          
          // Esperar un breve momento para permitir que Angular complete el ciclo
          setTimeout(() => {
            // Forzar navegación absoluta a la ruta de usuarios con el enfoque directo
            console.log('Ejecutando redirección directa a /admin/usuarios');
            this.router.navigate(['/admin/usuarios'], { 
              replaceUrl: true
            });
          }, 100);
        } else {
          console.warn('Usuario sin permisos de administrador');
          this.error = 'No tienes permisos de administrador';
          // NO limpiar credenciales aquí si el usuario no tiene permisos
          //    this.authDirectService.clearAuth();
        }
      },
      error: (error) => {
        console.error('Error en el login directo:', error);
        if (error.status === 401) {
          this.error = 'Usuario o contraseña incorrectos';
        } else if (error.status === 0) {
          this.error = 'No se pudo conectar con el servidor';
        } else {
          this.error = error.message || 'Error desconocido al iniciar sesión';
        }
        this.loading = false;
      }
    });
  }

  testBackendConnection() {
    this.error = 'Probando conexión con el servidor...';
    
    // Construir una URL para probar la conexión con el backend
    const apiUrl = environment.apiUrl;
    const healthUrl = `${apiUrl}/api/health`;
    
    // Usar HttpClient directamente para esta prueba
    this.http.get<any>(healthUrl).subscribe({
      next: (response: any) => {
        this.error = `El servidor está en línea. Respuesta: ${response.message || 'OK'}`;
      },
      error: (err: any) => {
        console.error('Error al probar conexión:', err);
        if (err.status === 0) {
          this.error = 'No se pudo conectar con el servidor. Verifique que el backend esté ejecutándose en ' + 
                      apiUrl;
        } else {
          this.error = `Error ${err.status}: ${err.statusText || 'Desconocido'}`;
        }
      }
    });
  }
}