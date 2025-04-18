import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-lotes',
  templateUrl: './lotes.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class LotesComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    // Inicialización del componente
  }
}