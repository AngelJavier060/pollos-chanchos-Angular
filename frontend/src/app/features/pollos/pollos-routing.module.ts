import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PollosDashboardComponent } from './pollos-dashboard.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ERole } from '../../shared/models/role.model';
import { PollosDashboardHomeComponent } from './pollos-dashboard-home.component';

const routes: Routes = [
  {
    path: '',
    component: PollosDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: [ERole.ROLE_POULTRY] },
    children: [
      // Aquí se pueden agregar rutas hijas específicas para pollos
      { path: 'profile', loadComponent: () => import('../profile/profile.component').then(m => m.ProfileComponent), title: 'Perfil' },
      { path: 'perfil', loadComponent: () => import('../../features/profile/profile.component').then(m => m.ProfileComponent), title: 'Mi Perfil' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: PollosDashboardHomeComponent, title: 'Dashboard' },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PollosRoutingModule {} 