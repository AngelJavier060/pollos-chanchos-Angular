import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { AdminComponent } from './admin.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { UsuariosComponent } from '../usuarios/usuarios.component';
import { LotesComponent } from '../lotes/lotes.component';
import { InventarioComponent } from '../inventario/inventario.component';
import { PlanNutricionalComponent } from '../plan-nutricional/plan-nutricional.component';
import { ReportesComponent } from '../reportes/reportes.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'lotes', component: LotesComponent },
      { path: 'inventario', component: InventarioComponent },
      { path: 'plan-nutricional', component: PlanNutricionalComponent },
      { path: 'reportes', component: ReportesComponent },
      { 
        path: 'configuracion',
        loadChildren: () => import('../configuracion/configuracion.module').then(m => m.ConfiguracionModule)
      }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    AdminComponent,
    DashboardComponent,
    UsuariosComponent,
    LotesComponent,
    InventarioComponent,
    PlanNutricionalComponent,
    ReportesComponent
  ]
})
export class AdminModule { }