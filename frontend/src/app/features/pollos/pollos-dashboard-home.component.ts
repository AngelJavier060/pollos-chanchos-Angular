import { Component } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-pollos-dashboard-home',
  templateUrl: './pollos-dashboard-home.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosDashboardHomeComponent {
  user: User | null = null;
  constructor(private authService: AuthDirectService) {
    this.user = this.authService.currentUserValue;
  }
} 