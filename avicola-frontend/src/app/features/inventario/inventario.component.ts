import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class InventarioComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    // Inicialización del componente
  }
}