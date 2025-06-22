import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChanchosDashboardComponent } from './chanchos-dashboard.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ERole } from '../../shared/models/role.model';
import { ChanchosDashboardHomeComponent } from './chanchos-dashboard-home.component';

const routes: Routes = [
  {
    path: '',
    component: ChanchosDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: [ERole.ROLE_PORCINE] },
    children: [
      // Aquí se pueden agregar rutas hijas específicas para chanchos
      { path: 'profile', loadComponent: () => import('../profile/profile.component').then(m => m.ProfileComponent), title: 'Perfil' },
      { path: 'perfil', loadComponent: () => import('../../features/profile/profile.component').then(m => m.ProfileComponent), title: 'Mi Perfil' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ChanchosDashboardHomeComponent, title: 'Dashboard' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChanchosRoutingModule {} 