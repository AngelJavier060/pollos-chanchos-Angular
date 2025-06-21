import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ERole } from '../../shared/models/role.model';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-usuarios-fallback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <h1 class="mb-4">Lista de Usuarios (Modo Local)</h1>
      
      <div class="alert alert-info">
        <strong>Modo de datos local activado</strong>
        <p>Esta es una versión simplificada del panel de usuarios utilizando datos locales para evitar problemas de conectividad con la API.</p>
      </div>
      
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>{{ user.id }}</td>
              <td>
                <div class="d-flex align-items-center">
                  <img 
                    *ngIf="user.photoUrl" 
                    [src]="user.photoUrl" 
                    class="rounded-circle me-2" 
                    alt="{{ user.name }}"
                    style="width: 32px; height: 32px; object-fit: cover;">
                  <span>{{ user.name }}</span>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span *ngFor="let role of user.roles" class="badge rounded-pill bg-primary me-1">
                  {{ formatRole(role) }}
                </span>
              </td>
              <td>
                <span [class]="user.active ? 'badge bg-success' : 'badge bg-danger'">
                  {{ user.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .badge {
      padding: 0.5em 0.75em;
      font-size: 0.75em;
    }
  `]
})
export class UsuariosFallbackComponent implements OnInit {
  users: User[] = [];

  ngOnInit(): void {
    this.loadMockUsers();
  }

  private loadMockUsers(): void {
    this.users = [
      {
        id: 1,
        username: 'admin',
        name: 'Administrador del Sistema',
        email: 'admin@ejemplo.com',
        active: true,
        roles: [ERole.ROLE_ADMIN],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        username: 'usuario',
        name: 'Usuario Normal',
        email: 'usuario@ejemplo.com',
        active: true,
        roles: [ERole.ROLE_USER],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        username: 'supervisor',
        name: 'Supervisor',
        email: 'supervisor@ejemplo.com',
        active: true,
        roles: [ERole.ROLE_SUPERVISOR],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 4,
        username: 'poultry',
        name: 'Gestor Avícola',
        email: 'poultry@ejemplo.com',
        active: true,
        roles: [ERole.ROLE_POULTRY],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 5,
        username: 'porcine',
        name: 'Gestor Porcino',
        email: 'porcine@ejemplo.com',
        active: true,
        roles: [ERole.ROLE_PORCINE],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 6,
        username: 'inactivo',
        name: 'Usuario Inactivo',
        email: 'inactivo@ejemplo.com',
        active: false,
        roles: [ERole.ROLE_USER],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  formatRole(role: ERole): string {
    // Eliminar el prefijo ROLE_ y convertir a título
    return role.replace('ROLE_', '').toLowerCase()
      .replace(/\b\w/g, first => first.toUpperCase());
  }
}
