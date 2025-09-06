import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VentasHuevosWidgetComponent } from './widgets/ventas-huevos-widget.component';
import { VentasAnimalesWidgetComponent } from './widgets/ventas-animales-widget.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, VentasHuevosWidgetComponent, VentasAnimalesWidgetComponent]
})
export class DashboardComponent implements OnInit {
  activeTab: 'huevos' | 'animales' = 'huevos';

  constructor() { }

  ngOnInit(): void {
    // Aquí podemos cargar datos iniciales del dashboard
  }

  setTab(tab: 'huevos' | 'animales') {
    this.activeTab = tab;
  }
}