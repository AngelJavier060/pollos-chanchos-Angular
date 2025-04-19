import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AnimalService } from '../../services/animal.service';
import { Animal } from '../../interfaces/animal.interface';

@Component({
  selector: 'app-animal-config',
  templateUrl: './animal-config.component.html',
  styleUrls: ['./animal-config.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ]
})
export class AnimalConfigComponent implements OnInit {
  animals: Animal[] = [];
  loading = false;

  constructor(
    private animalService: AnimalService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAnimals();
  }

  loadAnimals(): void {
    this.loading = true;
    this.animalService.getAnimals().subscribe({
      next: (data) => {
        this.animals = data;
        this.loading = false;
      },
      error: (error) => {
        this.showMessage('Error al cargar los animales');
        this.loading = false;
      }
    });
  }

  onDelete(id: number): void {
    if (confirm('¿Está seguro de eliminar este animal?')) {
      this.loading = true;
      this.animalService.deleteAnimal(id).subscribe({
        next: () => {
          this.showMessage('Animal eliminado con éxito');
          this.loadAnimals();
        },
        error: (error) => {
          if (error.status === 400) {
            this.showMessage('No se puede eliminar el animal porque tiene razas asociadas');
          } else {
            this.showMessage('Error al eliminar el animal');
          }
          this.loading = false;
        }
      });
    }
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}