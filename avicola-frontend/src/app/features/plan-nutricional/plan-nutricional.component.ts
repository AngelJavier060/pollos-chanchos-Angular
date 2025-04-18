import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-plan-nutricional',
  templateUrl: './plan-nutricional.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class PlanNutricionalComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    // Inicialización del componente
  }
}