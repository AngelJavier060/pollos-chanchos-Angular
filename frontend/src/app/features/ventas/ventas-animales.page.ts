import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VentasAnimalesWidgetComponent } from '../dashboard/widgets/ventas-animales-widget.component';

@Component({
  selector: 'app-ventas-animales-page',
  standalone: true,
  imports: [CommonModule, RouterModule, VentasAnimalesWidgetComponent],
  template: `
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold">Venta de Animales (vista)</h1>
      <p class="text-gray-600">Solo lectura usando datos actuales</p>
    </div>
    <app-ventas-animales-widget></app-ventas-animales-widget>
  </div>
  `
})
export class VentasAnimalesPage {}
