import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardD3Component } from './dashboard-d3.component';

@Component({
  selector: 'app-dashboard',
  template: '<app-dashboard-d3></app-dashboard-d3>',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardD3Component]
})
export class DashboardComponent implements OnInit {
  // Sin tabs por ahora: solo gráficas interactivas

  constructor() { }

  ngOnInit(): void {
    // Aquí podemos cargar datos iniciales del dashboard
  }
}