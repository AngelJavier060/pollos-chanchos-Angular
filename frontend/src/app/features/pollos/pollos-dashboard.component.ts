import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-pollos-dashboard',
  templateUrl: './pollos-dashboard.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosDashboardComponent implements OnInit {
  user: User | null = null;
  isUserMenuOpen = false;

  constructor(private authService: AuthDirectService) {}

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
  }

  logout(): void {
    this.authService.logout();
  }
}