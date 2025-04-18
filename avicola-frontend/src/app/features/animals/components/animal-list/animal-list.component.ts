import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimalService } from '../../services/animal.service';
import { Animal } from '../../interfaces/animal';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-animal-list',
  standalone: false,
  templateUrl: './animal-list.component.html',
  styleUrls: ['./animal-list.component.scss']
})
export class AnimalListComponent implements OnInit {
  @Input() animalType: 'pollos' | 'chanchos' = 'pollos';
  animals: Animal[] = [];
  newAnimal: Animal = {
    id: 0,
    name: '',
    type: 'pollos',
    create_date: new Date(),
    update_date: new Date()
  };
  editingAnimal: Animal | null = null;

  constructor(private animalService: AnimalService) { }

  ngOnInit(): void {
    this.loadAnimals();
    this.newAnimal.type = this.animalType;
  }

  loadAnimals(): void {
    this.animalService.findAnimalsByType(this.animalType).subscribe({
      next: (data) => {
        this.animals = data;
      },
      error: (error) => {
        console.error(`Error al cargar ${this.animalType}:`, error);
      }
    });
  }

  saveAnimal(): void {
    if (this.newAnimal.name.trim()) {
      this.newAnimal.type = this.animalType;
      this.animalService.saveAnimal(this.newAnimal).subscribe({
        next: () => {
          this.loadAnimals();
          this.newAnimal.name = '';
        },
        error: (error) => {
          console.error(`Error al guardar ${this.animalType}:`, error);
        }
      });
    }
  }

  startEdit(animal: Animal): void {
    this.editingAnimal = { ...animal };
  }

  updateAnimal(): void {
    if (this.editingAnimal && this.editingAnimal.name.trim()) {
      this.editingAnimal.type = this.animalType;
      this.animalService.updateAnimal(this.editingAnimal).subscribe({
        next: () => {
          this.loadAnimals();
          this.editingAnimal = null;
        },
        error: (error) => {
          console.error(`Error al actualizar ${this.animalType}:`, error);
        }
      });
    }
  }

  deleteAnimal(id: number): void {
    if (confirm(`¿Está seguro de eliminar este ${this.animalType}?`)) {
      this.animalService.deleteAnimal(id).subscribe({
        next: () => {
          this.loadAnimals();
        },
        error: (error) => {
          console.error(`Error al eliminar ${this.animalType}:`, error);
        }
      });
    }
  }

  cancelEdit(): void {
    this.editingAnimal = null;
  }
}
