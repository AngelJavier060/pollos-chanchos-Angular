import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChanchosDashboardComponent } from './chanchos-dashboard.component';
import { ChanchosRoutingModule } from './chanchos-routing.module';
import { ChanchosDashboardHomeComponent } from './chanchos-dashboard-home.component';

@NgModule({
  declarations: [ChanchosDashboardComponent, ChanchosDashboardHomeComponent],
  imports: [CommonModule, RouterModule, ChanchosRoutingModule],
  exports: [ChanchosDashboardComponent]
})
export class ChanchosModule {} 