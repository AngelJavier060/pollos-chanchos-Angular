import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-chanchos-dashboard',
  templateUrl: './chanchos-dashboard.component.html',
  styleUrls: ['./chanchos-dashboard.component.scss']
})
export class ChanchosDashboardComponent implements OnInit {
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