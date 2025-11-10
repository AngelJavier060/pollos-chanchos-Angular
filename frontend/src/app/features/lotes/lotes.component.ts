import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { LoteService } from './services/lote.service';
import { RaceService } from '../configuracion/services/race.service';
import { Lote } from './interfaces/lote.interface';
import { Race } from '../configuracion/interfaces/race.interface';

@Component({
  selector: 'app-lotes',
  templateUrl: './lotes.component.html',
  styleUrls: ['./lotes.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, HttpClientModule]
})
export class LotesComponent implements OnInit {
  lotes: Lote[] = [];
  lotesFiltrados: Lote[] = [];
  races: Race[] = [];
  loteForm!: FormGroup;
  isEditing: boolean = false;
  currentLoteId: string | null = null;
  loading: boolean = false;
  errorMessage: string = '';
  showForm: boolean = false;
  
  // Tabs
  activeTab: 'activos' | 'historico' = 'activos';
  
  // Filtro por tipo de animal
  filtroAnimalActual: string = 'all';
  
  // Array de tipos de animales disponibles (se llenará dinámicamente)
  tiposAnimales: { id: string; nombre: string; color: string }[] = [];
  
  // Métricas por tipo de animal (dinámicas)
  metricasPorAnimal: Map<string, { 
    total: number; 
    cantidad: number; 
    inversion: number;
    color: string;
  }> = new Map();

  // Opciones de especies (para resumen e histórico)
  animalOptions: { id: number; name: string }[] = [];
  selectedAnimalId: number | null = null;

  // Resumen por especie/general
  resumen: { animalesAdquiridos: number; animalesActuales: number } | null = null;
  loadingResumen = false;

  // Histórico por fechas
  fechaDesde: string | null = null; // formato yyyy-MM-dd
  fechaHasta: string | null = null; // formato yyyy-MM-dd
  historicoFechas: Lote[] = [];
  loadingHistorico = false;

  constructor(
    private fb: FormBuilder,
    private loteService: LoteService,
    private raceService: RaceService
  ) {
    this.initForm();
  }

  // Construir lista de especies únicas a partir de races
  private buildAnimalOptionsFromRaces(): void {
    const map = new Map<number, string>();
    this.races.forEach(r => {
      if (r.animal?.id && r.animal.name) {
        map.set(r.animal.id, r.animal.name);
      }
    });
    this.animalOptions = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  private initForm(): void {
    this.loteForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      quantity: ['', [Validators.required, Validators.min(1)]],
      birthdate: ['', [Validators.required]],
      cost: ['', [Validators.required, Validators.min(0)]],
      raceId: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadLotes();
    this.loadAndValidateRaces();
    // Cargar resumen inicial (general)
    this.loadResumen();
  }

  // Cambio de pestaña con carga automática
  setTab(tab: 'activos' | 'historico'): void {
    this.activeTab = tab;
    if (tab === 'activos') {
      this.loadLotes();
    } else {
      // Al entrar al histórico, limpiar fechas para listar TODOS los lotes cerrados
      this.fechaDesde = null;
      this.fechaHasta = null;
      this.buscarHistorico();
    }
  }

  toggleForm(): void {
    if (this.races.length === 0) {
      this.errorMessage = 'No hay razas disponibles. Por favor, cree una raza primero.';
      return;
    }
    
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    } else {
      this.loteForm.patchValue({
        raceId: this.races[0].id
      });
    }
  }

  getTotalAnimales(): number {
    return this.lotes.reduce((total, lote) => total + (lote.quantity || 0), 0);
  }

  getTotalInversion(): number {
    return this.lotes.reduce((total, lote) => total + (lote.cost || 0), 0);
  }

  loadLotes(): void {
    this.loading = true;
    this.loteService.getActivos().subscribe({
      next: (data) => {
        this.lotes = data || [];
        this.lotesFiltrados = this.lotes; // ya vienen solo activos desde backend
        this.identificarTiposAnimales(); // Identificar tipos de animales disponibles
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar los lotes', error);
        this.errorMessage = error.message || 'Error al cargar los lotes';
        this.loading = false;
      }
    });
  }

  loadAndValidateRaces(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.raceService.getRaces().subscribe({
      next: (data) => {
        this.races = data;
        this.validateRacesData();
        this.buildAnimalOptionsFromRaces();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar las razas', error);
        this.errorMessage = error.message || 'Error al cargar las razas';
        this.loading = false;
      }
    });
  }

  private validateRacesData(): void {
    if (this.races.length === 0) {
      this.errorMessage = 'No hay razas disponibles. Por favor, cree una raza primero.';
      return;
    }

    const invalidRaces = this.races.filter(race => !race.animal?.id);
    if (invalidRaces.length > 0) {
      console.warn('Razas sin animal asociado:', invalidRaces);
      this.errorMessage = 'Algunas razas no tienen un animal asociado correctamente';
    }
  }

  checkDuplicateNameAndSubmit(): void {
    if (this.loteForm.valid) {
      this.loading = true;
      const loteData = this.loteForm.value;
      const raceId = Number(loteData.raceId);

      const selectedRace = this.races.find(race => race.id === raceId);
      if (!selectedRace) {
        this.errorMessage = 'La raza seleccionada no existe';
        this.loading = false;
        return;
      }

      if (!selectedRace.animal?.id) {
        this.errorMessage = 'La raza seleccionada no tiene un animal asociado';
        this.loading = false;
        return;
      }

      const animalId = selectedRace.animal.id;
      const loteName = loteData.name.trim();

      // Verificar si ya existe un lote con el mismo nombre para este tipo de animal
      this.loteService.checkDuplicateLoteName(loteName, animalId).subscribe({
        next: (exists) => {
          if (exists && (!this.isEditing || this.currentLoteId === null)) {
            // Si es un lote nuevo y ya existe otro con ese nombre para este animal
            this.errorMessage = `¡Error! Ya existe un lote con el nombre "${loteName}" para ${selectedRace.animal.name}`;
            this.loading = false;
          } else if (exists && this.isEditing) {
            // Si estamos editando y el nombre ya lo usa otro lote diferente del mismo animal
            // Aquí habría que verificar que no sea el mismo lote, pero lo manejaremos desde el backend
            this.submitForm();
          } else {
            // Si no hay duplicados, procedemos a guardar
            this.submitForm();
          }
        },
        error: (error) => {
          console.error('Error al verificar duplicados:', error);
          this.errorMessage = 'Error al verificar si el nombre del lote ya existe. Intente nuevamente.';
          this.loading = false;
        }
      });
    } else {
      this.showFormErrors();
    }
  }

  private submitForm(): void {
    const loteData = this.loteForm.value;
    const raceId = Number(loteData.raceId);
    
    const selectedRace = this.races.find(race => race.id === raceId);
    if (!selectedRace) return;

    const loteToSave: Lote = {
      name: loteData.name.trim(),
      quantity: Number(loteData.quantity),
      birthdate: new Date(loteData.birthdate),
      cost: Number(loteData.cost),
      race: selectedRace,
      race_animal_id: selectedRace.animal.id
    };

    if (this.isEditing && this.currentLoteId) {
      loteToSave.id = this.currentLoteId;
      this.updateLote(loteToSave);
    } else {
      this.createLote(raceId, loteToSave);
    }
  }

  onSubmit(): void {
    this.checkDuplicateNameAndSubmit();
  }

  // ====== Resumen ======
  changeAnimalResumen(id: string): void {
    this.selectedAnimalId = id ? Number(id) : null;
    this.loadResumen();
    if (this.activeTab === 'historico') {
      this.buscarHistorico();
    }
  }

  loadResumen(): void {
    this.loadingResumen = true;
    this.loteService.getResumen(this.selectedAnimalId ?? undefined).subscribe({
      next: (res) => {
        this.resumen = {
          animalesAdquiridos: Number(res?.animalesAdquiridos ?? 0),
          animalesActuales: Number(res?.animalesActuales ?? 0)
        };
        this.loadingResumen = false;
      },
      error: (err) => {
        console.error('Error al cargar resumen', err);
        this.loadingResumen = false;
      }
    });
  }

  // ====== Histórico por fechas ======
  buscarHistorico(): void {
    this.loadingHistorico = true;
    const animalId = this.selectedAnimalId ?? undefined;
    const tieneRango = !!(this.fechaDesde || this.fechaHasta);
    const obs = tieneRango
      ? this.loteService.getHistoricoPorFechas({
          desde: this.fechaDesde || undefined,
          hasta: this.fechaHasta || undefined,
          animalId
        })
      : this.loteService.getHistorico(animalId);
    obs.subscribe({
      next: (lotes) => {
        this.historicoFechas = lotes;
        this.loadingHistorico = false;
      },
      error: (err) => {
        console.error('Error al cargar histórico', err);
        this.loadingHistorico = false;
      }
    });
  }

  private createLote(raceId: number, lote: Lote): void {
    // Al crear un lote nuevo, establecer quantityOriginal igual a quantity
    lote.quantityOriginal = lote.quantity;
    
    this.loteService.createLote(raceId, lote).subscribe({
      next: (newLote) => {
        console.log('Lote creado exitosamente:', newLote);
        this.lotes.push(newLote);
        this.resetForm();
        this.loading = false;
        this.showForm = false;
        this.loadLotes(); // Recargar para actualizar la vista
      },
      error: (error) => {
        console.error('Error al crear el lote:', error);
        this.errorMessage = error.message;
        this.loading = false;
      }
    });
  }

  private updateLote(lote: Lote): void {
    this.loading = true;
    
    this.loteService.updateLote(lote).subscribe({
      next: () => {
        this.loadLotes();
        this.resetForm();
        this.loading = false;
        this.showForm = false;
      },
      error: (error) => {
        console.error('Error updating lote:', error);
        this.errorMessage = 'Error al actualizar el lote';
        this.loading = false;
      }
    });
  }

  editLote(lote: Lote): void {
    this.loteForm.patchValue({
      name: lote.name,
      descripcion: (lote as any)?.descripcion || '',
      quantity: lote.quantity,
      birthdate: this.formatDate(lote.birthdate),
      cost: lote.cost,
      raceId: lote.race.id
    });
    this.isEditing = true;
    this.currentLoteId = lote.id || null;
    this.showForm = true;
  }

  resetForm(): void {
    this.loteForm.reset();
    this.isEditing = false;
    this.currentLoteId = null;
    this.errorMessage = '';
  }

  private showFormErrors(): void {
    this.errorMessage = 'Por favor, complete todos los campos requeridos correctamente';
    Object.keys(this.loteForm.controls).forEach(key => {
      const control = this.loteForm.get(key);
      if (control?.invalid) {
        control.markAsTouched();
      }
    });
  }

  private formatDate(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  // Método para aplicar filtro por tipo de animal
  filtrarPorTipoAnimal(tipo: string): void {
    this.filtroAnimalActual = tipo;
    const base = this.lotes.filter(l => (Number(l.quantity) || 0) > 0);
    if (tipo === 'all') {
      this.lotesFiltrados = base;
    } else {
      this.lotesFiltrados = base.filter(lote => 
        lote.race?.animal?.name?.toLowerCase() === tipo.toLowerCase()
      );
    }
  }
  
  // Método para identificar todos los tipos de animales en los lotes
  identificarTiposAnimales(): void {
    // Colores para asignar a cada tipo de animal
    const colores = [
      'blue', 'pink', 'yellow', 'green', 'purple', 
      'orange', 'teal', 'indigo', 'red', 'lime'
    ];
    
    // Mapa para llevar registro de animales únicos
    const animalesUnicos = new Map<string, number>();
    let colorIndex = 0;
    
    // Identificar tipos únicos de animales
    this.lotes.forEach(lote => {
      if (lote.race?.animal?.name) {
        const nombreAnimal = lote.race.animal.name.toLowerCase();
        if (!animalesUnicos.has(nombreAnimal)) {
          animalesUnicos.set(nombreAnimal, colorIndex);
          colorIndex = (colorIndex + 1) % colores.length;
        }
      }
    });
    
    // Limpiar arrays antiguos
    this.tiposAnimales = [];
    this.metricasPorAnimal.clear();
    
    // Llenar el array de tipos de animales
    animalesUnicos.forEach((colorIdx, nombre) => {
      this.tiposAnimales.push({
        id: nombre,
        nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
        color: colores[colorIdx]
      });
      
      // Inicializar métricas para este tipo de animal
      this.metricasPorAnimal.set(nombre, {
        total: 0,
        cantidad: 0,
        inversion: 0,
        color: colores[colorIdx]
      });
    });
    
    // Calcular métricas para cada tipo
    this.calcularMetricasPorTipo();
  }
  
  // Método para calcular métricas por tipo de animal de forma dinámica
  calcularMetricasPorTipo(): void {
    // Reiniciar contadores
    this.metricasPorAnimal.forEach(metricas => {
      metricas.total = 0;
      metricas.cantidad = 0;
      metricas.inversion = 0;
    });
    
    // Acumular datos por cada tipo de animal
    this.lotes.forEach(lote => {
      if (lote.race?.animal?.name) {
        const nombreAnimal = lote.race.animal.name.toLowerCase();
        const metricas = this.metricasPorAnimal.get(nombreAnimal);
        
        if (metricas) {
          metricas.total += 1;
          metricas.cantidad += Number(lote.quantity) || 0;
          metricas.inversion += Number(lote.cost) || 0;
        }
      }
    });
  }

  // Métodos auxiliares eliminados - ya están definidos arriba

  deleteLote(id: string): void {
    if (confirm('¿Está seguro de que desea eliminar este lote?')) {
      this.loteService.deleteLote(id).subscribe({
        next: () => {
          this.loadLotes();
        },
        error: (error) => {
          console.error('Error al eliminar lote:', error);
          this.errorMessage = 'Error al eliminar el lote';
        }
      });
    }
  }
}