import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthGuard } from '../../core/guards/auth.guard';
import { ChanchosDashboardComponent } from './chanchos-dashboard.component';
import { ChanchosDashboardHomeComponent } from './chanchos-dashboard-home.component';
import { ChanchosAlimentacionComponent } from './chanchos-alimentacion.component';
import { ChanchosLotesComponent } from './chanchos-lotes.component';
import { ChanchosHistoricoComponent } from './chanchos-historico.component';

const routes: Routes = [
  {
    path: '',
    component: ChanchosDashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ChanchosDashboardHomeComponent, canActivate: [AuthGuard] },
      { path: 'alimentacion', component: ChanchosAlimentacionComponent, canActivate: [AuthGuard] },
      { path: 'lotes', component: ChanchosLotesComponent, canActivate: [AuthGuard] },
      { path: 'historico', component: ChanchosHistoricoComponent, canActivate: [AuthGuard] }
    ]
  }
];

@NgModule({
  declarations: [
    ChanchosDashboardComponent,
    ChanchosDashboardHomeComponent,
    ChanchosAlimentacionComponent,
    ChanchosLotesComponent,
    ChanchosHistoricoComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class ChanchosModule { } 