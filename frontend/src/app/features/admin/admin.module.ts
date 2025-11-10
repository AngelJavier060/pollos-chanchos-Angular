import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AdminComponent } from './admin.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { LotesComponent } from '../lotes/lotes.component';
import { InventarioComponent } from '../inventario/inventario.component';
import { PlanNutricionalComponent } from '../plan-nutricional/plan-nutricional.component';
import { ReportesComponent } from '../reportes/reportes.component';
import { ProfileComponent } from '../profile/profile.component';
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
      {
        path: 'inventario/sanidad',
        loadComponent: () => import('../inventario/sanidad-cuidado-animal.component').then(m => m.SanidadCuidadoAnimalComponent),
        title: 'Sanidad y Cuidado Animal',
        canActivate: [AuthGuard],
        data: { roles: [ERole.ROLE_ADMIN] }
      },
      {
        path: 'inventario/operacion',
        loadComponent: () => import('../inventario/gastos-operacion.component').then(m => m.GastosOperacionComponent),
        title: 'Gastos de Operación',
        canActivate: [AuthGuard],
        data: { roles: [ERole.ROLE_ADMIN] }
      },
      {
        path: 'inventario/mano-obra',
        loadComponent: () => import('../inventario/mano-obra.component').then(m => m.ManoObraComponent),
        title: 'Mano de Obra',
        canActivate: [AuthGuard],
        data: { roles: [ERole.ROLE_ADMIN] }
      },
      {
        path: 'inventario/logistica',
        loadComponent: () => import('../inventario/logistica.component').then(m => m.LogisticaComponent),
        title: 'Movilización y Logística',
        canActivate: [AuthGuard],
        data: { roles: [ERole.ROLE_ADMIN] }
      },
      {
        path: 'inventario/fijos',
        loadComponent: () => import('../inventario/costos-fijos.component').then(m => m.CostosFijosComponent),
        title: 'Costos Fijos',
        canActivate: [AuthGuard],
        data: { roles: [ERole.ROLE_ADMIN] }
      },
      {
        path: 'ventas/huevos',
        loadComponent: () => import('../ventas/ventas-huevos.page').then(m => m.VentasHuevosPage),
        title: 'Venta de Huevo',
        canActivate: [AuthGuard],
        data: { roles: [ERole.ROLE_ADMIN] }
      },
      {
        path: 'ventas/animales',
        loadComponent: () => import('../ventas/ventas-animales.page').then(m => m.VentasAnimalesPage),
        title: 'Venta de Animales',
        canActivate: [AuthGuard],
        data: { roles: [ERole.ROLE_ADMIN] }
      },
      { path: 'plan-nutricional', component: PlanNutricionalComponent, title: 'Plan Nutricional' },
      {
        path: 'analisis-financiero',
        loadComponent: () => import('../analisis-financiero/analisis-financiero.component').then(m => m.AnalisisFinancieroComponent),
        title: 'Análisis Financiero',
        canActivate: [AuthGuard],
        data: { roles: [ERole.ROLE_ADMIN] }
      },
      { path: 'reportes', component: ReportesComponent, title: 'Reportes' },
      { path: 'profile', component: ProfileComponent, title: 'Perfil' },
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
    ReactiveFormsModule,
    FormsModule
    // AdminComponent es un componente standalone y no debe importarse aquí
  ]
})
export class AdminModule { }