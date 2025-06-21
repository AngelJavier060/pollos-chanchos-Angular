import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class ReportesComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    // Inicialización del componente
  }
}