import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { UserService } from '../../../shared/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/user.model';
import { ERole } from '../../../shared/models/role.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class UsuariosComponent implements OnInit, OnDestroy {
  users: User[] = [];
  errorMessage = '';
  loading: boolean = false;
  roleEnum = ERole;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Verificar autenticación y roles
    if (!this.authService.isAuthenticated() || !this.authService.hasRole(ERole.ROLE_ADMIN)) {
      this.router.navigate(['/auth/login/admin']);
      return;
    }

    // Suscribirse al observable de usuarios
    this.userService.users$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(users => {
      this.users = users;
      this.loading = false;
    });

    // Cargar usuarios
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUsers(): void {
    this.loading = true;
    this.userService.getUsers()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (users) => {
          console.log('Usuarios cargados:', users);
          this.users = users;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar usuarios:', error);
          
          // Manejar diferentes tipos de errores
          if (error.status === 401) {
            // Token expirado o inválido
            this.authService.logout();
            this.router.navigate(['/auth/login/admin']);
          } else if (error.status === 403) {
            // No tiene permisos
            this.router.navigate(['/auth/login/admin']);
          } else if (error.status === 0) {
            // Servidor no disponible
            this.errorMessage = 'El servidor no está disponible. Por favor, intenta más tarde.';
          } else {
            // Otro error
            this.errorMessage = error.error?.message || 'Error al cargar usuarios';
          }
          
          this.loading = false;
        }
      });
  }

  hasRole(role: ERole): boolean {
    return this.authService.hasRole(role);
  }
}