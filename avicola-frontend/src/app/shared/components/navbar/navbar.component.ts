import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class NavbarComponent implements OnInit {
  isMobileMenuOpen = false;
  isAuthenticated = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser.subscribe((user: any) => {
      this.isAuthenticated = !!user;
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  navigateToLogin(role: string): void {
    this.router.navigate(['/auth/login', role]);
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}