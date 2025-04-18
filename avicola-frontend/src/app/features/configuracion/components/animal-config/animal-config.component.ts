import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Animal {
  id?: number;
  name: string;
  createdAt: Date;
}

@Component({
  selector: 'app-animal-config',
  templateUrl: './animal-config.component.html',
  styleUrls: ['./animal-config.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe]
})
export class AnimalConfigComponent implements OnInit {
  animals: Animal[] = [];
  newAnimal: Animal = { name: '', createdAt: new Date() };
  selectedAnimal: Animal | null = null;
  isEditing = false;

  constructor(private datePipe: DatePipe) {}

  ngOnInit(): void {
    // Aquí cargarías los animales desde un servicio
  }

  onSubmit() {
    if (this.isEditing && this.selectedAnimal) {
      const index = this.animals.findIndex(a => a.id === this.selectedAnimal!.id);
      if (index !== -1) {
        this.animals[index] = { ...this.selectedAnimal };
      }
    } else {
      this.animals.push({ ...this.newAnimal, id: this.animals.length + 1 });
      this.newAnimal = { name: '', createdAt: new Date() };
    }
  }

  editAnimal(animal: Animal) {
    this.selectedAnimal = { ...animal };
    this.isEditing = true;
  }

  cancelEdit() {
    this.selectedAnimal = null;
    this.isEditing = false;
  }

  deleteAnimal(id: number) {
    this.animals = this.animals.filter(a => a.id !== id);
  }

  formatDate(date: Date): string {
    return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || '';
  }
}