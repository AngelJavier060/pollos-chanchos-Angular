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
  isAdmin = false;
  private destroy$ = new Subject<void>();
  private dropdownTimeout: any;

  constructor(
    public authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      // Normalizar foto: si no hay profilePicture, usar photoUrl cuando exista
      if (user && !user.profilePicture && (user as any).photoUrl) {
        user = { ...user, profilePicture: (user as any).photoUrl } as User;
      }
      this.currentUser = user;
      this.isAdmin = this.authService.isAdmin();
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
    }, 300);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
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
