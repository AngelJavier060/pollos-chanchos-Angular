import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/user.model';
import { ERole } from '../../../shared/models/role.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class NavbarComponent implements OnInit, OnDestroy {
  isMobileMenuOpen = false;
  isAuthenticated = false;
  isDropdownOpen = false;
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();
  private dropdownTimeout: any;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        // Convertimos el usuario recibido a tipo User
        this.currentUser = user as User;
        this.isAuthenticated = !!user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  showDropdown(): void {
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
    this.isDropdownOpen = true;
  }

  hideDropdown(): void {
    this.dropdownTimeout = setTimeout(() => {
      this.isDropdownOpen = false;
    }, 300); // Aumentamos el tiempo para que no se cierre tan rápido
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/']);
  }
  hasRole(role: ERole): boolean {
    return this.authService.hasRolePublic(role);
  }

  navigateToLogin(): void {
    // Limpiar la sesión antes de ir a la página de login
    this.authService.cleanupStoragePublic();
    this.router.navigate(['/login']);
    
    // Cerrar menú desplegable móvil si está abierto
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false;
    }
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }
}
