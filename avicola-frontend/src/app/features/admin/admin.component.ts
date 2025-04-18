import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AdminComponent {
  adminName: string = 'Alexandra';
  isUserMenuOpen: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  cerrarSesion(): void {
    // Lógica para cerrar sesión
    this.authService.logout();
    this.router.navigate(['/']);
  }

  navegarA(ruta: string): void {
    this.router.navigate(['/admin', ruta]);
  }
}