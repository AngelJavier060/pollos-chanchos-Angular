import { Component, OnInit } from '@angular/core';
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
  isUserMenuOpen: boolean = false;
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.adminName = currentUser.username;
    }
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
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
}