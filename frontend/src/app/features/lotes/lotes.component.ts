import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { LoteService } from './services/lote.service';
import { RaceService } from '../configuracion/services/race.service';
import { Lote } from './interfaces/lote.interface';
import { Race } from '../configuracion/interfaces/race.interface';
import { VentasService } from '../../shared/services/ventas.service';
import { MortalidadBackendService } from '../../shared/services/mortalidad-backend.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
  // Distribución por sexo (solo chanchos)
  showDistribucionChanchos: boolean = false;
  distribucionError: string = '';
  
  // Opciones de descripción según tipo de animal
  opcionesDescripcion: string[] = [];
  
  // Posición del formulario flotante
  tablePanelPosition = { x: 0, y: 0 };
  private isTableDragging = false;
  private tableDragStart = { x: 0, y: 0 };
  
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

  // Verificación por lote (vendidos y muertos)
  verificacionMap: Record<string, { vendidos: number; muertos: number }> = {};

  constructor(
    private fb: FormBuilder,
    private loteService: LoteService,
    private raceService: RaceService,
    private ventasService: VentasService,
    private mortalidadService: MortalidadBackendService
  ) {
    this.initForm();
  }

  // Métodos para arrastre del formulario flotante
  onTableDragStart(event: MouseEvent | TouchEvent): void {
    this.isTableDragging = true;
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    
    this.tableDragStart = {
      x: clientX - this.tablePanelPosition.x,
      y: clientY - this.tablePanelPosition.y
    };
    
    if (event instanceof TouchEvent) {
      event.preventDefault();
    }
  }
  
  onTableDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.isTableDragging) return;
    
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    
    this.tablePanelPosition = {
      x: clientX - this.tableDragStart.x,
      y: clientY - this.tableDragStart.y
    };
    
    if (event instanceof TouchEvent) {
      event.preventDefault();
    }
  }
  
  onTableDragEnd(event: MouseEvent | TouchEvent): void {
    this.isTableDragging = false;
  }
  
  // Validar distribución por sexo
  validarDistribucion(): void {
    if (!this.showDistribucionChanchos) { 
      this.distribucionError = ''; 
      return; 
    }
    
    const male = Number(this.loteForm.get('maleCount')?.value || 0);
    const female = Number(this.loteForm.get('femaleCount')?.value || 0);
    
    // Validar que no sean negativos
    if (male < 0 || female < 0) {
      this.distribucionError = 'Las cantidades no pueden ser negativas.';
    } else if (male === 0 && female === 0) {
      this.distribucionError = 'Debe ingresar al menos un macho o una hembra.';
    } else {
      this.distribucionError = '';
    }
  }

  // Actualizar opciones de descripción según el tipo de animal
  actualizarOpcionesDescripcion(animalName: string): void {
    const esPollo = animalName.includes('pollo') || animalName.includes('ave') || animalName.includes('gallina');
    const esChancho = animalName.includes('chancho') || animalName.includes('cerdo') || animalName.includes('porc');
    
    if (esPollo) {
      this.opcionesDescripcion = [
        'Compra de pollos vivos',
        'Se encubaron',
        'Sacó crías la gallina'
      ];
    } else if (esChancho) {
      this.opcionesDescripcion = [
        'Compra de chanchos',
        'Sacaron crías por parto'
      ];
    } else {
      // Opciones genéricas para otros animales
      this.opcionesDescripcion = [
        'Compra',
        'Reproducción propia'
      ];
    }
    
    // Limpiar el campo descripción cuando cambia el animal
    this.loteForm.patchValue({ descripcion: '' }, { emitEvent: false });
  }

  private initForm(): void {
    this.loteForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      quantity: ['', [Validators.required, Validators.min(1)]],
      birthdate: ['', [Validators.required]],
      cost: ['', [Validators.required, Validators.min(0)]],
      raceId: ['', [Validators.required]],
      // Campos opcionales para chanchos
      maleCount: [null],
      femaleCount: [null],
      malePurpose: [''],
      femalePurpose: ['']
    });
  }

  ngOnInit(): void {
    this.loadLotes();
    this.loadAndValidateRaces();
    // Cargar resumen inicial (general)
    this.loadResumen();

    // Event listeners para arrastre del formulario flotante
    document.addEventListener('mousemove', (e) => {
      this.onTableDragMove(e);
    });
    document.addEventListener('mouseup', (e) => {
      this.onTableDragEnd(e);
    });
    document.addEventListener('touchmove', (e) => {
      this.onTableDragMove(e);
    }, { passive: false });
    document.addEventListener('touchend', (e) => {
      this.onTableDragEnd(e);
    });

    // Reaccionar al cambio de raza para mostrar distribución cuando sea chanchos
    this.loteForm.get('raceId')?.valueChanges.subscribe((val) => {
      const raceId = Number(val);
      const r = this.races.find(x => x.id === raceId);
      const animalName = r?.animal?.name?.toLowerCase() || '';
      const esChancho = animalName.includes('chancho') || animalName.includes('cerdo') || animalName.includes('porc');
      this.showDistribucionChanchos = esChancho;
      
      // Actualizar opciones de descripción según el animal
      this.actualizarOpcionesDescripcion(animalName);
      
      // Habilitar/deshabilitar campo cantidad según si es chancho
      const quantityControl = this.loteForm.get('quantity');
      if (this.showDistribucionChanchos) {
        quantityControl?.disable({ emitEvent: false });
        quantityControl?.setValue(0, { emitEvent: false });
      } else {
        quantityControl?.enable({ emitEvent: false });
      }
      
      // Limpiar y validar
      if (!this.showDistribucionChanchos) {
        this.loteForm.patchValue({ maleCount: null, femaleCount: null, malePurpose: '', femalePurpose: '' }, { emitEvent: false });
        this.distribucionError = '';
      }
      this.validarDistribucion();
    });

    // Calcular cantidad automáticamente cuando cambian machos o hembras
    const calcularCantidadTotal = () => {
      if (this.showDistribucionChanchos) {
        const male = Number(this.loteForm.get('maleCount')?.value || 0);
        const female = Number(this.loteForm.get('femaleCount')?.value || 0);
        const total = male + female;
        this.loteForm.patchValue({ quantity: total }, { emitEvent: false });
        this.validarDistribucion();
      }
    };
    
    this.loteForm.get('maleCount')?.valueChanges.subscribe(() => calcularCantidadTotal());
    this.loteForm.get('femaleCount')?.valueChanges.subscribe(() => calcularCantidadTotal());
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
      // Seleccionar la primera raza y actualizar opciones
      const primeraRaza = this.races[0];
      this.loteForm.patchValue({
        raceId: primeraRaza.id
      });
      
      // Inicializar opciones de descripción
      const animalName = primeraRaza.animal?.name?.toLowerCase() || '';
      this.actualizarOpcionesDescripcion(animalName);
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
        // Reaplicar el filtro actual una vez que los lotes estén cargados
        this.filtrarPorTipoAnimal(this.filtroAnimalActual);
        this.cargarVerificaciones(this.lotesFiltrados);
        
        // Debug: verificar estructura de datos
        console.log('[LotesComponent] Lotes cargados:', this.lotes.length);
        console.log('[LotesComponent] Métricas Pollos:', this.getMetricasPollos());
        console.log('[LotesComponent] Métricas Chanchos:', this.getMetricasChanchos());
        if (this.lotes.length > 0) {
          console.log('[LotesComponent] Ejemplo de lote:', {
            name: this.lotes[0].name,
            quantity: this.lotes[0].quantity,
            race: this.lotes[0].race,
            animalName: this.lotes[0].race?.animal?.name
          });
        }
        
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

  private buildAnimalOptionsFromRaces(): void {
    // Construir opciones de animales desde las razas cargadas
    const animalsMap = new Map<string, { id: string; nombre: string; color: string }>();
    
    this.races.forEach(race => {
      if (race.animal?.id && race.animal?.name) {
        const animalId = race.animal.id.toString();
        if (!animalsMap.has(animalId)) {
          animalsMap.set(animalId, {
            id: animalId,
            nombre: race.animal.name,
            color: this.getColorForAnimal(race.animal.name)
          });
        }
      }
    });
    
    this.tiposAnimales = Array.from(animalsMap.values());
  }

  private getColorForAnimal(animalName: string): string {
    const name = animalName.toLowerCase();
    if (name.includes('pollo')) return '#f59e0b';
    if (name.includes('chancho') || name.includes('cerdo')) return '#ec4899';
    if (name.includes('pato')) return '#3b82f6';
    return '#6b7280';
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
    // Usar getRawValue() para obtener también los campos deshabilitados
    const loteData = this.loteForm.getRawValue();
    const raceId = Number(loteData.raceId);
    
    const selectedRace = this.races.find(race => race.id === raceId);
    if (!selectedRace) return;

    const loteToSave: Lote = {
      name: loteData.name.trim(),
      descripcion: (loteData.descripcion || '').toString().trim(),
      quantity: Number(loteData.quantity),
      birthdate: new Date(loteData.birthdate),
      cost: Number(loteData.cost),
      race: selectedRace,
      race_animal_id: selectedRace.animal.id
    };

    if (this.showDistribucionChanchos) {
      const male = Number(loteData.maleCount || 0);
      const female = Number(loteData.femaleCount || 0);
      loteToSave.maleCount = male;
      loteToSave.femaleCount = female;
      loteToSave.malePurpose = (loteData.malePurpose || '').toString();
      loteToSave.femalePurpose = (loteData.femalePurpose || '').toString();
    }

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
    // Actualizar opciones de descripción según el animal del lote
    const animalName = lote.race?.animal?.name?.toLowerCase() || '';
    this.actualizarOpcionesDescripcion(animalName);
    
    // Determinar si es chancho para habilitar/deshabilitar cantidad
    const esChancho = animalName.includes('chancho') || animalName.includes('cerdo') || animalName.includes('porc');
    this.showDistribucionChanchos = esChancho;
    
    this.loteForm.patchValue({
      name: lote.name,
      descripcion: (lote as any)?.descripcion || '',
      quantity: lote.quantity,
      birthdate: this.formatDate(lote.birthdate),
      cost: lote.cost,
      raceId: lote.race.id,
      // Campos de distribución por sexo para chanchos
      maleCount: lote.maleCount || null,
      femaleCount: lote.femaleCount || null,
      malePurpose: lote.malePurpose || '',
      femalePurpose: lote.femalePurpose || ''
    });
    
    // Habilitar/deshabilitar campo cantidad según si es chancho
    const quantityControl = this.loteForm.get('quantity');
    if (this.showDistribucionChanchos) {
      quantityControl?.disable({ emitEvent: false });
    } else {
      quantityControl?.enable({ emitEvent: false });
    }
    
    this.isEditing = true;
    this.currentLoteId = lote.id || null;
    this.showForm = true;
  }

  resetForm(): void {
    this.loteForm.reset();
    this.isEditing = false;
    this.currentLoteId = null;
    this.errorMessage = '';
    this.showDistribucionChanchos = false;
    this.distribucionError = '';
    this.opcionesDescripcion = [];
    
    // Habilitar el campo cantidad al resetear
    this.loteForm.get('quantity')?.enable({ emitEvent: false });
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
      const tipoLower = (tipo || '').toString().toLowerCase();
      const tipoAsNumber = Number(tipoLower);
      const esNumero = !isNaN(tipoAsNumber);

      if (esNumero) {
        this.lotesFiltrados = base.filter(lote => {
          const idAnimal = Number(lote.race?.animal?.id || 0);
          return idAnimal === tipoAsNumber;
        });
      } else {
        this.lotesFiltrados = base.filter(lote => {
          if (!lote.race?.animal?.name) return false;
          const animalName = (lote.race.animal.name || '').toLowerCase();
          return animalName.includes(tipoLower) || tipoLower.includes(animalName);
        });
      }
    }

    console.log(`Filtrado por "${tipo}": ${this.lotesFiltrados.length} de ${base.length} lotes`);
    this.cargarVerificaciones(this.lotesFiltrados);
  }

  // Cargar verificación (vendidos y muertos) por lote
  private cargarVerificaciones(lotes: Lote[]): void {
    const peticiones = (lotes || [])
      .filter(l => !!l.id)
      .map(l => {
        const loteId = l.id as string;
        const adquiridos = Number(l.quantityOriginal ?? l.quantity ?? 0);
        const ventas$ = this.ventasService.listarVentasAnimalesPorLoteEmitidas(loteId).pipe(
          map(list => Array.isArray(list) ? list.reduce((s, v: any) => s + Number(v?.cantidad ?? 0), 0) : 0),
          catchError(() => of(0))
        );
        const muertos$ = this.mortalidadService.contarMuertesPorLote(loteId).pipe(
          catchError(() => of(0))
        );
        return forkJoin({ loteId: of(loteId), vendidos: ventas$, muertos: muertos$, adquiridos: of(adquiridos), vivos: of(Number(l.quantity || 0)) });
      });

    if (!peticiones.length) {
      this.verificacionMap = {};
      return;
    }

    forkJoin(peticiones).subscribe(resultados => {
      const mapRes: Record<string, { vendidos: number; muertos: number }> = {};
      resultados.forEach((r: any) => {
        const adquiridos = Number(r.adquiridos || 0);
        const vivos = Number(r.vivos || 0);
        let vendidos = Math.max(0, Math.min(Number(r.vendidos || 0), adquiridos));
        const maxMuertosPorAdq = Math.max(0, adquiridos - vendidos);
        let muertosRaw = Math.max(0, Number(r.muertos || 0));
        let muertosCap = Math.min(muertosRaw, maxMuertosPorAdq);
        // Ajustar muertos para coherencia con vivos mostrados: adquiridos - vendidos - muertos == vivos
        const muertosNecesarios = Math.max(0, adquiridos - vendidos - vivos);
        muertosCap = Math.max(0, Math.min(muertosNecesarios, maxMuertosPorAdq));
        mapRes[r.loteId] = { vendidos, muertos: muertosCap };
      });
      this.verificacionMap = mapRes;
    });
  }

  getVerificacionTexto(lote: Lote): string {
    const key = lote.id || '';
    const v = this.verificacionMap[key];
    if (!v) return '-';
    const partes: string[] = [];
    if ((v.vendidos || 0) > 0) partes.push(`${v.vendidos} vendidos`);
    if ((v.muertos || 0) > 0) partes.push(`${v.muertos} muertos`);
    return partes.length ? partes.join(' y ') : 'Sin bajas';
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

  // Métodos para calcular métricas por tipo de animal (Pollos y Chanchos)
  getMetricasPollos(): { total: number; cantidad: number; inversion: number } {
    const lotesPollos = this.lotes.filter(lote => {
      const animalName = lote.race?.animal?.name?.toLowerCase() || '';
      return animalName.includes('pollo') || animalName.includes('ave') || animalName.includes('gallina');
    });
    
    return {
      total: lotesPollos.length,
      cantidad: lotesPollos.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
      inversion: lotesPollos.reduce((sum, l) => sum + (Number(l.cost) || 0), 0)
    };
  }

  getMetricasChanchos(): { total: number; cantidad: number; inversion: number } {
    const lotesChanchos = this.lotes.filter(lote => {
      const animalName = lote.race?.animal?.name?.toLowerCase() || '';
      return animalName.includes('chancho') || animalName.includes('cerdo') || animalName.includes('porc');
    });
    
    return {
      total: lotesChanchos.length,
      cantidad: lotesChanchos.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
      inversion: lotesChanchos.reduce((sum, l) => sum + (Number(l.cost) || 0), 0)
    };
  }

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