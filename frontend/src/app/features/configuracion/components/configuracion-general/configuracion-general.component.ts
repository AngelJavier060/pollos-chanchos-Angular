import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';
import { HttpClient } from '@angular/common/http';

// Interfaces
import { Stage } from '../../interfaces/stage.interface';
import { Provider } from '../../interfaces/provider.interface';
import { TypeFood } from '../../interfaces/typefood.interface';
import { UnitMeasurement } from '../../interfaces/unit-measurement.interface';

// Servicios
import { StageService } from '../../services/stage.service';
import { ProviderService } from '../../services/provider.service';
import { TypeFoodService } from '../../services/typefood.service';
import { UnitMeasurementService } from '../../services/unit-measurement.service';

type EntityType = 'stage' | 'provider' | 'typefood' | 'unitmeasurement';

@Component({
  selector: 'app-configuracion-general',
  templateUrl: './configuracion-general.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule]
})
export class ConfiguracionGeneralComponent implements OnInit {
  
  // Tab activo
  activeTab: EntityType = 'stage';
  
  // Datos para cada tipo de entidad
  stages: Stage[] = [];
  providers: Provider[] = [];
  typefoods: TypeFood[] = [];
  unitmeasurements: UnitMeasurement[] = [];
  
  // Variables para gestionar el formulario y modal
  entityForm!: FormGroup;
  showModal = false;
  isEditing = false;
  loading = false;
  submitting = false;
  
  // ID de la entidad en edición
  currentEntityId: number | null = null;
  backendUrl = environment.apiUrl;
  backendConfig: any = null;
  backendConfigError: string = '';
  
  constructor(
    private fb: FormBuilder,
    private stageService: StageService,
    private providerService: ProviderService,
    private typeFoodService: TypeFoodService,
    private unitMeasurementService: UnitMeasurementService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadData(this.activeTab);
    this.loadBackendConfig();
  }

  // Inicialización del formulario según el tipo de entidad activa
  private initForm(): void {
    // Definir la configuración base del formulario
    const nameValidators = [Validators.required, Validators.minLength(2)];
    
    // Configurar el formulario según el tipo de entidad
    if (this.activeTab === 'unitmeasurement') {
      // Para unidades de medida, el campo name_short es obligatorio
      this.entityForm = this.fb.group({
        name: ['', nameValidators],
        description: [''],
        contact: [''],
        name_short: ['', Validators.required]
      });
    } else {
      // Para el resto de entidades, configuramos los campos necesarios
      this.entityForm = this.fb.group({
        name: ['', nameValidators],
        description: [''],
        contact: [''],
        name_short: [''] // Sin validación required
      });
    }
    
    console.log(`Formulario inicializado para: ${this.activeTab}`);
  }

  // Carga inicial de datos según el tipo de entidad
  loadData(entityType: EntityType): void {
    this.loading = true;
    console.log(`Intentando cargar datos para: ${entityType}`);
    
    switch (entityType) {
      case 'stage':
        this.stageService.getStages().subscribe({
          next: (data) => {
            console.log('Datos de etapas recibidos:', data);
            this.stages = data;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cargar etapas:', error);
            this.showMessage('Error al cargar las etapas');
            this.loading = false;
          }
        });
        break;
        
      case 'provider':
        this.providerService.getProviders().subscribe({
          next: (data) => {
            console.log('Datos de proveedores recibidos:', data);
            this.providers = data;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cargar proveedores:', error);
            this.showMessage('Error al cargar los proveedores');
            this.loading = false;
          }
        });
        break;
        
      case 'typefood':
        console.log('Solicitando tipos de alimento al servidor...');
        this.typeFoodService.getTypeFoods().subscribe({
          next: (data) => {
            console.log('Datos de tipos de alimento recibidos:', data);
            this.typefoods = data;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cargar tipos de alimento:', error);
            this.showMessage('Error al cargar los tipos de alimento');
            this.loading = false;
          }
        });
        break;
        
      case 'unitmeasurement':
        console.log('Solicitando unidades de medida al servidor...');
        this.unitMeasurementService.getUnitMeasurements().subscribe({
          next: (data) => {
            console.log('Datos de unidades de medida recibidos:', data);
            this.unitmeasurements = data;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cargar unidades de medida:', error);
            this.showMessage('Error al cargar las unidades de medida');
            this.loading = false;
          }
        });
        break;
    }
  }
  
  // Método para cambiar de tab y cargar los datos correspondientes
  cambiarTab(newTab: EntityType): void {
    console.log(`Cambiando a la pestaña: ${newTab}`);
    
    if (this.activeTab !== newTab) {
      this.activeTab = newTab;
      // Cargamos los datos específicos de esta pestaña
      this.loadData(newTab);
    }
  }
  
  // Abrir el formulario para crear o editar
  openForm(entityType: EntityType, entity: any = null): void {
    this.activeTab = entityType;
    this.isEditing = !!entity;
    this.currentEntityId = entity?.id || null;
    
    // Reinicializar el formulario con las validaciones específicas para este tipo de entidad
    this.initForm();
    
    if (entity) {
      // Si estamos editando, rellenamos el formulario con los datos de la entidad
      this.entityForm.patchValue({
        name: entity.name,
        description: entity.description || '',
        contact: entity.contact || '',
        name_short: entity.name_short || ''
      });
    }
    
    this.showModal = true;
  }
  
  // Guardar la entidad (crear o actualizar)
  saveItem(): void {
    if (this.entityForm.invalid) return;
    
    this.submitting = true;
    const formData = this.entityForm.value;
    
    switch (this.activeTab) {
      case 'stage':
        this.saveStage(formData);
        break;
      case 'provider':
        this.saveProvider(formData);
        break;
      case 'typefood':
        this.saveTypeFood(formData);
        break;
      case 'unitmeasurement':
        this.saveUnitMeasurement(formData);
        break;
    }
  }
  
  // Guardar etapa
  private saveStage(formData: any): void {
    const stage: Stage = {
      name: formData.name,
      description: formData.description
    };
    
    if (this.isEditing && this.currentEntityId) {
      stage.id = this.currentEntityId;
      
      this.stageService.updateStage(stage).subscribe({
        next: () => {
          this.showMessage('Etapa actualizada correctamente');
          this.closeModal();
          this.loadData('stage');
        },
        error: (error) => {
          this.showMessage('Error al actualizar la etapa');
          this.submitting = false;
        }
      });
    } else {
      this.stageService.createStage(stage).subscribe({
        next: () => {
          this.showMessage('Etapa creada correctamente');
          this.closeModal();
          this.loadData('stage');
        },
        error: (error) => {
          this.showMessage('Error al crear la etapa');
          this.submitting = false;
        }
      });
    }
  }
  
  // Guardar proveedor
  private saveProvider(formData: any): void {
    const provider: Provider = {
      name: formData.name,
      contact: formData.contact
    };
    
    if (this.isEditing && this.currentEntityId) {
      provider.id = this.currentEntityId;
      
      this.providerService.updateProvider(provider).subscribe({
        next: () => {
          this.showMessage('Proveedor actualizado correctamente');
          this.closeModal();
          this.loadData('provider');
        },
        error: (error) => {
          this.showMessage('Error al actualizar el proveedor');
          this.submitting = false;
        }
      });
    } else {
      this.providerService.createProvider(provider).subscribe({
        next: () => {
          this.showMessage('Proveedor creado correctamente');
          this.closeModal();
          this.loadData('provider');
        },
        error: (error) => {
          this.showMessage('Error al crear el proveedor');
          this.submitting = false;
        }
      });
    }
  }
  
  // Guardar tipo de alimento
  private saveTypeFood(formData: any): void {
    console.log('Intentando guardar tipo de alimento con datos:', formData);
    
    const typeFood: TypeFood = {
      name: formData.name
      // Nota: El backend no usa campo description para TypeFood
    };
    
    if (this.isEditing && this.currentEntityId) {
      typeFood.id = this.currentEntityId;
      console.log('Actualizando tipo de alimento:', typeFood);
      
      this.typeFoodService.updateTypeFood(typeFood).subscribe({
        next: (response) => {
          console.log('Tipo de alimento actualizado con éxito:', response);
          this.showMessage('Tipo de alimento actualizado correctamente');
          this.closeModal();
          this.loadData('typefood');
        },
        error: (error) => {
          console.error('Error al actualizar tipo de alimento:', error);
          
          // Mostrar mensaje específico del backend si está disponible
          const errorMessage = error.error && typeof error.error === 'string' 
            ? error.error 
            : 'Error al actualizar el tipo de alimento';
          
          this.showMessage(errorMessage);
          this.submitting = false;
        }
      });
    } else {
      console.log('Creando nuevo tipo de alimento:', typeFood);
      
      this.typeFoodService.createTypeFood(typeFood).subscribe({
        next: (response) => {
          console.log('Tipo de alimento creado con éxito:', response);
          this.showMessage('Tipo de alimento creado correctamente');
          this.closeModal();
          this.loadData('typefood');
        },
        error: (error) => {
          console.error('Error al crear tipo de alimento:', error);
          
          // Mostrar mensaje específico del backend si está disponible
          const errorMessage = error.error && typeof error.error === 'string' 
            ? error.error 
            : 'Error al crear el tipo de alimento';
          
          this.showMessage(errorMessage);
          this.submitting = false;
        }
      });
    }
  }
  
  // Guardar unidad de medida
  private saveUnitMeasurement(formData: any): void {
    const unitMeasurement: UnitMeasurement = {
      name: formData.name,
      name_short: formData.name_short
    };
    
    if (this.isEditing && this.currentEntityId) {
      unitMeasurement.id = this.currentEntityId;
      
      this.unitMeasurementService.updateUnitMeasurement(unitMeasurement).subscribe({
        next: () => {
          this.showMessage('Unidad de medida actualizada correctamente');
          this.closeModal();
          this.loadData('unitmeasurement');
        },
        error: (error) => {
          this.showMessage('Error al actualizar la unidad de medida');
          this.submitting = false;
        }
      });
    } else {
      this.unitMeasurementService.createUnitMeasurement(unitMeasurement).subscribe({
        next: () => {
          this.showMessage('Unidad de medida creada correctamente');
          this.closeModal();
          this.loadData('unitmeasurement');
        },
        error: (error) => {
          this.showMessage('Error al crear la unidad de medida');
          this.submitting = false;
        }
      });
    }
  }
  
  // Editar una entidad
  editItem(entityType: EntityType, entity: any): void {
    this.openForm(entityType, entity);
  }
  
  // Eliminar una entidad
  deleteItem(entityType: EntityType, id: number | undefined): void {
    if (id === undefined) {
      this.showMessage('Error: ID no válido');
      return;
    }
    
    if (!confirm('¿Está seguro de eliminar este registro?')) return;
    
    this.loading = true;
    
    switch (entityType) {
      case 'stage':
        this.stageService.deleteStage(id).subscribe({
          next: () => {
            this.showMessage('Etapa eliminada correctamente');
            this.loadData('stage');
          },
          error: (error) => {
            this.showMessage('Error al eliminar la etapa');
            this.loading = false;
          }
        });
        break;
        
      case 'provider':
        this.providerService.deleteProvider(id).subscribe({
          next: () => {
            this.showMessage('Proveedor eliminado correctamente');
            this.loadData('provider');
          },
          error: (error) => {
            this.showMessage('Error al eliminar el proveedor');
            this.loading = false;
          }
        });
        break;
        
      case 'typefood':
        this.typeFoodService.deleteTypeFood(id).subscribe({
          next: () => {
            this.showMessage('Tipo de alimento eliminado correctamente');
            this.loadData('typefood');
          },
          error: (error) => {
            this.showMessage('Error al eliminar el tipo de alimento');
            this.loading = false;
          }
        });
        break;
        
      case 'unitmeasurement':
        this.unitMeasurementService.deleteUnitMeasurement(id).subscribe({
          next: () => {
            this.showMessage('Unidad de medida eliminada correctamente');
            this.loadData('unitmeasurement');
          },
          error: (error) => {
            this.showMessage('Error al eliminar la unidad de medida');
            this.loading = false;
          }
        });
        break;
    }
  }
  
  // Cerrar el modal
  closeModal(): void {
    this.showModal = false;
    this.submitting = false;
    this.currentEntityId = null;
    this.isEditing = false;
  }
  
  // Mostrar mensaje
  private showMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
  
  // Obtener el título de la entidad según el tipo
  getEntityTitle(): string {
    switch (this.activeTab) {
      case 'stage': return 'Etapa';
      case 'provider': return 'Proveedor';
      case 'typefood': return 'Tipo de Alimento';
      case 'unitmeasurement': return 'Unidad de Medida';
      default: return '';
    }
  }

  loadBackendConfig(): void {
  this.http.get(`${this.backendUrl}/api/config`).subscribe({
      next: (data) => {
        this.backendConfig = data;
        this.backendConfigError = '';
      },
      error: (err) => {
        this.backendConfigError = 'No se pudo obtener la configuración del backend';
        this.backendConfig = null;
      }
    });
  }
}