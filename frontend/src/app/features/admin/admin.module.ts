import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { AdminComponent } from './admin.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { LotesComponent } from '../lotes/lotes.component';
import { InventarioComponent } from '../inventario/inventario.component';
import { PlanNutricionalComponent } from '../plan-nutricional/plan-nutricional.component';
import { ReportesComponent } from '../reportes/reportes.component';
import { ProfileComponent } from '../profile/profile.component';
import { SystemStatusComponent } from '../../shared/components/system-status.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ERole } from '../../shared/models/role.model';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    canActivate: [AuthGuard],
    data: { roles: [ERole.ROLE_ADMIN] },
    children: [      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, title: 'Dashboard' },      { 
        path: 'usuarios', 
        loadComponent: () => import('../../features/usuarios/usuarios.component').then(m => m.UsuariosComponent),
        title: 'Gestión de Usuarios',
        canActivate: [AuthGuard],
        data: { 
          roles: [ERole.ROLE_ADMIN],
          keepAdmin: true // Indicador para mantener en sección admin
        }
      },
      { path: 'lotes', component: LotesComponent, title: 'Gestión de Lotes' },
      { path: 'inventario', component: InventarioComponent, title: 'Inventario' },
      { path: 'plan-nutricional', component: PlanNutricionalComponent, title: 'Plan Nutricional' },
      { path: 'reportes', component: ReportesComponent, title: 'Reportes' },
      { path: 'profile', component: ProfileComponent, title: 'Perfil' },
      { path: 'diagnostico', component: SystemStatusComponent, title: 'Diagnóstico del Sistema' },
      { 
        path: 'configuracion',
        loadChildren: () => import('../configuracion/configuracion.module').then(m => m.ConfiguracionModule),
        title: 'Configuración',
        canActivate: [AuthGuard],
        data: { roles: [ERole.ROLE_ADMIN] }
      }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule
    // AdminComponent es un componente standalone y no debe importarse aquí
  ]
})
export class AdminModule { }