import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AnimalService } from '../../services/animal.service';
import { Animal } from '../../interfaces/animal.interface';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-animal-form',
  templateUrl: './animal-form.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule
  ]
})
export class AnimalFormComponent implements OnInit {
  animalForm: FormGroup;
  isEditing = false;
  animalId: number | null = null;
  loading = false;
  animals: Animal[] = [];
  nameExists = false;

  constructor(
    private fb: FormBuilder,
    private animalService: AnimalService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.animalForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit() {
    // Cargamos todos los animales para poder validar nombres duplicados
    this.loadAllAnimals();
    
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditing = true;
      this.animalId = parseInt(id, 10);
      this.loadAnimal(this.animalId);
    }
    
    // Añadimos un listener para validar el nombre en tiempo real
    this.animalForm.get('name')?.valueChanges.subscribe(name => {
      if (name) {
        this.checkDuplicateName(name);
      } else {
        this.nameExists = false;
      }
    });
  }
  
  loadAllAnimals() {
    this.loading = true;
    this.animalService.getAnimals().subscribe({
      next: (data) => {
        this.animals = data;
        this.loading = false;
        
        // Si estamos en modo edición, volvemos a verificar el nombre
        if (this.animalForm.get('name')?.value) {
          this.checkDuplicateName(this.animalForm.get('name')?.value);
        }
      },
      error: (error) => {
        this.showMessage('Error al cargar los datos');
        this.loading = false;
      }
    });
  }

  loadAnimal(id: number) {
    this.loading = true;
    this.animalService.getAnimals()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (animals) => {
          const animal = animals.find(a => a.id === id);
          if (animal) {
            this.animalForm.patchValue({
              name: animal.name
            });
          } else {
            this.showMessage('Animal no encontrado');
            this.router.navigate(['/admin/configuracion/animal-config']);
          }
        },
        error: (error) => {
          this.showMessage('Error al cargar el animal');
        }
      });
  }
  
  // Método para verificar si un nombre ya existe
  checkDuplicateName(name: string) {
    if (!name) return;
    
    name = name.trim().toLowerCase();
    
    // Si estamos editando, excluimos el animal actual de la verificación
    if (this.isEditing && this.animalId) {
      this.nameExists = this.animals.some(animal => 
        animal.id !== this.animalId && 
        animal.name.toLowerCase() === name
      );
    } else {
      // Para nuevo animal, verificamos si alguno coincide exactamente
      this.nameExists = this.animals.some(animal => 
        animal.name.toLowerCase() === name
      );
    }
  }

  onSubmit() {
    if (this.animalForm.invalid) {
      return;
    }
    
    const name = this.animalForm.get('name')?.value.trim();
    
    // Verificamos nuevamente por nombres duplicados antes de enviar
    this.checkDuplicateName(name);
    
    if (this.nameExists) {
      this.showMessage('Ya existe un animal con este nombre');
      return;
    }

    this.loading = true;
    const animalData: Animal = {
      name: name
    };

    if (this.isEditing && this.animalId) {
      animalData.id = this.animalId;
      this.animalService.updateAnimal(animalData)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            this.showMessage('Animal actualizado con éxito');
            this.router.navigate(['/admin/configuracion/animal-config']);
          },
          error: (error) => {
            this.showMessage('Error al actualizar el animal');
          }
        });
    } else {
      this.animalService.createAnimal(animalData)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            this.showMessage('Animal creado con éxito');
            this.router.navigate(['/admin/configuracion/animal-config']);
          },
          error: (error) => {
            this.showMessage('Error al crear el animal');
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