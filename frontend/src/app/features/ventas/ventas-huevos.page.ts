import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VentasHuevosWidgetComponent } from '../dashboard/widgets/ventas-huevos-widget.component';

@Component({
  selector: 'app-ventas-huevos-page',
  standalone: true,
  imports: [CommonModule, RouterModule, VentasHuevosWidgetComponent],
  template: `
  <div class="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
    <div class="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white px-8 py-6">
      <h1 class="text-3xl font-bold">🥚 Venta de Huevos</h1>
      <p class="text-sm opacity-90">Sistema de gestión y control de ventas</p>
    </div>
    <div class="p-6 bg-white">
      <app-ventas-huevos-widget></app-ventas-huevos-widget>
    </div>
  </div>
  `
})
export class VentasHuevosPage {}
