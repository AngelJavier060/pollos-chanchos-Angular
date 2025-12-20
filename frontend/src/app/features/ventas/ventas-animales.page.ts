import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VentasAnimalesWidgetComponent } from '../dashboard/widgets/ventas-animales-widget.component';

@Component({
  selector: 'app-ventas-animales-page',
  standalone: true,
  imports: [CommonModule, RouterModule, VentasAnimalesWidgetComponent],
  template: `
  <div class="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
    <div class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-6">
      <h1 class="text-3xl font-bold">🐓 🐷 Venta de Animales</h1>
      <p class="text-sm opacity-90">Sistema de gestión y control de ventas</p>
    </div>
    <div class="p-6 bg-white">
      <app-ventas-animales-widget></app-ventas-animales-widget>
    </div>
  </div>
  `
})
export class VentasAnimalesPage {}
