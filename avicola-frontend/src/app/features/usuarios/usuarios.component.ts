import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class UsuariosComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    // Inicialización del componente
  }
}