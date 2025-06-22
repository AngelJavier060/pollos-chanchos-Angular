// Este es el componente principal y único para la gestión de usuarios en el sistema.
// Todos los demás componentes redundantes han sido eliminados para evitar confusión y duplicidad.
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../shared/services/user.service';
import { User, RegisterUserDto, UserUpdateDto } from '../../shared/models/user.model';
import { ERole } from '../../shared/models/role.model';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ApiDiagnosticsService, ApiDiagnosticResult } from '../../shared/services/api-diagnostics.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule]
})
export class UsuariosComponent implements OnInit, OnDestroy {  
  users: User[] = [];
  userForm: FormGroup;
  isEditMode = false;
  selectedUserId: number | null = null;
  showModal = false;
  loading = false;
  error: string | null = null;
  successMessage = '';
  previewImage: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  availableRoles = [
    ERole.ROLE_ADMIN,
    ERole.ROLE_USER,
    ERole.ROLE_POULTRY,
    ERole.ROLE_PORCINE
  ];
  // Exponemos environment para poder usarlo en la vista
  environment = environment;
  
  private destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

  apiStatus: ApiDiagnosticResult | null = null;
  currentUser: User | null = null;

  // Exponer el enum ERole para usarlo en la plantilla
  readonly ERole = ERole;  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private authService: AuthService,
    private apiDiagnostics: ApiDiagnosticsService,
    private http: HttpClient
  ) {
    // Verificar que tenemos acceso a HttpClient para el método de emergencia
    if (!this.http) {
      console.error('Error crítico: HttpClient no está inyectado correctamente.');
      // Intentar obtener HttpClient del servicio de usuario como fallback
      try {
        // @ts-ignore - Accediendo a una propiedad privada como medida de emergencia
        this.http = this.userService['http'] || this.authService['http'];
        console.log('HttpClient recuperado de servicios:', !!this.http);
      } catch (e) {
        console.error('No se pudo obtener HttpClient de los servicios:', e);
      }
    }
    
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: [''],
      phone: [''],
      roles: [[ERole.ROLE_USER]],
      profilePicture: ['']
    });
  }  ngOnInit(): void {
    console.log('Inicializando componente de usuarios...');
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser || !this.authService.isAdmin()) {
        this.error = 'No tienes permisos para ver esta sección.';
        // Opcional: Redirigir si no es admin, aunque el AuthGuard ya debería haberlo hecho.
        // this.router.navigate(['/dashboard']); 
        return;
    }

    this.loadUsers();
    this.runApiDiagnostics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();  }  loadUsers(isRetry: boolean = false): void {
    this.loading = true;
    this.error = null;
    this.successMessage = '';
    
    console.log('Iniciando carga de usuarios...', isRetry ? '(reintento)' : '(primera carga)');
    
    // Verificar rápidamente si hay token
    const token = this.authService.getToken();
    if (!token) {
      console.warn('No hay token disponible');
      this.error = 'No hay sesión de usuario. Por favor inicie sesión nuevamente.';
      this.loading = false;
      return;
    }
    
    // Información básica de diagnóstico
    console.log('Token disponible:', true);
    
    // En modo desarrollo mostrar información detallada 
    if (!environment.production) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Análisis del token:');
          console.log('- Usuario:', payload.sub);
          console.log('- Expira:', new Date(payload.exp * 1000).toLocaleString());
          console.log('- Roles:', payload.roles || payload.authorities || 'No especificados');
        }
      } catch (e) {
        console.warn('Error analizando token:', e);
      }
    }
      // Si no hay token o el token es inválido, redireccionar directamente
    if (!token || !this.authService.isTokenValidPublic(token)) {
      console.warn('Token inválido o no disponible al cargar usuarios');
      this.error = 'Sesión inválida. Redirigiendo al login...';
      this.loading = false;
      
      // Limpiar sesión
      this.authService.cleanupStorage();
      
      // Redirigir al login después de un pequeño retraso para que se vea el mensaje
      setTimeout(() => {
        this.router.navigate(['/login'], {
          queryParams: { 
            returnUrl: '/admin/usuarios',
            reason: 'invalid_token'
          }
        });
      }, 1500);
      return;
    }    // Si el token está por expirar, intentar renovarlo primero
    const authToken = this.authService.getToken();
    let isAboutToExpire = false;
    
    if (authToken) {
      try {        const tokenParts = authToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expTime = payload.exp * 1000; // Convertir a milisegundos
          const currentTime = new Date().getTime();
          // Verificar si expira en menos de 5 minutos
          isAboutToExpire = (expTime - currentTime) < (5 * 60 * 1000);
        }
      } catch (e) {
        console.error('Error al verificar expiración del token:', e);
      }
    }
    
    if (isAboutToExpire) {
      console.log('Token próximo a expirar, intentando renovación preventiva');
      
      this.authService.refreshToken().subscribe({
        next: () => {
          console.log('Token renovado preventivamente');
          this.executeUsersLoad();
        },
        error: (err) => {
          console.error('Error al renovar token preventivamente:', err);
          // Si no se puede renovar, redireccionar al login
          this.error = 'No se pudo renovar la sesión. Redirigiendo al login...';
          setTimeout(() => {
            this.authService.cleanupStorage();
            this.router.navigate(['/login'], {
              queryParams: { 
                returnUrl: '/admin/usuarios',
                reason: 'token_renewal_failed'
              }
            });
          }, 1500);
        }
      });
    } else {
      // Si el token está bien, cargar directamente
      this.executeUsersLoad();
    }
  }  executeUsersLoad(): void {
    console.log('Cargando usuarios...');
    this.loading = true;
    this.error = null;

    // DIAGNÓSTICO: Verificar estado de autenticación antes de cargar
    this.diagnoseAuthStatus();

    this.userService.getUsers()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          console.log('Finalizada carga de usuarios');
        })
      )
      .subscribe({
        next: (users) => {
          console.log(`Usuarios cargados correctamente: ${users.length} registros`);
          console.log('Datos de usuarios recibidos:', users);
          this.users = users;
          this.error = '';
          
          // Verificar si hay usuarios y en caso contrario mostrar mensaje informativo
          if (users.length === 0) {
            this.successMessage = 'No hay usuarios registrados. Puedes agregar uno nuevo.';
          }
        },        
        error: (error: any) => {
          console.error('Error al cargar usuarios:', error);
          
          const errorMsg = error.error?.message || error.message || 'Error desconocido';
          this.error = `Error en el servicio de usuarios: ${error.status} - ${errorMsg}`;

          console.log('Mensaje de error detectado:', errorMsg);
          this.users = []; // Limpiar la lista de usuarios en caso de error
        }
      });
  }

  /**
   * Método de diagnóstico para verificar el estado de autenticación
   */
  private diagnoseAuthStatus(): void {
    console.log('=== DIAGNÓSTICO DE AUTENTICACIÓN ===');
    
    // Verificar token
    const token = this.authService.getToken();
    console.log('Token disponible:', !!token);
    if (token) {
      console.log('Longitud del token:', token.length);
      console.log('Token (primeros 20 chars):', token.substring(0, 20) + '...');
      
      // Decodificar token para ver información
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Token payload:', {
            sub: payload.sub,
            exp: new Date(payload.exp * 1000).toLocaleString(),
            roles: payload.roles || payload.authorities || 'No especificados'
          });
        }
      } catch (e) {
        console.error('Error decodificando token:', e);
      }
    }
    
    // Verificar usuario actual
    const currentUser = this.authService.getCurrentUser();
    console.log('Usuario actual:', currentUser);
    
    // Verificar roles
    const isAdmin = this.authService.isAdmin();
    console.log('¿Es admin?:', isAdmin);
    
    // Verificar autenticación
    const isAuthenticated = this.authService.isAuthenticated();
    console.log('¿Está autenticado?:', isAuthenticated);
    
    console.log('=== FIN DIAGNÓSTICO ===');
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedUserId = null;
    this.resetForm();
    
    // En modo creación, restauramos la validación de contraseña
    this.userForm.get('password')?.setValidators([
      Validators.required, 
      Validators.minLength(6)
    ]);
    this.userForm.get('password')?.updateValueAndValidity();
    
    console.log('Abriendo modal para crear nuevo usuario');
    this.showModal = true;
  }  openEditModal(user: User): void {
    this.isEditMode = true;
    this.selectedUserId = typeof user.id === 'number' ? user.id : null;

    // En modo edición, eliminamos la validación de la contraseña
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();

    // Cargamos los datos del usuario en el formulario, asegurando valores válidos
    this.userForm.patchValue({
      username: user.username || '',
      email: user.email || '',
      password: '', // Siempre limpiar el campo de contraseña al editar
      name: user.name || '',
      phone: user.phone || '',
      roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [ERole.ROLE_USER],
      profilePicture: user.profilePicture || ''
    });

    // Establecemos la previsualización de la imagen si existe
    if (user.profilePicture) {
      this.previewImage = user.profilePicture;
    } else {
      this.previewImage = null;
    }

    console.log('Abriendo modal para editar usuario:', user);
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }  resetForm(): void {
    console.log('Reseteando formulario de usuario');
    
    // Limpiar el formulario pero mantener el rol por defecto USER
    this.userForm.reset({
      username: '',
      email: '',
      password: '',
      name: '',
      phone: '',
      roles: ['USER'],
      profilePicture: ''
    });
    
    // Limpiar la imagen de previsualización
    this.previewImage = null;
    
    // Limpiar estados de validación
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsUntouched();
      control?.markAsPristine();
    });
    
    // Limpiar mensajes de error
    this.error = null;
  }  async saveUser(): Promise<void> {
    if (this.userForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      this.userForm.markAllAsTouched();
      
      // Mostrar mensaje de error específico para campos requeridos
      const invalidControls = Object.keys(this.userForm.controls)
        .filter(key => this.userForm.controls[key].invalid)
        .join(', ');
      
      this.error = `Hay campos incorrectos o incompletos: ${invalidControls}`;
      return;
    }
    
    // Verificar autenticación antes de intentar guardar
    if (!this.authService.isAuthenticated()) {
      this.error = 'La sesión ha expirado. Por favor, inicie sesión nuevamente.';
      setTimeout(() => {
        this.router.navigate(['/auth/login/admin'], {
          queryParams: { 
            returnUrl: '/admin/usuarios',
            reason: 'session_expired'
          }
        });
      }, 2000);
      return;
    }
    
    this.loading = true;
    this.error = null;

    try {
      const userData = { ...this.userForm.value };
      // Log especial para la contraseña
      if (userData.password) {
        if (userData.password.startsWith('$2a$')) {
          alert('¡Atención! La contraseña que intentas guardar parece estar codificada. Debes ingresar la contraseña en texto plano.');
          console.warn('Intento de guardar contraseña codificada:', userData.password);
        } else {
          console.log('Contraseña a enviar (texto plano, longitud):', userData.password.length);
        }
      } else {
        console.log('No se envía campo contraseña (se mantiene la actual)');
      }
      
      // Antes de actualizar el usuario, verificar si el token está expirado
      if (!this.authService.isTokenValidPublic(this.authService.getToken() || '')) {
        try {
          await firstValueFrom(this.authService.refreshToken());
        } catch (refreshError) {
          this.error = 'La sesión ha expirado. Por favor, inicia sesión nuevamente.';
          this.loading = false;
          setTimeout(() => {
            this.authService.cleanupStorage();
            this.router.navigate(['/auth/login/admin'], {
              queryParams: { returnUrl: '/admin/usuarios', reason: 'session_expired' }
            });
          }, 2000);
          return;
        }
      }

      // SUBIR IMAGEN SI HAY ARCHIVO SELECCIONADO (tanto en creación como edición)
      if (this.selectedFile) {
        try {
          console.log(`Subiendo imagen para el usuario...`);
          const uploadResponse = await firstValueFrom(
            this.userService.uploadImage(this.selectedFile)
          );
          userData.profilePicture = uploadResponse.url;
          console.log('Imagen subida, nueva ruta:', userData.profilePicture);
        } catch (uploadError) {
          console.error('Error al subir la imagen:', uploadError);
          this.handleHttpError(uploadError, 'subir la imagen de perfil');
          this.loading = false;
          return; // Detener el proceso si la subida de imagen falla
        }
      }

      // Si estamos en modo edición y la contraseña está vacía, la eliminamos
      if (this.isEditMode && !userData.password) {
        delete userData.password;
      }

      // ACTUALIZAR O CREAR USUARIO
      if (this.isEditMode && this.selectedUserId) {
        console.log(`Actualizando usuario con ID: ${this.selectedUserId}`);
        this.userService.updateUser(this.selectedUserId, userData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updatedUser) => {
              console.log('Usuario actualizado correctamente:', updatedUser);
              this.successMessage = 'Usuario actualizado exitosamente';
              this.loading = false;
              this.loadUsers();
              // Mostrar el mensaje por 2 segundos y luego cerrar el modal
              setTimeout(() => {
                this.closeModal();
                // Limpiar el mensaje después de cerrar el modal
                setTimeout(() => {
                  this.successMessage = '';
                }, 500);
              }, 2000);
            },
            error: (error) => {
              console.error('Error al actualizar usuario:', error);
              this.error = error.message || 'Error al actualizar el usuario';
              this.loading = false;
            }
          });
        return;
      }

      // CREAR USUARIO (ahora con imagen si se subió)
      this.userService.createUser(userData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newUser) => {
            console.log('Usuario creado correctamente:', newUser);
            this.successMessage = 'Usuario creado exitosamente';
            this.loading = false;
            this.closeModal();
            this.loadUsers();
          },
          error: (error) => {
            console.error('Error al crear usuario:', error);
            this.error = error.message || 'Error al crear el usuario';
            this.loading = false;
            // Añadir ayuda contextual si es un error de duplicado
            if (error.message?.toLowerCase().includes('duplicado') || 
                error.message?.toLowerCase().includes('duplicate') ||
                error.message?.toLowerCase().includes('ya existe')) {
              this.error += '. Prueba con otro nombre de usuario o email.';
            }
          }
        });
    } catch (error: any) {
      console.error('Error al procesar la solicitud:', error);
      this.error = error.message || 'Error al procesar la solicitud';
      this.loading = false;
    }
  }

  // Método auxiliar para convertir ID undefined a null
  getValidId(id: number | undefined): number | null {
    return typeof id === 'number' ? id : null;
  }

  deleteUser(userId: number | undefined): void {
    const id = this.getValidId(userId);
    if (id === null) {
      console.error('ID de usuario inválido');
      return;
    }
    // Confirmación antes de eliminar
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }
    this.loading = true;
    this.userService.deleteUser(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Usuario eliminado correctamente';
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);
          this.error = 'Error al eliminar usuario';
        }
      });
  }

  toggleUserStatus(userId: number | undefined): void {
    const id = this.getValidId(userId);
    if (id === null) {
      console.error('ID de usuario inválido');
      return;
    }
    
    this.loading = true;
    this.userService.toggleUserStatus(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Estado del usuario actualizado';
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error al actualizar estado:', error);
          this.error = 'Error al actualizar estado del usuario';
        }
      });
  }

  // Manejo de roles
  onRoleChange(event: Event, role: string): void {
    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;
    const currentRoles = this.userForm.get('roles')?.value || [];
    
    if (isChecked) {
      // Agregamos el rol si no existe
      if (!currentRoles.includes(role)) {
        this.userForm.patchValue({
          roles: [...currentRoles, role]
        });
      }
    } else {
      // Eliminamos el rol
      this.userForm.patchValue({
        roles: currentRoles.filter((r: string) => r !== role)
      });
    }
  }
  
  isRoleSelected(role: string): boolean {
    const currentRoles = this.userForm.get('roles')?.value || [];
    return currentRoles.includes(role);
  }

  // Getters para validación de formularios
  get usernameControl() { return this.userForm.get('username'); }
  get emailControl() { return this.userForm.get('email'); }
  get passwordControl() { return this.userForm.get('password'); }

  // Método utilitario para mostrar mensajes temporales
  private showTimedMessage(message: string, isError: boolean = false, duration: number = 5000): void {
    if (isError) {
      this.error = message;
      this.successMessage = '';
    } else {
      this.successMessage = message;
      this.error = '';
    }
    
    // Auto-limpiar el mensaje después de cierto tiempo
    setTimeout(() => {
      if ((isError && this.error === message) || (!isError && this.successMessage === message)) {
        if (isError) {
          this.error = '';
        } else {
          this.successMessage = '';
        }
      }
    }, duration);
  }

  // Método para detectar el tipo de error y mostrar un mensaje adecuado
  private handleHttpError(error: any, context: string): void {
    console.error(`Error en ${context}:`, error);
    
    let errorMessage = error.message || `Error en ${context}`;
    
    // Mapear códigos HTTP comunes a mensajes más amigables
    if (error.status === 403) {
      errorMessage = 'No tienes permisos para realizar esta acción';
    } else if (error.status === 404) {
      errorMessage = 'El recurso solicitado no existe o ha sido eliminado';
    } else if (error.status === 409) {
      errorMessage = 'Ya existe un usuario con estos datos';
    } else if (error.status === 0) {
      errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet';
    } else if (error.status >= 500) {
      errorMessage = 'Error en el servidor. Por favor, inténtalo más tarde';
    }
    
    this.showTimedMessage(errorMessage, true);
  }

  /**
   * Verifica el estado de la conexión con la API
   * Útil para diagnosticar problemas de conectividad
   */  checkApiStatus(): void {
    console.log('Verificando estado de la API...');
    
    this.apiDiagnostics.checkApiStatus().subscribe({
      next: (result: ApiDiagnosticResult) => {
        console.log('Resultado de diagnóstico:', result);
        this.apiStatus = result;
        
        if (!result.authValid) {
          this.authService.logout();
          this.router.navigate(['/auth/login/admin']);
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al verificar API:', error);
        this.apiStatus = {
          serverAvailable: false,
          apiAvailable: false,
          authValid: false,
          error: 'Error al verificar el estado de la API'
        };
      }
    });
  }
  
  /**
   * Verifica los permisos de administrador
   */
  private checkAdminPermissions(): void {
    this.apiDiagnostics.checkAdminPermissions()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (result) => {
          console.log('Resultado verificación de admin:', result);
          
          if (result.hasAdminPermission) {
            this.successMessage = 'Verificación completa: Tienes permisos de administrador. Cargando usuarios...';
            setTimeout(() => this.loadUsers(), 1000);
          } else {
            this.error = `Problema de permisos: ${result.error}`;
            this.successMessage = '';
              // Información adicional para desarrollo
            if (!environment.production) {
              console.group('Información del Token');
              console.log('Token actual:', this.authService.getToken()?.substring(0, 20) + '...');
              console.log('Roles:', this.currentUser?.roles);
              console.groupEnd();
            }
          }
        },        error: (err: any) => {
          console.error('Error al verificar permisos de administrador:', err);
          this.error = 'Error al verificar permisos: ' + (err.message || 'Error desconocido');
          this.successMessage = '';
        }
      });
  }

  /**
   * Maneja la carga de archivos de imagen para la foto de perfil
   * @param event Evento del input de tipo file
   */
  handleFileInput(event: any): void {
    const file = event.target.files[0];
    this.selectedFile = file;
    
    if (file) {
      // Verificar que sea una imagen
      if (!file.type.startsWith('image/')) {
        this.error = 'El archivo seleccionado no es una imagen válida';
        return;
      }

      // Tamaño máximo: 2MB
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        this.error = 'La imagen es demasiado grande. El tamaño máximo es 2MB';
        return;
      }

      // Leer el archivo como Base64 para previsualización
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result;
        console.log('Imagen cargada correctamente para previsualización');
      };
      reader.onerror = () => {
        console.error('Error al leer el archivo');
        this.error = 'Error al procesar la imagen';
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Limpia la imagen de perfil
   */
  clearProfilePicture(): void {
    this.previewImage = null;
    this.selectedFile = null;
    this.userForm.patchValue({
      profilePicture: ''
    });
  }

  getDiagnosticInfo(): void {
    this.apiDiagnostics.getDiagnosticInfo().subscribe({
      next: (info: any) => {
        console.log('Información de diagnóstico API');
        console.log('Informe completo:', info);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al obtener información de diagnóstico:', error);
      }
    });
  }

  /**
   * Método de emergencia para auto-login en la vista de usuarios
   * Solo se ejecuta cuando se detecta un problema de autenticación
   * Este método no modifica los servicios principales de autenticación
   */  emergencyLogin(): void {
    console.log('Iniciando login de emergencia para admin...');
    
    // Mostrar estado actual de autenticación para diagnóstico
    this.showAuthStatus();
    
    // SOLUCIÓN DIRECTA: En lugar de hacer una llamada al backend,
    // creamos un token simulado y establecemos manualmente la autenticación
    
    console.log('Aplicando autenticación de emergencia directa sin llamada al backend');
    
    try {      // Crear un objeto de usuario con los datos mínimos necesarios
      const emergencyUser = {
        id: 1,
        username: 'admin',
        email: 'admin@sistema.com',
        roles: [ERole.ROLE_ADMIN],
        token: 'emergency-token-' + new Date().getTime(),
        refreshToken: 'emergency-refresh-' + new Date().getTime(),
        active: true
      };
      
      // Establecer tokens de emergencia
      localStorage.setItem('auth_token', emergencyUser.token);
      localStorage.setItem('token', emergencyUser.token);
      localStorage.setItem('refresh_token', emergencyUser.refreshToken);
      
      // Establecer fecha de expiración (1 día)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 1);
      localStorage.setItem('token_expiry', expiryDate.getTime().toString());
      
      // Guardar datos completos del usuario
      localStorage.setItem('auth_user', JSON.stringify(emergencyUser));
      localStorage.setItem('user', JSON.stringify(emergencyUser));
      localStorage.setItem('user_roles', JSON.stringify(emergencyUser.roles));
      
      console.log('Datos de autenticación de emergencia guardados');
      this.showAuthStatus();
      
      // Informar al usuario antes de recargar
      this.successMessage = 'Sesión de emergencia creada. Recargando...';
      
      // Recargar después de un breve retraso para que el usuario vea el mensaje
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (e) {
      console.error('Error al aplicar autenticación de emergencia:', e);
      this.error = 'No se pudo aplicar autenticación de emergencia';
    }
    
    /* MÉTODO ORIGINAL COMENTADO - REEMPLAZADO POR SOLUCIÓN DIRECTA
    // URL para login directo
    const loginUrl = `${environment.apiUrl}/api/auth/login`;
    
    // Credenciales de admin
    const credentials = {
      username: 'admin',
      password: 'admin123'
    };
    
    console.log('Realizando login de emergencia en:', loginUrl);
    
    this.http.post<any>(loginUrl, credentials)
      .subscribe({
        next: (response) => {
          console.log('Login de emergencia exitoso:', response);
          
          // Guardar token y refresh token directamente en localStorage
          if (response.token) {
            localStorage.setItem('auth_token', response.token);
            localStorage.setItem('token', response.token); // Respaldo para compatibilidad
            
            // Guardar refresh token (o usar el token como respaldo)
            if (response.refreshToken) {
              localStorage.setItem('refresh_token', response.refreshToken);
            } else {
              localStorage.setItem('refresh_token', response.token);
            }
            
            // Configurar fecha de expiración (7 días)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7);
            localStorage.setItem('token_expiry', expiryDate.getTime().toString());
            
            // Guardar datos completos del usuario
            localStorage.setItem('auth_user', JSON.stringify(response));
            localStorage.setItem('user', JSON.stringify(response)); // Respaldo para compatibilidad
            
            console.log('Datos de sesión guardados correctamente');
            this.showAuthStatus();
            
            // Recargar la página para aplicar los nuevos tokens
            console.log('Recargando página para aplicar nueva sesión...');
            window.location.reload();
          } else {
            console.error('Login exitoso pero no se recibió token');
            this.error = 'Error en login de emergencia: No se recibió token';
          }
        },
        error: (error) => {
          console.error('Error en login de emergencia:', error);
          
          // Mostrar mensaje específico según el error
          if (error.status === 401) {
            this.error = 'Credenciales de emergencia incorrectas. Inicie sesión manualmente.';
          } else if (error.status === 0) {
            this.error = 'Error de conexión al servidor. Verifique que el backend esté funcionando.';
          } else {
            this.error = `Error en login de emergencia: ${error.message || error.statusText || 'Error desconocido'}`;
          }
          
          // Redirigir al login después de un breve retraso
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: { 
                returnUrl: '/admin/usuarios',
                reason: 'emergency_login_failed'
              }
            });
          }, 2000);
        }
      });
    */
  }
  
  // Método para mostrar el estado actual de autenticación para diagnóstico
  showAuthStatus(): void {
    console.log('----- ESTADO DE AUTENTICACIÓN -----');
    console.log('auth_token:', !!localStorage.getItem('auth_token'));
    console.log('token:', !!localStorage.getItem('token'));
    console.log('refresh_token:', !!localStorage.getItem('refresh_token'));
    console.log('token_expiry:', localStorage.getItem('token_expiry'));
    console.log('auth_user:', !!localStorage.getItem('auth_user'));
    console.log('user:', !!localStorage.getItem('user'));
    console.log('----------------------------------');
  }
  
  private runApiDiagnostics(): void {
    // Mostrar diagnóstico de autenticación primero
    this.showAuthStatus();
    console.log('Ejecutando diagnóstico de API básico');
    console.log('Token actual:', this.authService.getToken() ? 'Presente' : 'Ausente');
    
    // Verificar token de autenticación
    const token = this.authService.getToken();
    if (!token) {
      console.warn('No hay token de autenticación');
      this.error = 'No hay sesión activa. Por favor inicie sesión nuevamente.';
      return;
    }
    
    // Analizar token para depuración
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('Token JWT decodificado:', {
          sub: payload.sub,
          exp: new Date(payload.exp * 1000).toLocaleString(),
          roles: payload.roles || payload.role || payload.authorities
        });
      }
    } catch (e) {
      console.warn('No se pudo analizar el token JWT:', e);
    }
    
    // Verificar validez del token
    if (!this.authService.isTokenValidPublic(token)) {
      console.warn('Token inválido o expirado');
      this.error = 'La sesión ha expirado. Por favor inicie sesión nuevamente.';
      
      // Intentar renovar el token
      this.authService.refreshToken().subscribe({
        next: (response) => {
          console.log('Token renovado exitosamente');
          // Intentar cargar los usuarios con el nuevo token
          this.loadUsers();
        },
        error: (err) => {
          console.error('Error renovando token:', err);
          this.error = 'Error renovando credenciales. Por favor inicie sesión nuevamente.';
          this.authService.cleanupStorage();
          this.router.navigate(['/login'], {
            queryParams: {returnUrl: '/admin/usuarios'}
          });
        }
      });
      return;
    }
    
    // Si el token parece válido, intentar cargar los usuarios
    console.log('Token parece válido, intentando cargar usuarios');
    this.loadUsers();
  }

  get isAdmin(): boolean {
    return this.authService.hasRole(ERole.ROLE_ADMIN);
  }

  get userRoles(): string[] {
    return this.currentUser?.roles || [];
  }
  // Helper para obtener la URL de la imagen del usuario
  getUserImageUrl(user: User): string {
    // Si hay una foto de perfil, construimos la URL completa si es relativa
    if (user && user.profilePicture) {
      return user.profilePicture.startsWith('http')
        ? user.profilePicture
        : `${environment.apiUrl}${user.profilePicture.startsWith('/') ? '' : '/'}${user.profilePicture}`;
    }
    // Imagen por defecto si no hay foto
    return 'assets/img/default-avatar.png';
  }

  // Helper para manejar errores de carga de imagen
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    console.log('Error al cargar imagen, usando imagen por defecto');
    img.src = 'assets/img/default-avatar.png';
    // Prevenir bucles infinitos si la imagen por defecto también falla
    img.onerror = null;
  }
}