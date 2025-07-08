import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthGuard } from '../../core/guards/auth.guard';
import { PollosDashboardComponent } from './pollos-dashboard.component';
import { PollosDashboardHomeComponent } from './pollos-dashboard-home.component';
import { PollosAlimentacionComponent } from './pollos-alimentacion.component';
import { PollosLotesComponent } from './pollos-lotes.component';
import { PollosHistoricoComponent } from './pollos-historico.component';

const routes: Routes = [
  {
    path: '',
    component: PollosDashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: PollosDashboardHomeComponent, canActivate: [AuthGuard] },
      { path: 'alimentacion', component: PollosAlimentacionComponent, canActivate: [AuthGuard] },
      { path: 'lotes', component: PollosLotesComponent, canActivate: [AuthGuard] },
      { path: 'historico', component: PollosHistoricoComponent, canActivate: [AuthGuard] }
    ]
  }
];

@NgModule({
  declarations: [
    PollosDashboardComponent,
    PollosDashboardHomeComponent,
    PollosAlimentacionComponent,
    PollosLotesComponent,
    PollosHistoricoComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class PollosModule { } 