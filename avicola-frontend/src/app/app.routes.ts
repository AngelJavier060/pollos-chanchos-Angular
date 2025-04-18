import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { ServicesComponent } from './features/services/services.component';
import { UsuariosComponent } from './features/usuarios/usuarios.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'servicios', component: ServicesComponent },
  { path: 'login', component: LoginComponent },
  { path: 'auth/login/:type', component: LoginComponent },
  { path: 'usuarios', component: UsuariosComponent },
  { 
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule)
  },
  { path: '**', redirectTo: '' }
];