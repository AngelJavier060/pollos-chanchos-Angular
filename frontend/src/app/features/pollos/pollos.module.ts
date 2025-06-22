import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PollosDashboardComponent } from './pollos-dashboard.component';
import { PollosRoutingModule } from './pollos-routing.module';
import { PollosDashboardHomeComponent } from './pollos-dashboard-home.component';

@NgModule({
  declarations: [PollosDashboardComponent, PollosDashboardHomeComponent],
  imports: [CommonModule, RouterModule, PollosRoutingModule],
  exports: [PollosDashboardComponent]
})
export class PollosModule {} 