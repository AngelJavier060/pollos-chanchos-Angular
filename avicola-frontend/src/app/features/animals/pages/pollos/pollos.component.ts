import { Component, OnInit } from '@angular/core';
import { AnimalService } from '../../services/animal.service';

@Component({
  selector: 'app-pollos',
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Gestión de Pollos</h1>
      <app-animal-list [animalType]="'pollos'"></app-animal-list>
    </div>
  `
})
export class PollosComponent implements OnInit {
  constructor(private animalService: AnimalService) {}

  ngOnInit() {
    // Inicialización específica para pollos
  }
}