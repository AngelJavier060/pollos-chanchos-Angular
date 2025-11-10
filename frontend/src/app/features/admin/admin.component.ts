import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {

  adminName: string = '';
  displayName: string = 'Usuario'; // Propiedad estable para el nombre
  isUserMenuOpen: boolean = false;
  currentUser: User | null = null;
  avatarUrl: string = 'assets/img/default-avatar.png';
  inventarioOpen: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.adminName = currentUser.username;
      this.currentUser = currentUser;
      this.updateAvatarUrl();
    }
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      // Usar setTimeout para evitar el error de detección de cambios
      setTimeout(() => {
        this.updateAvatarUrl();
        this.cdr.detectChanges();
      });
    });
  }

  private updateAvatarUrl(): void {
    const newAvatarUrl = this.currentUser?.profilePicture || 'assets/img/default-avatar.png';
    if (this.avatarUrl !== newAvatarUrl) {
      this.avatarUrl = newAvatarUrl;
    }
    
    // Actualizar también el nombre de manera estable
    const newDisplayName = this.currentUser?.name || this.currentUser?.username || 'Usuario';
    if (this.displayName !== newDisplayName) {
      this.displayName = newDisplayName;
    }
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  navegarA(path: string): void {
    this.router.navigate([`/admin/${path}`]);
    this.closeUserMenu();
    this.inventarioOpen = false;
  }

  navegarAInventario(tab: 'productos' | 'inventario-automatico' | 'entradas' | 'alertas'): void {
    this.router.navigate(['/admin/inventario'], { queryParams: { tab } });
    this.closeUserMenu();
    this.inventarioOpen = false;
  }

  navegarAPerfil(): void {
    this.router.navigate(['/admin/profile']);
    this.closeUserMenu();
  }

  navegarAConfiguraciones(): void {
    this.router.navigate(['/admin/configuracion']);
    this.closeUserMenu();
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleInventario(): void {
    this.inventarioOpen = !this.inventarioOpen;
  }
}