import { Component } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-chanchos-dashboard-home',
  templateUrl: './chanchos-dashboard-home.component.html',
  styleUrls: ['./chanchos-dashboard.component.scss']
})
export class ChanchosDashboardHomeComponent {
  user: User | null = null;
  constructor(private authService: AuthDirectService) {
    this.user = this.authService.currentUserValue;
  }
} 