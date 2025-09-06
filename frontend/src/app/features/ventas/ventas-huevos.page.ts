import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VentasHuevosWidgetComponent } from '../dashboard/widgets/ventas-huevos-widget.component';

@Component({
  selector: 'app-ventas-huevos-page',
  standalone: true,
  imports: [CommonModule, RouterModule, VentasHuevosWidgetComponent],
  template: `
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold">Venta de Huevo (vista)</h1>
      <p class="text-gray-600">Solo lectura usando datos actuales</p>
    </div>
    <app-ventas-huevos-widget></app-ventas-huevos-widget>
  </div>
  `
})
export class VentasHuevosPage {}
