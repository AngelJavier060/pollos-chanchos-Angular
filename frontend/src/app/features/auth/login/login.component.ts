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
  loginForm!: FormGroup;
  returnUrl: string = '/admin/dashboard';
  error: string = '';
  loading: boolean = false;
  private healthUrl = `${environment.apiUrl}/health`;
  private alternativeUrl = `${environment.apiUrl}/health/alternative`;
  pageTitle = 'Panel de Administrador';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authDirectService: AuthDirectService,
    private http: HttpClient
  ) {
    this.initializeForm();
    this.handleReturnUrl();
  }

  ngOnInit(): void {
    this.testBackendConnection();
    this.setPageTitleByRoute();
  }

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  private handleReturnUrl(): void {
    const queryReturnUrl = this.route.snapshot.queryParams['returnUrl'];
    this.returnUrl = queryReturnUrl && queryReturnUrl.startsWith('/admin') 
      ? queryReturnUrl 
      : '/admin/dashboard';
  }

  get usernameControl() {
    return this.loginForm.get('username');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control.hasError('email')) {
      return 'Debe ser un email válido';
    }
    if (control.hasError('minlength')) {
      return 'Debe tener al menos 6 caracteres';
    }
    return '';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    this.error = 'Iniciando sesión...';
    console.log('Iniciando proceso de login...');

    const username = this.loginForm.get('username')?.value;
    const password = this.loginForm.get('password')?.value;

    if (!username || !password) {
      this.handleError('Debe proporcionar usuario y contraseña');
      return;
    }

    const loginData = {
      username,
      password
    };

    this.authDirectService.login(loginData).subscribe({
      next: () => this.handleLoginSuccess(),
      error: (error) => this.handleError(error)
    });
  }

  private markFormAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  private handleError(error: any): void {
    this.loading = false;
    if (error) {
      if (typeof error === 'string') {
        this.error = error;
      } else if (error.status === 401) {
        this.error = 'Usuario o contraseña incorrectos';
      } else if (error.status === 0) {
        this.error = 'No se pudo conectar con el servidor';
      } else {
        this.error = error.message || 'Error desconocido al iniciar sesión';
      }
    } else {
      this.error = 'Error desconocido al iniciar sesión';
    }
  }

  private handleLoginSuccess(): void {
    if (!this.authDirectService.isAuthenticated()) {
      this.handleError('Error al procesar la sesión');
      return;
    }
    const userStr = localStorage.getItem('currentUser');
    let redirectUrl = '/admin/dashboard';
    if (userStr) {
      const userData = JSON.parse(userStr);
      if (userData.roles?.includes(ERole.ROLE_ADMIN)) {
        redirectUrl = '/admin/dashboard';
      } else if (userData.roles?.includes(ERole.ROLE_POULTRY)) {
        redirectUrl = '/pollos';
      } else if (userData.roles?.includes(ERole.ROLE_PORCINE)) {
        redirectUrl = '/chanchos';
      } else {
        redirectUrl = '/'; // O a un panel genérico si lo deseas
      }
    }
    this.router.navigate([redirectUrl]).then(() => {
      console.log('Redirección completada');
    }).catch(error => {
      console.error('Error al redirigir:', error);
      this.handleError('Error al redirigir después del login');
    });
  }

  private testBackendConnection(): void {
    if (!this.http) {
      console.error('HttpClient no está disponible');
      return;
    }

    this.error = 'Probando conexión con el servidor...';
    
    const apiUrl = environment.apiUrl;
    const healthUrl = `${apiUrl}/health`;
    
    console.log(`Verificando conexión con el backend en: ${healthUrl}`);
    
    this.http.get<any>(healthUrl).subscribe({
      next: (response: any) => {
        console.log('Conexión exitosa con el backend:', response);
        this.error = `El servidor está en línea. Respuesta: ${JSON.stringify(response) || 'OK'}`;
      },
      error: (err: any) => {
        console.error('Error al probar conexión:', err);
        if (err.status === 0) {
          this.error = 'No se pudo conectar con el servidor. Verifique que el backend esté ejecutándose en ' + 
                        apiUrl;
          console.warn('No hay conexión con el backend. Verifique que esté en ejecución con start-backend.bat');
        } else {
          this.error = `Error ${err.status}: ${err.statusText || 'Desconocido'}`;
        }
        
        const alternativeUrl = `${apiUrl}/api/health`;
        console.log(`Intentando ruta alternativa: ${alternativeUrl}`);
        
        this.http.get<any>(alternativeUrl).subscribe({
          next: (response: any) => {
            console.log('Conexión exitosa con ruta alternativa:', response);
            this.error = `El servidor está en línea (ruta alternativa). Respuesta: ${JSON.stringify(response) || 'OK'}`;
          },
          error: (altErr: any) => {
            console.error('También falló la ruta alternativa:', altErr);
          }
        });
      }
    });
  }

  private setPageTitleByRoute(): void {
    const url = this.router.url;
    if (url.includes('/auth/login/pollos')) {
      this.pageTitle = 'Panel de Pollos';
    } else if (url.includes('/auth/login/chanchos')) {
      this.pageTitle = 'Panel de Chanchos';
    } else {
      this.pageTitle = 'Panel de Administrador';
    }
  }
}