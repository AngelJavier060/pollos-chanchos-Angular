import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PlanAlimentacionService, PlanAlimentacion, PlanDetalle, PlanAsignacion } from './services/plan-alimentacion.service';
import { AnimalService } from '../configuracion/services/animal.service';
import { Animal } from '../configuracion/interfaces/animal.interface';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-plan-nutricional',
  templateUrl: './plan-nutricional.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule]
})
export class PlanNutricionalComponent implements OnInit {
  
  // Estados de la interfaz
  activeTab: 'planes' | 'asignaciones' | 'ejecucion' = 'planes';
  showPlanForm = false;
  showDetalleForm = false;
  showAsignacionForm = false;
  editingPlan: PlanAlimentacion | null = null;
  editingDetalle: PlanDetalle | null = null;
  selectedPlan: PlanAlimentacion | null = null;
  
  // Formularios
  planForm: FormGroup;
  detalleForm: FormGroup;
  asignacionForm: FormGroup;
  
  // Datos
  planes: PlanAlimentacion[] = [];
  asignaciones: PlanAsignacion[] = [];
  animales: Animal[] = [];
  productos: any[] = [];
  lotes: any[] = [];
  usuarios: any[] = [];
  
  // Loading states
  loading = false;
  loadingPlanes = false;
  loadingAsignaciones = false;
  
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private planService: PlanAlimentacionService,
    private animalService: AnimalService,
    private authService: AuthDirectService
  ) {
    this.initForms();
  }
  
  ngOnInit(): void {
    console.log('=== PLAN NUTRICIONAL COMPONENT INIT ===');
    this.testDirectHttpCall();
    this.checkAuthentication();
    this.loadInitialData();
  }
  
  private checkAuthentication(): void {
    const isAuthenticated = this.authService.isAuthenticated();
    const currentUser = this.authService.currentUserValue;
    const token = this.authService.getToken();
    
    console.log('=== DEBUG AUTENTICACIÓN ===');
    console.log('¿Está autenticado?:', isAuthenticated);
    console.log('Usuario actual:', currentUser);
    console.log('Token presente:', !!token);
    console.log('Token (primeros 50 chars):', token?.substring(0, 50) + '...');
    console.log('¿Es admin?:', this.authService.isAdmin());
    console.log('Roles del usuario:', currentUser?.roles);
    
    if (!isAuthenticated) {
      console.error('Usuario no autenticado. Redirigiendo al login...');
      this.authService.logout();
      return;
    }
    
    // Comentamos temporalmente la verificación de admin para debuggear
    // if (!this.authService.isAdmin()) {
    //   console.warn('Usuario no tiene permisos de administrador');
    //   alert('No tienes permisos de administrador para crear planes de alimentación');
    // }
  }
  
  private initForms(): void {
    this.planForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      animalId: ['', Validators.required]
    });
    
    this.detalleForm = this.fb.group({
      dayStart: ['', [Validators.required, Validators.min(1)]],
      dayEnd: ['', [Validators.required, Validators.min(1)]],
      productId: ['', Validators.required],
      quantityPerAnimal: ['', [Validators.required, Validators.min(0.1)]],
      frequency: ['DIARIA', Validators.required],
      instructions: ['']
    });
    
    this.asignacionForm = this.fb.group({
      planId: ['', Validators.required],
      loteId: ['', Validators.required],
      userId: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['']
    });
  }
  
  private loadInitialData(): void {
    console.log('=== DEBUG LOAD INITIAL DATA ===');
    console.log('Iniciando carga de datos iniciales...');
    this.loadPlanes();
    this.loadAnimales();
    // TODO: Cargar datos de productos, lotes, usuarios
  }
  
  // ========== MÉTODOS PARA PLANES ==========
  
  loadPlanes(): void {
    console.log('=== DEBUG CARGAR PLANES ===');
    console.log('Iniciando carga de planes...');
    console.log('Estado inicial - loadingPlanes:', this.loadingPlanes);
    console.log('Estado inicial - planes.length:', this.planes.length);
    
    this.loadingPlanes = true;
    console.log('Loading establecido a true');
    
    console.log('Llamando al servicio getAllPlanesIncludingInactive()...');
    const subscription = this.planService.getAllPlanesIncludingInactive();
    console.log('Observable creado:', subscription);
    
    subscription.subscribe({
      next: (planes) => {
        console.log('✅ CALLBACK NEXT ejecutado');
        console.log('Planes recibidos del backend:', planes);
        console.log('Tipo de planes:', typeof planes);
        console.log('Es array?:', Array.isArray(planes));
        console.log('Cantidad de planes:', planes?.length || 0);
        console.log('Estructura del primer plan:', planes?.[0]);
        
        this.planes = planes || [];
        console.log('Planes asignados al componente. Nuevo length:', this.planes.length);
        
        this.loadingPlanes = false;
        console.log('Loading establecido a false');
        console.log('Estado final del componente - planes:', this.planes);
      },
      error: (error) => {
        console.error('❌ CALLBACK ERROR ejecutado');
        console.error('Error al cargar planes:', error);
        console.error('Status del error:', error.status);
        console.error('Mensaje del error:', error.message);
        console.error('Error completo:', error);
        
        this.loadingPlanes = false;
        this.planes = []; // Asegurar que esté vacío en caso de error
        console.log('Loading establecido a false por error');
      },
      complete: () => {
        console.log('🏁 CALLBACK COMPLETE ejecutado');
        console.log('Suscripción completada exitosamente');
      }
    });
    
    console.log('Suscripción iniciada');
  }
  
  showCreatePlanForm(): void {
    this.editingPlan = null;
    this.planForm.reset();
    this.showPlanForm = true;
  }
  
  editPlan(plan: PlanAlimentacion): void {
    this.editingPlan = plan;
    this.planForm.patchValue({
      name: plan.name,
      description: plan.description,
      animalId: plan.animalId || plan.animal?.id
    });
    this.showPlanForm = true;
  }
  
  savePlan(): void {
    if (this.planForm.valid) {
      // Verificar autenticación antes de guardar
      const isAuthenticated = this.authService.isAuthenticated();
      const token = this.authService.getToken();
      const isAdmin = this.authService.isAdmin();
      
      console.log('=== DEBUG GUARDAR PLAN ===');
      console.log('¿Está autenticado?:', isAuthenticated);
      console.log('¿Tiene token?:', !!token);
      console.log('¿Es admin?:', isAdmin);
      
      if (!isAuthenticated) {
        console.error('Usuario no autenticado al intentar guardar plan');
        alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
        this.authService.logout();
        return;
      }
      
      // Comentamos temporalmente la verificación de admin para debuggear
      // if (!isAdmin) {
      //   console.error('Usuario no tiene permisos de administrador');
      //   alert('No tienes permisos de administrador para crear planes de alimentación');
      //   return;
      // }
      
      this.loading = true;
      const formData = this.planForm.value;
      
      const planData: PlanAlimentacion = {
        name: formData.name,
        description: formData.description,
        animal: {
          id: formData.animalId,
          name: this.animales.find(a => a.id === formData.animalId)?.name || ''
        }
      };
      
      console.log('Datos del plan a enviar:', planData);
      
      const request = this.editingPlan
        ? this.planService.updatePlan(this.editingPlan.id!, planData)
        : this.planService.createPlan(planData);
      
      console.log('Operación:', this.editingPlan ? 'ACTUALIZAR' : 'CREAR');
      if (this.editingPlan) {
        console.log('ID del plan a actualizar:', this.editingPlan.id);
      }
      
      request.subscribe({
        next: (response) => {
          console.log('Plan guardado exitosamente');
          console.log('Respuesta del servidor:', response);
          alert(this.editingPlan ? 'Plan actualizado exitosamente' : 'Plan creado exitosamente');
          this.loadPlanes();
          this.closePlanForm();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al guardar plan:', error);
          console.error('Status:', error.status);
          console.error('Message:', error.message);
          console.error('Error completo:', error);
          
          if (error.status === 401) {
            alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
            this.authService.logout();
          } else if (error.status === 403) {
            alert('No tienes permisos para realizar esta acción.');
          } else {
            alert('Error al guardar el plan. Verifique los datos e intente nuevamente.');
          }
          this.loading = false;
        }
      });
    }
  }
  
  deletePlan(plan: PlanAlimentacion): void {
    if (confirm(`¿Está seguro de ELIMINAR PERMANENTEMENTE el plan "${plan.name}"? Esta acción no se puede deshacer.`)) {
      console.log('=== DEBUG ELIMINAR PLAN PERMANENTEMENTE ===');
      console.log('Plan a eliminar:', plan);
      console.log('ID del plan:', plan.id);
      console.log('¿Está autenticado?:', this.authService.isAuthenticated());
      console.log('¿Es admin?:', this.authService.isAdmin());
      
      // Usar eliminación permanente para debugging
      this.planService.hardDeletePlan(plan.id!).subscribe({
        next: () => {
          console.log('✅ Plan eliminado permanentemente');
          // Actualizar la lista inmediatamente removiendo el plan eliminado
          this.planes = this.planes.filter(p => p.id !== plan.id);
          alert('Plan eliminado permanentemente de la base de datos');
          // También recargar para asegurar sincronización con el backend
          setTimeout(() => {
            this.loadPlanes();
          }, 1000);
        },
        error: (error) => {
          console.error('❌ Error al eliminar plan permanentemente:', error);
          console.error('Status:', error.status);
          console.error('Message:', error.message);
          console.error('Error completo:', error);
          
          if (error.status === 401) {
            alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
            this.authService.logout();
          } else if (error.status === 403) {
            alert('No tienes permisos para eliminar este plan.');
          } else {
            alert('Error al eliminar el plan. Por favor, intenta nuevamente.');
            // Si el backend respondió con éxito pero el frontend muestra error, 
            // recargar la lista para verificar el estado real
            this.loadPlanes();
          }
        }
      });
    }
  }
  
  closePlanForm(): void {
    this.showPlanForm = false;
    this.editingPlan = null;
    this.planForm.reset();
  }
  
  // ========== MÉTODOS DE NAVEGACIÓN ==========
  
  setActiveTab(tab: 'planes' | 'asignaciones' | 'ejecucion'): void {
    this.activeTab = tab;
    
    if (tab === 'asignaciones') {
      this.loadAsignaciones();
    }
  }
  
  loadAsignaciones(): void {
    this.loadingAsignaciones = true;
    this.planService.getMisAsignaciones().subscribe({
      next: (asignaciones) => {
        this.asignaciones = asignaciones;
        this.loadingAsignaciones = false;
      },
      error: (error) => {
        console.error('Error al cargar asignaciones:', error);
        this.loadingAsignaciones = false;
      }
    });
  }

  // ========== MÉTODOS AUXILIARES ==========
  
  private loadAnimales(): void {
    this.animalService.getAnimals().subscribe({
      next: (animales) => {
        this.animales = animales;
        console.log('Animales cargados:', animales);
      },
      error: (error) => {
        console.error('Error al cargar animales:', error);
        // Mostrar un mensaje de error al usuario
        alert('Error al cargar la lista de animales. Verifique que el backend esté funcionando.');
      }
    });
  }

  // Método temporal para debugging
  testDirectHttpCall(): void {
    console.log('=== TEST DIRECTO HTTP ===');
    console.log('Environment API URL:', environment.apiUrl);
    
    const url = `${environment.apiUrl}/api/plan-alimentacion`;
    console.log('URL completa de test:', url);
    
    // Test 1: Petición directa usando HttpClient
    console.log('--- Test 1: Petición directa con HttpClient ---');
    this.http.get(url).subscribe({
      next: (response) => {
        console.log('✅ Respuesta directa exitosa:', response);
        console.log('Tipo:', typeof response);
        console.log('Es array?:', Array.isArray(response));
      },
      error: (error) => {
        console.error('❌ Error en petición directa:', error);
      },
      complete: () => {
        console.log('🏁 Petición directa completada');
      }
    });
  }
}