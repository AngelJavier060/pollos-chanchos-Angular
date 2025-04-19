import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RaceService } from '../../services/race.service';
import { AnimalService } from '../../services/animal.service';
import { Race } from '../../interfaces/race.interface';
import { Animal } from '../../interfaces/animal.interface';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-race',
  templateUrl: './race.component.html',
  styleUrls: ['./race.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule]
})
export class RaceComponent implements OnInit {
  raceForm: FormGroup;
  races: Race[] = [];
  animals: Animal[] = [];
  isEditing: boolean = false;
  currentRaceId: number | null = null;
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private raceService: RaceService,
    private animalService: AnimalService
  ) {
    this.raceForm = this.fb.group({
      name: ['', [Validators.required]],
      animalId: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadAnimals();
    this.loadRaces();
  }

  loadAnimals() {
    this.loading = true;
    this.animalService.getAnimals().subscribe({
      next: (data) => {
        this.animals = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar los animales', error);
        this.errorMessage = 'Error al cargar los animales. Por favor, inténtelo de nuevo.';
        this.loading = false;
      }
    });
  }

  loadRaces() {
    this.loading = true;
    this.raceService.getRaces().subscribe({
      next: (data) => {
        this.races = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar las razas', error);
        this.errorMessage = 'Error al cargar las razas. Por favor, inténtelo de nuevo.';
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.raceForm.valid) {
      this.loading = true;
      const raceData = this.raceForm.value;
      const animalId = Number(raceData.animalId);
      
      // Verificar si ya existe una raza con el mismo nombre
      const raceName = raceData.name.trim().toLowerCase();
      const raceExists = this.races.some(race => 
        race.name.toLowerCase() === raceName && 
        (this.isEditing ? race.id !== this.currentRaceId : true)
      );
      
      if (raceExists) {
        this.errorMessage = `Ya existe una raza con el nombre "${raceData.name}"`;
        this.loading = false;
        return;
      }
      
      // Encontrar el objeto animal correspondiente al ID
      const selectedAnimal = this.animals.find(animal => animal.id === animalId);
      
      if (selectedAnimal) {
        const raceToSave: Race = {
          name: raceData.name,
          animal: selectedAnimal
        };
        
        if (this.isEditing && this.currentRaceId !== null) {
          // Actualizar raza existente
          raceToSave.id = this.currentRaceId;
          this.updateRace(raceToSave);
        } else {
          // Crear nueva raza
          this.createRace(raceToSave);
        }
      }
    }
  }

  createRace(race: Race) {
    this.raceService.createRace(race).subscribe({
      next: (newRace) => {
        this.races.push(newRace);
        this.resetForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al crear la raza', error);
        this.errorMessage = 'Error al crear la raza. Por favor, inténtelo de nuevo.';
        this.loading = false;
      }
    });
  }

  updateRace(race: Race) {
    this.raceService.updateRace(race).subscribe({
      next: (updatedRace) => {
        const index = this.races.findIndex(r => r.id === updatedRace.id);
        if (index !== -1) {
          this.races[index] = updatedRace;
        }
        this.resetForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al actualizar la raza', error);
        this.errorMessage = 'Error al actualizar la raza. Por favor, inténtelo de nuevo.';
        this.loading = false;
      }
    });
  }

  editRace(race: Race) {
    this.raceForm.patchValue({
      name: race.name,
      animalId: race.animal.id
    });
    this.isEditing = true;
    this.currentRaceId = race.id !== undefined ? race.id : null;
  }

  deleteRace(id: number) {
    if (confirm('¿Está seguro que desea eliminar esta raza?')) {
      this.loading = true;
      this.raceService.deleteRace(id).subscribe({
        next: () => {
          this.races = this.races.filter(race => race.id !== id);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al eliminar la raza', error);
          this.errorMessage = 'Error al eliminar la raza. Por favor, inténtelo de nuevo.';
          this.loading = false;
        }
      });
    }
  }

  resetForm() {
    this.raceForm.reset();
    this.isEditing = false;
    this.currentRaceId = null;
    this.errorMessage = '';
  }
}