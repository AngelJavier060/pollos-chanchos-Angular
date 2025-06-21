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
    path: 'diagnostico', 
    loadComponent: () => import('./diagnostico.component').then(m => m.DiagnosticoComponent),
    title: 'Diagnóstico de Autenticación'
  },
  {
    path: 'debug-auth',
    loadComponent: () => import('./features/diagnostics/auth-flow-debug.component').then(m => m.AuthFlowDebugComponent),
    title: 'Depurador de Flujo de Autenticación'
  },
  { 
    path: '**', 
    redirectTo: '',
    pathMatch: 'full'
  }
];