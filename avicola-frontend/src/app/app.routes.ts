import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { ServicesComponent } from './features/services/services.component';
import { UsuariosComponent } from './features/usuarios/usuarios.component';
import { AuthGuard } from './core/guards/auth.guard';
import { LoteTestComponent } from './features/lotes/lote-test.component';

export const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent 
  },
  { 
    path: 'auth/login/:type', 
    component: LoginComponent 
  },
  { 
    path: 'admin', 
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AuthGuard]
  },
  { 
    path: 'servicios', 
    component: ServicesComponent 
  },
  { 
    path: 'lote-test', 
    component: LoteTestComponent 
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];