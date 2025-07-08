import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { ServicesComponent } from './features/services/services.component';
import { AuthGuard } from './core/guards/auth.guard';
import { HomeLayoutComponent } from './shared/components/home-layout/home-layout.component';
import { ERole } from './shared/models/role.model';
import { environment } from '../environments/environment';

export const routes: Routes = [
  { 
    path: '',
    component: HomeLayoutComponent,
    children: [
      { path: '', component: HomeComponent, title: 'Inicio' },
      { path: 'servicios', component: ServicesComponent, title: 'Servicios' }
    ]
  },  { 
    path: 'login', 
    component: LoginComponent,
    title: 'Iniciar Sesión'
  },  { 
    path: 'admin', 
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AuthGuard],
    title: 'Panel de Administración',
    data: { 
      roles: [ERole.ROLE_ADMIN],
      skipAuthCheck: environment.production === false // En desarrollo saltamos la verificación
    }
  },
  {
    path: 'pollos',
    loadChildren: () => import('./features/pollos/pollos.module').then(m => m.PollosModule),
    canActivate: [AuthGuard],
    title: 'Panel de Pollos',
    data: { roles: [ERole.ROLE_POULTRY] }
  },
  {
    path: 'chanchos',
    loadChildren: () => import('./features/chanchos/chanchos.module').then(m => m.ChanchosModule),
    canActivate: [AuthGuard],
    title: 'Panel de Chanchos',
    data: { roles: [ERole.ROLE_PORCINE] }
  },
  { path: 'auth/login', component: LoginComponent, title: 'Iniciar Sesión' },
  { path: 'auth/login/pollos', component: LoginComponent, title: 'Iniciar Sesión Pollos' },
  { path: 'auth/login/chanchos', component: LoginComponent, title: 'Iniciar Sesión Chanchos' },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard],
    title: 'Mi Perfil'
  },
  { 
    path: '**', 
    redirectTo: '',
    pathMatch: 'full'
  }
];