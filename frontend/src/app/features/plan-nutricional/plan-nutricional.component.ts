import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PlanAlimentacionService, PlanAlimentacion, PlanDetalle, PlanAsignacion } from './services/plan-alimentacion.service';

// Interfaces para el sistema automático
// Interfaces de programación automática eliminadas - funcionalidad removida
import { AnimalService } from '../configuracion/services/animal.service';
import { Animal } from '../configuracion/interfaces/animal.interface';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { ProductService } from '../../shared/services/product.service';
import { Product, TypeFood } from '../../shared/models/product.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-plan-nutricional',
  templateUrl: './plan-nutricional.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule]
})
export class PlanNutricionalComponent implements OnInit {
  
  // Estados de la interfaz
  activeTab: 'planes' | 'etapas' | 'vista-general' = 'planes';
  showPlanForm = false;
  showEtapaForm = false;
  showRegistroForm = false;
  editingPlan: PlanAlimentacion | null = null;
  editingEtapa: PlanDetalle | null = null;
  selectedPlan: PlanAlimentacion | null = null;
  
  // Formularios
  planForm: FormGroup;
  detalleForm: FormGroup;
  
  // Datos
  planes: PlanAlimentacion[] = [];
  animales: Animal[] = [];
  productos: Product[] = [];
  alimentos: Product[] = [];
  medicinas: Product[] = [];
  typeFoods: TypeFood[] = [];
  tipoProductoSeleccionado: 'alimento' | 'medicina' = 'alimento';
  
  // Loading states
  loading = false;
  
  // ✅ NUEVAS VARIABLES para vista general de etapas
  todasLasEtapas: any[] = []; // Cambio a any[] para manejar DTOs del backend
  etapasAgrupadas: any[] = [];
  estadisticasGenerales: any = {};
  mostrandoVistaGeneral: boolean = false;
  loadingPlanes = false;
  
  // Variables de ejecución diaria eliminadas - tab removido
  
  // Variables para funcionalidades adicionales
  busquedaTermino: string = '';
  filtroTipoAnimal: string = '';
  
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private planService: PlanAlimentacionService,
    private animalService: AnimalService,
    private authService: AuthDirectService,
    private productService: ProductService
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
      animalId: ['', Validators.required],
      productId: ['', Validators.required],
      quantityPerAnimal: ['', [Validators.required, Validators.min(0.001)]],
      frequency: ['DIARIA', Validators.required],
      instructions: ['']
    });
    
    console.log('✅ FORMULARIOS INICIALIZADOS');
    console.log('Validaciones del detalleForm configuradas correctamente');
  }
  
  private loadInitialData(): void {
    console.log('=== DEBUG LOAD INITIAL DATA ===');
    console.log('Iniciando carga de datos iniciales...');
    this.loadPlanes();
    this.loadAnimales();
    this.loadProductos();
    // Carga de ejecución diaria eliminada - tab removido
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
    console.log('✏️ INICIANDO EDICIÓN DE PLAN');
    console.log('📋 Plan completo:', plan);
    console.log('🏷️ Nombre:', plan.name);
    console.log('📝 Descripción:', plan.description);
    console.log('🐾 Animal ID:', plan.animalId);
    console.log('🐾 Animal object:', plan.animal);
    console.log('🔢 Animal ID final:', plan.animalId || plan.animal?.id);
    
    this.editingPlan = plan;
    
    const formData = {
      name: plan.name,
      description: plan.description,
      animalId: plan.animalId || plan.animal?.id
    };
    
    console.log('📝 Datos para llenar el formulario:', formData);
    
    this.planForm.patchValue(formData);
    
    // Verificar que el formulario se llenó correctamente
    console.log('✅ Formulario después de patchValue:', this.planForm.value);
    
    this.showPlanForm = true;
    
    console.log('🎉 Formulario de edición abierto');
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
  
  // ========== MÉTODOS PARA OBTENER INFORMACIÓN DEL ANIMAL ==========
  
  /**
   * Obtiene el nombre del animal del plan seleccionado
   */
  getAnimalNameFromPlan(plan: PlanAlimentacion): string {
    if (plan.animal?.name) {
      return plan.animal.name;
    }
    
    if (plan.animalId) {
      const animal = this.animales.find(a => a.id === plan.animalId);
      return animal?.name || 'Animal no encontrado';
    }
    
    return 'Sin animal definido';
  }
  
  /**
   * Obtiene el objeto animal completo del plan seleccionado
   */
  getAnimalFromPlan(plan: PlanAlimentacion): any {
    if (plan.animal) {
      return plan.animal;
    }
    
    if (plan.animalId) {
      return this.animales.find(a => a.id === plan.animalId);
    }
    
    return null;
  }
  
  // ========== MÉTODOS DE NAVEGACIÓN ==========
  
  setActiveTab(tab: 'planes' | 'etapas' | 'vista-general'): void {
    this.activeTab = tab;
    
    if (tab === 'etapas') {
      this.loadDetallesPlanes();
    } else if (tab === 'vista-general') {
      // ✅ NUEVO: Cargar vista general de todas las etapas
      this.loadVistaGeneralEtapas();
    }
  }
  
  // Método de carga de asignaciones eliminado - ya no se usa

  // ========== MÉTODOS AUXILIARES ==========
  
  private loadAnimales(): void {
    console.log('🐾 === CARGANDO ANIMALES DESDE BD ===');
    console.log('URL endpoint:', `${environment.apiUrl}/animal`);
    
    this.animalService.getAnimals().subscribe({
      next: (animales) => {
        console.log('✅ Animales cargados exitosamente:', animales);
        console.log('📊 Cantidad de animales:', animales.length);
        this.animales = animales;
        
        // Debug adicional: mostrar estructura de cada animal
        animales.forEach((animal, index) => {
          console.log(`  Animal ${index + 1}:`, {
            id: animal.id,
            name: animal.name,
            type: animal.type || 'Sin tipo'
          });
        });
      },
      error: (error) => {
        console.error('❌ Error al cargar animales:', error);
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('URL intentada:', error.url);
        
        // Mostrar un mensaje de error al usuario
        alert(`Error al cargar la lista de animales: ${error.message || 'Error desconocido'}`);
      }
    });
  }

  private loadProductos(): void {
    console.log('=== CARGANDO PRODUCTOS REALES DEL INVENTARIO ===');
    
    // Cargar productos del inventario
    this.productService.getProducts().subscribe({
      next: (productos) => {
        console.log('Productos cargados desde inventario:', productos);
        this.productos = productos;
        this.filtrarProductosPorTipo();
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        // Fallback con datos de ejemplo
        this.productos = [
          { 
            id: 1, 
            name: 'Alimento Preinicial', 
            quantity: 100, 
            price_unit: 2.5, 
            number_facture: 0,
            date_compra: new Date(),
            level_min: 10,
            level_max: 500,
            typeFood: { id: 1, name: 'Alimento' }
          },
          { 
            id: 2, 
            name: 'Vitamina C', 
            quantity: 50, 
            price_unit: 15.0, 
            number_facture: 0,
            date_compra: new Date(),
            level_min: 5,
            level_max: 100,
            typeFood: { id: 2, name: 'Medicina' }
          }
        ] as Product[];
        this.filtrarProductosPorTipo();
      }
    });
    
    // Cargar tipos de alimentos
    this.productService.getTypeFoods().subscribe({
      next: (typeFoods) => {
        console.log('Tipos de alimentos cargados:', typeFoods);
        this.typeFoods = typeFoods;
      },
      error: (error) => {
        console.error('Error al cargar tipos de alimentos:', error);
        this.typeFoods = [
          { id: 1, name: 'Alimento' },
          { id: 2, name: 'Medicina' }
        ];
      }
    });
  }
  
  private filtrarProductosPorTipo(): void {
    console.log('🔄 Filtrando productos por tipo...');
    console.log('📋 Total productos cargados:', this.productos.length);
    
    // Log de tipos de productos disponibles
    const tiposUnicos = [...new Set(this.productos.map(p => p.typeFood?.name).filter(Boolean))];
    console.log('🏷️ Tipos de productos encontrados:', tiposUnicos);
    
    // Filtrar alimentos (más inclusivo)
    this.alimentos = this.productos.filter(p => {
      const tipoNombre = p.typeFood?.name?.toLowerCase() || '';
      const productNombre = p.name?.toLowerCase() || '';
      
      const esAlimento = tipoNombre.includes('alimento') || 
                        tipoNombre.includes('concentrado') ||
                        tipoNombre.includes('balanceado') ||
                        tipoNombre.includes('pienso') ||
                        tipoNombre.includes('comida') ||
                        tipoNombre.includes('feed') ||
                        // También buscar en el nombre del producto
                        productNombre.includes('maíz') ||
                        productNombre.includes('maiz') ||
                        productNombre.includes('soya') ||
                        productNombre.includes('sorgo') ||
                        productNombre.includes('avena') ||
                        productNombre.includes('trigo') ||
                        productNombre.includes('alimento') ||
                        productNombre.includes('concentrado');
      
      if (esAlimento) {
        console.log(`✅ "${p.name}" clasificado como ALIMENTO (tipo: ${p.typeFood?.name})`);
      }
      
      return esAlimento;
    });
    
    // Filtrar medicinas
    this.medicinas = this.productos.filter(p => {
      const tipoNombre = p.typeFood?.name?.toLowerCase() || '';
      const productNombre = p.name?.toLowerCase() || '';
      
      const esMedicina = tipoNombre.includes('medicina') || 
                        tipoNombre.includes('medicamento') ||
                        tipoNombre.includes('vitamina') ||
                        tipoNombre.includes('suplemento') ||
                        tipoNombre.includes('vacuna') ||
                        tipoNombre.includes('antibiotico') ||
                        // También buscar en el nombre del producto
                        productNombre.includes('vitamina') ||
                        productNombre.includes('vacuna') ||
                        productNombre.includes('medicina') ||
                        productNombre.includes('suplemento');
      
      if (esMedicina) {
        console.log(`💊 "${p.name}" clasificado como MEDICINA (tipo: ${p.typeFood?.name})`);
      }
      
      return esMedicina;
    });
    
    console.log('🍽️ Alimentos filtrados:', this.alimentos.length, 'productos');
    console.log('💊 Medicinas filtradas:', this.medicinas.length, 'productos');
    
    // Si un producto no se clasificó en ninguna categoría, mostrarlo
    const productosNoClasificados = this.productos.filter(p => 
      !this.alimentos.includes(p) && !this.medicinas.includes(p)
    );
    
    if (productosNoClasificados.length > 0) {
      console.log('⚠️ Productos no clasificados:', productosNoClasificados.map(p => ({
        name: p.name,
        typeFood: p.typeFood?.name
      })));
    }
  }
  
  getProductosFiltrados(): Product[] {
    return this.tipoProductoSeleccionado === 'alimento' ? this.alimentos : this.medicinas;
  }

  // ========== MÉTODOS OBSOLETOS ELIMINADOS ==========

  // ========== MÉTODOS DE PROGRAMACIÓN AUTOMÁTICA ELIMINADOS ==========
  // Funcionalidad removida - no se usa en los tabs actuales

  // ========== MÉTODOS PARA DETALLES DEL PLAN ==========

  showCreateDetalleForm(plan: PlanAlimentacion): void {
    this.selectedPlan = plan;
    this.showEtapaForm = true;
    this.detalleForm.reset();
  }

  saveDetalle(): void {
    if (this.detalleForm.valid && this.selectedPlan) {
      this.loading = true;
      const formData = this.detalleForm.value;
      
      // 🔒 OBTENER ANIMAL: Si está bloqueado, usar el del plan; sino, usar el seleccionado
      const animalDelPlan = this.getAnimalFromPlan(this.selectedPlan);
      const animalId = animalDelPlan?.id || formData.animalId;
      
      console.log('🎯 PROCESANDO ANIMAL EN SAVE');
      console.log('Plan seleccionado:', this.selectedPlan.name);
      console.log('Animal del plan:', animalDelPlan);
      console.log('Animal ID final:', animalId);
      console.log('Form data animalId:', formData.animalId);
      
      // ✅ NUEVA VALIDACIÓN: Verificar solapamiento en el frontend antes de enviar
      if (this.selectedPlan.detalles && this.selectedPlan.detalles.length > 0) {
        const rangoSolapa = this.selectedPlan.detalles.find(detalle => {
          // Excluir si estamos editando el mismo detalle
          if (this.editingEtapa && detalle.id === this.editingEtapa.id) {
            return false;
          }
          
          // Verificar solapamiento de días
          const haysolapamiento = !(formData.dayEnd < detalle.dayStart || formData.dayStart > detalle.dayEnd);
          
          if (haysolapamiento) {
            // Solo considerar solapamiento problemático si es el mismo animal Y producto
            const mismoAnimal = detalle.animal?.id === parseInt(animalId);
            const mismoProducto = detalle.product?.id === parseInt(formData.productId);
            
            return mismoAnimal && mismoProducto;
          }
          
          return false;
        });
        
        if (rangoSolapa) {
          alert(`⚠️ Advertencia de Solapamiento\n\n` +
                `El rango ${formData.dayStart}-${formData.dayEnd} días se solapa con una etapa existente (${rangoSolapa.dayStart}-${rangoSolapa.dayEnd} días) ` +
                `para el mismo animal y producto.\n\n` +
                `💡 Sugerencias:\n` +
                `• Usar rango ${rangoSolapa.dayEnd + 1}-${formData.dayEnd} días\n` +
                `• Usar rango ${formData.dayStart}-${rangoSolapa.dayStart - 1} días\n` +
                `• Verificar si realmente necesitas este rango\n\n` +
                `¿Deseas continuar de todas formas?`);
          
          if (!confirm('¿Continuar enviando al servidor?')) {
            this.loading = false;
            return;
          }
        }
      }
      
      // Convertir productId a número para comparación correcta
      const productId = parseInt(formData.productId);
      console.log('🔍 Buscando producto con ID:', productId, 'Tipo:', typeof productId);
      console.log('🔽 Tipo de producto seleccionado:', this.tipoProductoSeleccionado);
      
      // Buscar en la lista filtrada que realmente ve el usuario
      const productosDisponibles = this.getProductosFiltrados();
      console.log('📦 Productos filtrados disponibles:', productosDisponibles.map(p => ({id: p.id, name: p.name, tipo: typeof p.id})));
      
      const productoSeleccionado = productosDisponibles.find(p => p.id === productId);
      console.log('✅ Producto encontrado:', productoSeleccionado);
      
      if (!productoSeleccionado) {
        console.error('❌ No se encontró el producto con ID:', productId);
        console.error('📋 Productos filtrados disponibles:', productosDisponibles);
        console.error('📋 Todos los productos cargados:', this.productos);
        alert(`No se encontró el producto con ID: ${productId} en la lista de ${this.tipoProductoSeleccionado}s. Verifique que el producto esté disponible y sea del tipo correcto.`);
        this.loading = false;
        return;
      }

      // 🔒 ENCONTRAR ANIMAL: Usar el ID correcto (puede estar bloqueado)
      const animalSeleccionado = this.animales.find(a => a.id === parseInt(animalId));
      
      if (!animalSeleccionado) {
        alert('Por favor seleccione un animal válido');
        this.loading = false;
        return;
      }

      // Crear objeto según el DTO del backend
      const detalleData = {
        dayStart: formData.dayStart,
        dayEnd: formData.dayEnd,
        product: {
          id: productoSeleccionado.id,
          name: productoSeleccionado.name
        },
        animal: {
          id: animalSeleccionado.id,
          name: animalSeleccionado.name
        },
        quantityPerAnimal: formData.quantityPerAnimal,
        frequency: formData.frequency,
        instructions: formData.instructions
      };
      
      // 🔧 DEBUG: Verificar datos antes de enviar
      console.log('🚀 DATOS ENVIADOS AL BACKEND:');
      console.log('  Plan ID:', this.selectedPlan.id);
      console.log('  Form Data Raw:', formData);
      console.log('  Detalle Data Final:', detalleData);
      console.log('  Frequency específicamente:', formData.frequency);
      console.log('  Tipo de frequency:', typeof formData.frequency);
      console.log('  Modo edición:', !!this.editingEtapa);
      console.log('  Etapa editando ID:', this.editingEtapa?.id);
      
      // 🔧 DECIDIR SI CREAR O ACTUALIZAR
      const serviceCall = this.editingEtapa 
        ? this.planService.updateDetalle(this.selectedPlan.id!, this.editingEtapa.id!, detalleData)
        : this.planService.addDetalleToPlan(this.selectedPlan.id!, detalleData);
      
      serviceCall.subscribe({
        next: (response) => {
          console.log('✅ Detalle agregado exitosamente:', response);
          
          // 🔧 DEBUG: Verificar respuesta del backend
          console.log('📥 RESPUESTA DEL BACKEND:');
          console.log('  Response completa:', response);
          console.log('  Frequency en respuesta:', response?.frequency);
          console.log('  Tipo de frequency:', typeof response?.frequency);
          
          // ✅ MEJORADO: Mensaje de éxito más informativo
          const accion = this.editingEtapa ? 'Actualizada' : 'Creada';
          const successMessage = `✅ Etapa de Crecimiento ${accion} Exitosamente!\n\n` +
            `📅 Rango: Días ${formData.dayStart} - ${formData.dayEnd}\n` +
            `🥫 Producto: ${productoSeleccionado.name}\n` +
            `🐾 Animal: ${animalSeleccionado.name}\n` +
            `⚖️ Cantidad: ${formData.quantityPerAnimal} kg por animal\n` +
            `🔄 Frecuencia: ${formData.frequency}\n` +
            `${formData.instructions ? `📝 Instrucciones: ${formData.instructions}` : ''}`;
          
          alert(successMessage);
          
          this.closeDetalleForm();
          this.loading = false;
          
          // ✅ Recargar los detalles para mostrar la nueva etapa
          this.loadDetallesPlanes();
          
          // 🔄 Si estamos en Vista General, recargarla también
          if (this.activeTab === 'vista-general') {
            this.loadVistaGeneralEtapas();
          }
        },
        error: (error) => {
          console.error('Error al agregar detalle:', error);
          this.loading = false;
          
          // ✅ MEJORADO: Manejo específico de errores (tanto 400 como 500)
          let errorMessage = '';
          
          // Extraer mensaje de error del backend
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          } else {
            errorMessage = 'Error desconocido al procesar la solicitud';
          }
          
          // 🔧 MANEJO ESPECÍFICO POR TIPO DE ERROR
          if (errorMessage.includes('se solapa') || errorMessage.includes('solapamiento')) {
            alert(`❌ Error de Solapamiento de Etapas\n\n${errorMessage}\n\n💡 Sugerencias:\n• Verifica las etapas existentes\n• Usa rangos diferentes\n• Considera si es para un animal diferente`);
          } else if (errorMessage.includes('producto')) {
            alert(`❌ Error de Producto\n\n${errorMessage}\n\n💡 Verifica que el producto esté disponible y sea válido.`);
          } else if (errorMessage.includes('animal')) {
            alert(`❌ Error de Animal\n\n${errorMessage}\n\n💡 Verifica que el animal esté correctamente seleccionado.`);
          } else if (error.status === 401) {
            alert('❌ Error de Autenticación\n\nTu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            // Opcional: Redirigir al login
            // this.router.navigate(['/login']);
          } else if (error.status === 500 && errorMessage.includes('rango')) {
            // 🔧 NUEVO: Manejar errores 500 que son realmente errores de validación
            alert(`❌ Error de Validación de Rangos\n\n${errorMessage}\n\n💡 Revisa los rangos de días y asegúrate de que no se solapen con etapas existentes.`);
          } else {
            // ✅ Error genérico pero con información útil
            alert(`❌ Error al Crear Etapa\n\n${errorMessage}\n\n🔧 Código de estado: ${error.status || 'desconocido'}\n\n💡 Verifica los datos ingresados e intenta nuevamente.`);
          }
        }
      });
    }
  }

  closeDetalleForm(): void {
    this.showEtapaForm = false;
    this.editingEtapa = null;
    this.detalleForm.reset();
    
    // 🔄 MANTENER PLAN SELECCIONADO: No limpiar selectedPlan para mantener contexto
    // this.selectedPlan = null; // ❌ ELIMINADO: Esto causaba pérdida de contexto
    
    // 🔓 HABILITAR ANIMAL: Restaurar estado editable para futuras etapas
    this.detalleForm.get('animalId')?.enable();
  }

  // ========== MÉTODOS PARA ETAPAS DE CRECIMIENTO ==========

  loadDetallesPlanes(): void {
    // Cargar detalles de todos los planes para mostrar etapas
    this.planes.forEach(plan => {
      if (!plan.detalles) {
        // 🔧 DEBUG: Verificar qué plan se está cargando
        console.log(`🔄 CARGANDO DETALLES para plan ID: ${plan.id}, Nombre: "${plan.name}"`);
        
        this.planService.getDetallesByPlan(plan.id!).subscribe({
          next: (detalles) => {
            // 🔧 DEBUG: Verificar respuesta raw del backend
            console.log(`🚀 RESPUESTA RAW DEL BACKEND para plan "${plan.name}":`, detalles);
            console.log(`🚀 Tipo de respuesta:`, typeof detalles);
            console.log(`🚀 Es array:`, Array.isArray(detalles));
            console.log(`🚀 Cantidad de detalles:`, detalles?.length || 0);
            
            plan.detalles = detalles;
            
            // 🔧 DEBUG: Verificar datos de frecuencia y animal
            console.log(`🔍 Plan "${plan.name}" - Animal: ${this.getAnimalNameFromPlan(plan)}`);
            detalles.forEach((detalle, index) => {
              console.log(`  📋 Etapa ${index + 1} - RESUMEN:`, {
                days: `${detalle.dayStart}-${detalle.dayEnd}`,
                product: detalle.product?.name,
                frequency: detalle.frequency,
                formattedFrequency: this.formatearFrecuencia(detalle.frequency),
                quantity: detalle.quantityPerAnimal,
                animalInEtapa: detalle.animal?.name
              });
              
              // 🔧 DEBUG: Objeto completo de cada detalle
              console.log(`  🔍 Etapa ${index + 1} - OBJETO COMPLETO RAW:`, detalle);
              console.log(`  🔑 Etapa ${index + 1} - KEYS DISPONIBLES:`, Object.keys(detalle));
            });
          },
          error: (error) => {
            console.error('Error al cargar detalles del plan:', error);
            // Simular datos de ejemplo para testing
            plan.detalles = this.generarEtapasEjemplo(plan);
          }
        });
      }
    });
  }

  private generarEtapasEjemplo(plan: PlanAlimentacion): PlanDetalle[] {
    if (plan.animal?.name?.toLowerCase().includes('pollo')) {
      return [
        {
          id: 1,
          dayStart: 1,
          dayEnd: 20,
          product: { id: 1, name: 'Alimento Preinicial' },
          quantityPerAnimal: 0.05,
          frequency: 'DIARIA',
          instructions: 'Dar en 3-4 porciones durante el día. Verificar agua fresca.'
        },
        {
          id: 2,
          dayStart: 21,
          dayEnd: 44,
          product: { id: 2, name: 'Alimento Crecimiento' },
          quantityPerAnimal: 0.12,
          frequency: 'DIARIA',
          instructions: 'Aumentar gradualmente la cantidad. Monitorear peso.'
        }
      ];
    }
    return [];
  }

  showCreateEtapaForm(): void {
    if (!this.selectedPlan) {
      alert('Primero selecciona un plan de alimentación');
      return;
    }
    
    // ✅ MEJORADO: Mostrar información de etapas existentes
    if (this.selectedPlan.detalles && this.selectedPlan.detalles.length > 0) {
      console.log('📋 Etapas existentes para el plan:', this.selectedPlan.name);
      this.selectedPlan.detalles.forEach((detalle, index) => {
        console.log(`  ${index + 1}. Días ${detalle.dayStart}-${detalle.dayEnd}: ${detalle.product?.name} para ${detalle.animal?.name}`);
      });
    }
    
    this.showEtapaForm = true;
    this.editingEtapa = null;
    
    // 🎯 CONFIGURACIÓN MEJORADA: Animal predefinido y bloqueado usando métodos correctos
    const animalDelPlan = this.getAnimalFromPlan(this.selectedPlan);
    const animalId = animalDelPlan?.id || null;
    const animalName = this.getAnimalNameFromPlan(this.selectedPlan);
    
    // Calcular rango sugerido
    const siguienteDiaInicio = this.calcularSiguienteRangoDisponible();
    const siguienteDiaFin = siguienteDiaInicio + 6; // 7 días por defecto
    
    console.log('🎯 PRECARGAR ANIMAL EN NUEVA ETAPA');
    console.log('Plan seleccionado:', this.selectedPlan.name);
    console.log('Animal del plan:', animalDelPlan);
    console.log('Animal ID a precargar:', animalId);
    console.log('Nombre del animal:', animalName);
    console.log('Rango sugerido:', siguienteDiaInicio, '-', siguienteDiaFin);
    
    this.detalleForm.reset({
      animalId: animalId,
      productId: null,
      dayStart: siguienteDiaInicio,
      dayEnd: siguienteDiaFin,
      quantityPerAnimal: 0.05,
      frequency: 'DIARIA',
      instructions: ''
    });
    
    // 🔒 BLOQUEAR ANIMAL: Si hay un animal predefinido en el plan, deshabilitar el campo
    if (animalDelPlan && animalId) {
      this.detalleForm.get('animalId')?.disable();
      console.log(`🔒 Animal bloqueado para el plan: ${animalName}`);
    } else {
      this.detalleForm.get('animalId')?.enable();
      console.log('🔓 Animal editable - no hay animal predefinido en el plan');
    }
  }
  
  /**
   * ✅ NUEVO: Calcular el siguiente rango de días disponible
   */
  private calcularSiguienteRangoDisponible(): number {
    if (!this.selectedPlan?.detalles || this.selectedPlan.detalles.length === 0) {
      return 1; // Primer día si no hay etapas
    }
    
    // Encontrar el día máximo de finalización + 1
    const maxDay = Math.max(...this.selectedPlan.detalles.map(d => d.dayEnd));
    return maxDay + 1;
  }

  editEtapa(etapa: PlanDetalle): void {
    // 🔧 DEBUG: Verificar datos de la etapa que se va a editar
    console.log('✏️ EDITANDO ETAPA:');
    console.log('  Etapa completa:', etapa);
    console.log('  Frequency original:', etapa.frequency);
    console.log('  Tipo de frequency:', typeof etapa.frequency);
    console.log('  Formatted frequency:', this.formatearFrecuencia(etapa.frequency));
    
    this.editingEtapa = etapa;
    this.detalleForm.patchValue({
      dayStart: etapa.dayStart,
      dayEnd: etapa.dayEnd,
      animalId: etapa.animal?.id || '',
      productId: etapa.product.id,
      quantityPerAnimal: etapa.quantityPerAnimal,
      frequency: etapa.frequency,
      instructions: etapa.instructions
    });
    
    // 🔧 DEBUG: Verificar formulario después de patchValue
    console.log('  Formulario después de patchValue:', this.detalleForm.value);
    console.log('  Frequency en formulario:', this.detalleForm.get('frequency')?.value);
    
    // 🔒 BLOQUEAR ANIMAL: También en edición si hay un animal predefinido en el plan
    const animalDelPlan = this.getAnimalFromPlan(this.selectedPlan!);
    const animalName = this.getAnimalNameFromPlan(this.selectedPlan!);
    
    if (animalDelPlan && animalDelPlan.id) {
      this.detalleForm.get('animalId')?.disable();
      console.log(`🔒 Animal bloqueado durante edición para el plan: ${animalName}`);
    } else {
      this.detalleForm.get('animalId')?.enable();
      console.log('🔓 Animal editable durante edición - no hay animal predefinido en el plan');
    }
    
    this.showEtapaForm = true;
  }

  deleteEtapa(etapa: PlanDetalle): void {
    if (confirm(`¿Está seguro de eliminar la etapa de ${etapa.dayStart}-${etapa.dayEnd} días?`)) {
      console.log('Eliminando etapa:', etapa);
      
      if (this.selectedPlan && etapa.id) {
        this.planService.removeDetalleFromPlan(this.selectedPlan.id!, etapa.id).subscribe({
          next: () => {
            console.log('Etapa eliminada exitosamente');
            alert('Etapa eliminada exitosamente');
            this.loadDetallesPlanes();
          },
          error: (error) => {
            console.error('Error al eliminar etapa:', error);
            alert('Error al eliminar la etapa');
          }
        });
      }
    }
  }

  /**
   * Eliminar etapa específica desde la Vista General
   * Esta función maneja correctamente los IDs y actualiza la vista
   */
  eliminarEtapaDesdeVistaGeneral(etapaId: number, planId: number, etapaNombre: string): void {
    console.log('🗑️ Eliminando etapa desde Vista General:', {
      etapaId,
      planId,
      etapaNombre
    });

    if (confirm(`¿Está seguro de eliminar la ${etapaNombre}?\n\nEsta acción no se puede deshacer.`)) {
      this.planService.removeDetalleFromPlan(planId, etapaId).subscribe({
        next: () => {
          console.log('✅ Etapa eliminada exitosamente desde Vista General');
          alert(`✅ ${etapaNombre} eliminada exitosamente`);
          
          // Recargar la Vista General para reflejar los cambios
          this.loadVistaGeneralEtapas();
        },
        error: (error) => {
          console.error('❌ Error al eliminar etapa desde Vista General:', error);
          
          // Manejo específico de errores
          let mensajeError = 'Error al eliminar la etapa';
          
          if (error.status === 404) {
            mensajeError = 'La etapa ya no existe o fue eliminada previamente';
          } else if (error.status === 400) {
            mensajeError = error.error?.message || 'Error de validación al eliminar la etapa';
          } else if (error.status === 500) {
            mensajeError = 'Error interno del servidor al eliminar la etapa';
          }
          
          alert(`❌ ${mensajeError}`);
        }
      });
    }
  }

  // ========== MÉTODOS PARA ETAPAS AGRUPADAS POR ANIMAL ==========

  // Método para agrupar etapas por animal
  getEtapasAgrupadasPorAnimal(etapas: PlanDetalle[]): any[] {
    const grupos = etapas.reduce((acc, etapa) => {
      // 🔧 CORREGIDO: Obtener el animal del plan seleccionado
      let animalName = 'Sin animal definido';
      
      if (this.selectedPlan) {
        animalName = this.getAnimalNameFromPlan(this.selectedPlan);
      } else if (etapa.animal?.name) {
        animalName = etapa.animal.name;
      }
      
      console.log('🐾 Animal detectado para etapa:', animalName);
      
      if (!acc[animalName]) {
        acc[animalName] = [];
      }
      acc[animalName].push(etapa);
      return acc;
    }, {} as any);

    // Convertir a array y ordenar etapas por día de inicio
    return Object.keys(grupos).map(animal => ({
      animal,
      etapas: grupos[animal].sort((a: PlanDetalle, b: PlanDetalle) => a.dayStart - b.dayStart)
    }));
  }

  // Método para obtener el día mínimo de inicio
  getMinDayStart(etapas: PlanDetalle[]): number {
    if (!etapas || etapas.length === 0) return 0;
    return Math.min(...etapas.map(e => e.dayStart));
  }

  // Método para obtener el día máximo de fin
  getMaxDayEnd(etapas: PlanDetalle[]): number {
    if (!etapas || etapas.length === 0) return 0;
    return Math.max(...etapas.map(e => e.dayEnd));
  }

  // ========== MÉTODOS PARA REGISTRO DE ALIMENTACIÓN ==========

  // ========== MÉTODOS DE REGISTRO ELIMINADOS ==========
  // Funcionalidad de registro automático removida

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

  // ========== ✅ NUEVOS MÉTODOS PARA VISTA GENERAL DE ETAPAS ==========

  /**
   * Cargar vista general de todas las etapas del sistema
   */
  loadVistaGeneralEtapas(): void {
    console.log('🔍 Cargando vista general de todas las etapas...');
    this.loading = true;
    this.mostrandoVistaGeneral = true;

    // Cargar etapas y estadísticas en paralelo
    const etapas$ = this.planService.getVistaGeneralEtapas();
    const estadisticas$ = this.planService.getEstadisticasEtapas();

    // Usar forkJoin para ejecutar ambas peticiones en paralelo
    forkJoin({
      etapas: etapas$,
      estadisticas: estadisticas$
    }).subscribe({
      next: (result) => {
        this.todasLasEtapas = result.etapas;
        this.estadisticasGenerales = result.estadisticas;
        this.etapasAgrupadas = this.agruparEtapasParaVistaGeneral(result.etapas);
        
        console.log('✅ Vista general cargada:', {
          totalEtapas: this.todasLasEtapas.length,
          grupos: this.etapasAgrupadas.length,
          estadisticas: this.estadisticasGenerales
        });
        
        // 🎯 VERIFICACIÓN DE CORRECCIÓN
        const pollosCount = this.etapasAgrupadas.filter(g => g.tipoAnimal === 'pollo').length;
        const chanchosCount = this.etapasAgrupadas.filter(g => g.tipoAnimal === 'chancho').length;
        
        console.log(`✅ DETECCIÓN CORREGIDA - Pollos: ${pollosCount}, Chanchos: ${chanchosCount}`);
        
        // Debug detallado de grupos
        this.debugEtapasAgrupadas();
        
        this.loading = false;
        this.mostrandoVistaGeneral = false;

        // 🔧 DATOS PROFESIONALES: Mostrar información real sin manipular
        
        console.log('✅ Etapas agrupadas finales:', this.etapasAgrupadas);
        this.debugVistaGeneral();
        
        this.loading = false;
        this.mostrandoVistaGeneral = false;
      },
      error: (error) => {
        console.error('❌ Error cargando vista general:', error);
        this.loading = false;
        this.mostrandoVistaGeneral = false;
        alert('Error al cargar la vista general de etapas. Intenta nuevamente.');
      }
    });
    }

  /**
   * Separar etapas por tipo de animal cuando están mezcladas
   */
  private separarEtapasPorTipoAnimal(): void {
    console.log('🔍 Verificando separación por tipos de animales...');
    
    const gruposNuevos: any[] = [];
    
    this.etapasAgrupadas.forEach(grupo => {
      console.log(`🔍 Analizando grupo: ${grupo.animalNombre} (${grupo.etapas.length} etapas)`);
      
      // Analizar si hay etapas con diferentes características de animal
      const etapasPollos: any[] = [];
      const etapasChanchos: any[] = [];
      const etapasOtros: any[] = [];
      
      grupo.etapas.forEach((etapa: any) => {
        const consumo = etapa.quantityPerAnimal;
        const nombreProducto = etapa.product?.name?.toLowerCase() || '';
        
        // Clasificar por consumo y producto
        if (consumo <= 0.5 || nombreProducto.includes('pollo') || nombreProducto.includes('ave')) {
          etapasPollos.push(etapa);
        } else if (consumo > 0.5 || nombreProducto.includes('chancho') || nombreProducto.includes('cerdo')) {
          etapasChanchos.push(etapa);
        } else {
          etapasOtros.push(etapa);
        }
      });
      
      console.log(`📊 División: ${etapasPollos.length} pollos, ${etapasChanchos.length} chanchos, ${etapasOtros.length} otros`);
      
      // Si hay etapas de diferentes tipos, separarlas
      if (etapasPollos.length > 0 && etapasChanchos.length > 0) {
        console.log('🔄 Separando etapas mixtas...');
        
        // Crear grupo para pollos
        if (etapasPollos.length > 0) {
          const animalPollo = this.animales.find(a => 
            a.name.toLowerCase().includes('pollo') || 
            a.name.toLowerCase().includes('ave')
          );
          
          gruposNuevos.push({
            ...grupo,
            animalNombre: animalPollo?.name || 'Pollo de Engorde',
            etapas: etapasPollos,
            totalEtapas: etapasPollos.length,
            rangoTotal: this.calcularRangoTotal(etapasPollos)
          });
        }
        
        // Crear grupo para chanchos
        if (etapasChanchos.length > 0) {
          const animalChancho = this.animales.find(a => 
            a.name.toLowerCase().includes('chancho') || 
            a.name.toLowerCase().includes('cerdo')
          );
          
          gruposNuevos.push({
            ...grupo,
            animalNombre: animalChancho?.name || 'Chancho de Engorde',
            etapas: etapasChanchos,
            totalEtapas: etapasChanchos.length,
            rangoTotal: this.calcularRangoTotal(etapasChanchos)
          });
        }
        
        // Crear grupo para otros si los hay
        if (etapasOtros.length > 0) {
          gruposNuevos.push({
            ...grupo,
            etapas: etapasOtros,
            totalEtapas: etapasOtros.length,
            rangoTotal: this.calcularRangoTotal(etapasOtros)
          });
        }
      } else {
        // Si no hay mezcla, mantener el grupo original
        gruposNuevos.push(grupo);
      }
    });
    
    // Actualizar los grupos
    this.etapasAgrupadas = gruposNuevos;
    
    console.log(`✅ Separación completada: ${gruposNuevos.length} grupos finales`);
  }

  /**
   * Calcular rango total de un conjunto de etapas
   */
  private calcularRangoTotal(etapas: any[]): { min: number, max: number } {
    return {
      min: Math.min(...etapas.map(e => e.dayStart)),
      max: Math.max(...etapas.map(e => e.dayEnd))
    };
  }

  /**
   * Función de debug para mostrar información detallada de la vista general
   */
  private debugVistaGeneral(): void {
    console.log('🔍 === DEBUG VISTA GENERAL ===');
    console.log('📊 Total de etapas agrupadas:', this.etapasAgrupadas.length);
    console.log('🐾 Animales disponibles en sistema:', this.animales.map(a => a.name));
    console.log('📋 Planes disponibles en sistema:', this.planes.map(p => p.name));
    
    this.etapasAgrupadas.forEach((grupo, index) => {
      console.log(`\n📁 Grupo ${index + 1}:`);
      console.log('   🏷️ Nombre del animal:', grupo.animalNombre);
      console.log('   📋 Nombre del plan:', grupo.planNombre);
      console.log('   🔢 Total de etapas:', grupo.totalEtapas);
      console.log('   📊 Etapas individuales:');
      
      grupo.etapas.forEach((etapa: any, etapaIndex: number) => {
        console.log(`     ${etapaIndex + 1}. Días ${etapa.dayStart}-${etapa.dayEnd}, Consumo: ${etapa.quantityPerAnimal}, Producto: ${etapa.product?.name}`);
      });
    });
    
    const animalesUnicos = this.getAnimalesUnicos();
    console.log('\n🎯 Animales únicos detectados:', animalesUnicos);
    
    animalesUnicos.forEach(animal => {
      const etapas = this.getEtapasPorTipoAnimal(animal);
      console.log(`   ${animal}: ${etapas.length} etapas`);
    });
    
    console.log('🔍 === FIN DEBUG VISTA GENERAL ===\n');
  }

  /**
   * 🔧 NUEVO: Debug detallado de etapas agrupadas
   */
  private debugEtapasAgrupadas(): void {
    console.log('📊 DEBUG ETAPAS AGRUPADAS - Información detallada:');
    console.log(`Total de grupos: ${this.etapasAgrupadas.length}`);
    
    this.etapasAgrupadas.forEach((grupo, index) => {
      console.log(`\n📋 Grupo ${index + 1}:`);
      console.log(`   📝 Plan: "${grupo.planNombre}" (ID: ${grupo.planId})`);
      console.log(`   🐾 Animal: "${grupo.animalNombre}"`);
      console.log(`   🏷️ Tipo: "${grupo.tipoAnimal}"`);
      console.log(`   📈 Etapas: ${grupo.etapas.length}`);
      console.log(`   📅 Rango: ${grupo.rangoTotal.min}-${grupo.rangoTotal.max} días`);
      if (grupo.razonDeteccion) {
        console.log(`   🔍 Detectado por: ${grupo.razonDeteccion}`);
      }
      
      // Mostrar primeras 2 etapas como ejemplo
      grupo.etapas.slice(0, 2).forEach((etapa: any, etapaIndex: number) => {
        console.log(`     ${etapaIndex + 1}. Días ${etapa.dayStart}-${etapa.dayEnd}: ${etapa.product?.name || 'Sin producto'} (${etapa.quantityPerAnimal}kg)`);
      });
      
      if (grupo.etapas.length > 2) {
        console.log(`     ... y ${grupo.etapas.length - 2} etapas más`);
      }
    });
    
    // Análisis de tipos de animales
    const tiposUnicos = new Set(this.etapasAgrupadas.map(g => g.tipoAnimal));
    console.log(`\n🐾 ANÁLISIS DE TIPOS DE ANIMALES:`);
    console.log(`   Tipos únicos detectados: ${Array.from(tiposUnicos).join(', ')}`);
    
    tiposUnicos.forEach(tipo => {
      const gruposPorTipo = this.etapasAgrupadas.filter(g => g.tipoAnimal === tipo);
      console.log(`   ${tipo}: ${gruposPorTipo.length} planes`);
    });
  }

  /**
   * 🔧 MÉTODO PARA FORZAR RECARGA COMPLETA
   */
  forzarRecargaCompleta(): void {
    console.log('🔄 FORZAR RECARGA COMPLETA');
    
    // Limpiar datos actuales
    this.etapasAgrupadas = [];
    this.todasLasEtapas = [];
    this.estadisticasGenerales = {};
    
    // Recargar todo
    this.loadInitialData();
    this.loadVistaGeneralEtapas();
  }

  /**
   * 🔧 NUEVO: Generar datos de ejemplo con chanchos para demostración
   */
  generarDatosEjemploConChanchos(): void {
    console.log('🎯 GENERANDO DATOS DE EJEMPLO CON CHANCHOS');
    
    // Crear datos de ejemplo que incluyan tanto pollos como chanchos
    const etapasEjemplo = [
      // Plan para Pollos
      {
        planAlimentacionId: 1,
        animal: { id: 1, name: 'Pollos' },
        product: { id: 1, name: 'Alimento Preiniciador Pollo' },
        dayStart: 1,
        dayEnd: 14,
        quantityPerAnimal: 0.05,
        frequency: 'DIARIA'
      },
      {
        planAlimentacionId: 1,
        animal: { id: 1, name: 'Pollos' },
        product: { id: 2, name: 'Alimento Iniciador Pollo' },
        dayStart: 15,
        dayEnd: 35,
        quantityPerAnimal: 0.12,
        frequency: 'DIARIA'
      },
      // Plan para Chanchos
      {
        planAlimentacionId: 2,
        animal: { id: 2, name: 'Chanchos' },
        product: { id: 3, name: 'Alimento Iniciador Chancho' },
        dayStart: 1,
        dayEnd: 30,
        quantityPerAnimal: 0.8,
        frequency: 'DIARIA'
      },
      {
        planAlimentacionId: 2,
        animal: { id: 2, name: 'Chanchos' },
        product: { id: 4, name: 'Alimento Crecimiento Chancho' },
        dayStart: 31,
        dayEnd: 60,
        quantityPerAnimal: 1.5,
        frequency: 'DIARIA'
      },
      // Plan adicional para Chanchos con descripción específica
      {
        planAlimentacionId: 3,
        animal: { id: 3, name: 'Cerdos de Engorde' },
        product: { id: 5, name: 'Alimento Engorde Porcino' },
        dayStart: 61,
        dayEnd: 120,
        quantityPerAnimal: 2.2,
        frequency: 'DIARIA'
      }
    ];
    
    // Actualizar planes con información de chanchos
    if (this.planes.length < 3) {
      // Agregar planes de ejemplo si no existen
      const planesEjemplo = [
        { id: 1, name: 'Plan Pollos 1-35 días', description: 'Plan de alimentación para pollos de engorde', animal: { id: 1, name: 'Pollos' } },
        { id: 2, name: 'Plan Chanchos 1-60 días', description: 'Plan de alimentación para chanchos de engorde', animal: { id: 2, name: 'Chanchos' } },
        { id: 3, name: 'Plan Cerdos Finalización', description: 'Plan de finalización para cerdos', animal: { id: 3, name: 'Cerdos de Engorde' } }
      ];
      
      this.planes = [...this.planes, ...planesEjemplo];
    }
    
    // Asegurarse de que haya animales de chanchos en la lista
    if (!this.animales.some(a => a.name.toLowerCase().includes('chancho'))) {
      this.animales.push(
        { id: 2, name: 'Chanchos' },
        { id: 3, name: 'Cerdos de Engorde' }
      );
    }
    
    // Procesar los datos de ejemplo
    this.todasLasEtapas = etapasEjemplo;
    this.etapasAgrupadas = this.agruparEtapasParaVistaGeneral(etapasEjemplo);
    
    console.log('✅ Datos de ejemplo con chanchos generados');
    console.log('📊 Etapas agrupadas:', this.etapasAgrupadas);
    
    // 🔍 DEBUG ESPECÍFICO: Verificar que los chanchos están en los grupos
    const chanchoGrupos = this.etapasAgrupadas.filter(g => g.tipoAnimal === 'chancho');
    const polloGrupos = this.etapasAgrupadas.filter(g => g.tipoAnimal === 'pollo');
    
    console.log('🐷 GRUPOS DE CHANCHOS:', chanchoGrupos.length);
    chanchoGrupos.forEach(g => {
      console.log(`   - ${g.planNombre} (${g.animalNombre}) - ${g.totalEtapas} etapas`);
    });
    
    console.log('🐔 GRUPOS DE POLLOS:', polloGrupos.length);
    polloGrupos.forEach(g => {
      console.log(`   - ${g.planNombre} (${g.animalNombre}) - ${g.totalEtapas} etapas`);
    });
    
    // 🔄 FORZAR ACTUALIZACIÓN DE LA VISTA
    this.mostrandoVistaGeneral = false;
    
    // Simular un pequeño delay para que se vea el cambio
    setTimeout(() => {
      // Forzar detección de cambios
      this.debugEtapasAgrupadas();
      
      // Mostrar mensaje de éxito
      alert(`✅ ¡Datos de ejemplo generados!\n\n🐔 Pollos: ${polloGrupos.length} plan(es)\n🐷 Chanchos: ${chanchoGrupos.length} plan(es)\n\nRevisa la tabla y usa el filtro para ver cada tipo.`);
    }, 100);
  }

  /**
   * Agrupar etapas por plan y animal para mejor visualización
   */
  private agruparEtapasParaVistaGeneral(etapas: any[]): any[] {
    console.log('🔄 Preparando etapas individuales para vista general:', etapas.length);
    console.log('🔍 Datos de etapas recibidas:', etapas);
    
    // 🔧 CAMBIO: En lugar de agrupar, mostrar cada etapa como elemento individual
    const etapasIndividuales = etapas.map((etapa: any, index: number) => {
      // Obtener información del plan
      const planId = etapa.planAlimentacionId;
      const planEncontrado = this.planes.find(p => p.id === planId);
      const planNombre = planEncontrado?.name || `Plan sin nombre (ID: ${planId})`;
      
      console.log(`🔍 Procesando etapa ID ${etapa.id}:`, {
        planId: planId,
        planEncontrado: planEncontrado,
        planNombre: planNombre,
        animal: etapa.animal,
        dayStart: etapa.dayStart,
        dayEnd: etapa.dayEnd,
        product: etapa.product
      });
      
      // 🔧 USAR DIRECTAMENTE LOS DATOS QUE VIENEN DEL BACKEND SIN TRANSFORMAR
      let animalNombre = etapa.animal?.name || 'Animal no especificado';
      let tipoAnimalDetectado = 'desconocido';
      
      // Detectar tipo basado en el nombre del animal que viene del backend
      const nombreLower = animalNombre.toLowerCase();
      if (nombreLower.includes('chancho') || nombreLower.includes('cerdo') || nombreLower.includes('porcino') || nombreLower.includes('pig')) {
        tipoAnimalDetectado = 'chancho';
      } else if (nombreLower.includes('pollo') || nombreLower.includes('gallina') || nombreLower.includes('ave') || nombreLower.includes('chicken')) {
        tipoAnimalDetectado = 'pollo';
      } else {
        // Si no se puede detectar por nombre, usar el consumo como fallback
        const consumo = etapa.quantityPerAnimal || 0;
        if (consumo > 0.5) {
          tipoAnimalDetectado = 'chancho';
        } else {
          tipoAnimalDetectado = 'pollo';
        }
      }
      
      console.log(`🎯 Etapa ${etapa.id}: Plan "${planNombre}", Animal "${animalNombre}", Tipo "${tipoAnimalDetectado}"`);
      
      // 🔧 RETORNAR CADA ETAPA COMO UN "GRUPO" INDIVIDUAL
      return {
        planNombre: planNombre,
        planId: planId,
        planDescripcion: planEncontrado?.description || 'Plan de alimentación',
        animalNombre: animalNombre, // 🔧 USAR EL NOMBRE REAL DEL ANIMAL
        tipoAnimal: tipoAnimalDetectado,
        animalId: etapa.animal?.id || etapa.animalId,
        etapas: [etapa], // Cada "grupo" contiene solo una etapa
        rangoTotal: { min: etapa.dayStart, max: etapa.dayEnd },
        totalEtapas: 1,
        // 🔧 AGREGAMOS CAMPOS ESPECÍFICOS DE LA ETAPA PARA FÁCIL ACCESO
        etapaId: etapa.id,
        etapaNombre: `Etapa ${etapa.dayStart}-${etapa.dayEnd} días`,
        dayStart: etapa.dayStart,
        dayEnd: etapa.dayEnd,
        quantityPerAnimal: etapa.quantityPerAnimal,
        frequency: etapa.frequency,
        product: etapa.product
      };
    });
    
    // Ordenar por plan ID y luego por día de inicio
    const resultado = etapasIndividuales.sort((a: any, b: any) => {
      if (a.planId !== b.planId) {
        return b.planId - a.planId; // Ordenar por ID del plan (descendente)
      }
      return a.dayStart - b.dayStart; // Luego por día de inicio (ascendente)
    });

    console.log('✅ Etapas individuales preparadas:', {
      totalEtapas: resultado.length,
      etapas: resultado.map(e => ({ 
        planId: e.planId,
        plan: e.planNombre, 
        etapa: e.etapaNombre,
        animal: e.animalNombre, 
        tipo: e.tipoAnimal,
        dias: `${e.dayStart}-${e.dayEnd}`
      }))
    });

    return resultado;
  }

  /**
   * Obtiene color para el plan según su ID
   */
  getColorPorPlan(planId: number | undefined): string {
    if (!planId) return 'bg-gray-100';
    
    const colores = [
      'bg-blue-100 border-blue-300',
      'bg-green-100 border-green-300', 
      'bg-yellow-100 border-yellow-300',
      'bg-purple-100 border-purple-300',
      'bg-pink-100 border-pink-300',
      'bg-indigo-100 border-indigo-300'
    ];
    
    return colores[planId % colores.length];
  }

  /**
   * Ir a un plan específico desde la vista general
   */
  irAPlanDesdeVistaGeneral(planId: number): void {
    console.log('🎯 NAVEGAR AL PLAN - ID recibido:', planId);
    console.log('🎯 Tipo del planId:', typeof planId);
    console.log('🎯 Es válido?:', planId && !isNaN(planId));
    
    // 🔧 VALIDACIÓN MEJORADA DEL PLAN ID
    if (!planId || isNaN(planId)) {
      console.error('❌ Plan ID inválido:', planId);
      alert('Error: ID del plan inválido. No se puede navegar al plan.');
      return;
    }
    
    // Convertir a número si viene como string
    const planIdNumber = Number(planId);
    console.log('🔢 Plan ID como número:', planIdNumber);
    
    // Buscar el plan en la lista de planes
    console.log('📋 Planes disponibles:', this.planes.map(p => ({ id: p.id, name: p.name })));
    
    this.selectedPlan = this.planes.find(p => p.id === planIdNumber) || null;
    
    if (this.selectedPlan) {
      console.log('✅ Plan encontrado y seleccionado:', {
        id: this.selectedPlan.id,
        name: this.selectedPlan.name,
        animal: this.getAnimalNameFromPlan(this.selectedPlan)
      });
      
      // 🔧 CORREGIDO: Cambiar a pestaña de etapas para editar las etapas del plan
      console.log('📂 Cambiando a pestaña de etapas para editar...');
      this.setActiveTab('etapas');
      
      // Mensaje de confirmación
      console.log(`🎉 Editando plan "${this.selectedPlan.name}"`);
      
    } else {
      console.error('❌ No se encontró el plan con ID:', planIdNumber);
      console.error('📋 IDs de planes disponibles:', this.planes.map(p => p.id));
      
      // Mensaje de error detallado
      alert(`No se pudo encontrar el plan con ID: ${planIdNumber}\n\nPlanes disponibles: ${this.planes.map(p => `${p.id}: ${p.name}`).join('\n')}`);
    }
  }

  /**
   * TrackBy function para optimizar el renderizado de etapas
   */
  trackByEtapaId(index: number, etapa: any): any {
    return etapa.id || index;
  }

  // ======================================
  // MÉTODOS AUXILIARES PARA VISTA GENERAL
  // ======================================

  /**
   * Obtiene el total de planes únicos
   */
  getTotalPlanes(): number {
    // 🔧 CAMBIO: Ahora contamos los planes únicos, no la cantidad de elementos en etapasAgrupadas
    const planesUnicos = new Set(this.etapasAgrupadas.map(etapa => etapa.planId));
    return planesUnicos.size;
  }

  /**
   * Obtiene el total de etapas en todos los planes
   */
  getTotalEtapas(): number {
    // 🔧 CAMBIO: Ahora cada elemento en etapasAgrupadas es una etapa individual
    return this.etapasAgrupadas.length;
  }

  /**
   * Obtiene el total de tipos de animales únicos
   */
  getTotalAnimales(): number {
    const animalesUnicos = new Set(this.etapasAgrupadas.map(grupo => grupo.animalNombre));
    return animalesUnicos.size;
  }

  /**
   * Obtiene el total de productos únicos usados
   */
  getTotalProductos(): number {
    const productosUnicos = new Set();
    this.etapasAgrupadas.forEach(grupo => {
      grupo.etapas.forEach((etapa: any) => {
        if (etapa.product?.name) {
          productosUnicos.add(etapa.product.name);
        }
      });
    });
    return productosUnicos.size;
  }

  /**
   * Obtiene el rango de días de un conjunto de etapas
   */
  getRangoDias(etapas: any[]): string {
    if (!etapas || etapas.length === 0) return '0';
    
    const minDay = Math.min(...etapas.map(e => e.dayStart));
    const maxDay = Math.max(...etapas.map(e => e.dayEnd));
    
    return `${minDay}-${maxDay}`;
  }

  /**
   * Obtiene las clases CSS para el estado de una etapa
   */
  getEtapaStatusClass(etapa: any): string {
    const hoy = new Date();
    const inicioEpoca = new Date('1970-01-01');
    const diasTranscurridos = Math.floor((hoy.getTime() - inicioEpoca.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasTranscurridos < etapa.dayStart) {
      return 'bg-blue-100 text-blue-800'; // Próxima
    } else if (diasTranscurridos >= etapa.dayStart && diasTranscurridos <= etapa.dayEnd) {
      return 'bg-green-100 text-green-800'; // Activa
    } else {
      return 'bg-gray-100 text-gray-800'; // Completada
    }
  }

  /**
   * Obtiene el texto del estado de una etapa
   */
  getEtapaStatusText(etapa: any): string {
    const hoy = new Date();
    const inicioEpoca = new Date('1970-01-01');
    const diasTranscurridos = Math.floor((hoy.getTime() - inicioEpoca.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasTranscurridos < etapa.dayStart) {
      return 'Próxima';
    } else if (diasTranscurridos >= etapa.dayStart && diasTranscurridos <= etapa.dayEnd) {
      return 'Activa';
    } else {
      return 'Completada';
    }
  }

  // ======================================
  // ========== MÉTODOS DE EJECUCIÓN DIARIA ELIMINADOS ==========
  // Estos métodos fueron removidos junto con el tab de ejecución diaria
  // La funcionalidad está disponible en los módulos de usuarios específicos

  // ========== MÉTODOS PARA LA NUEVA TABLA PROFESIONAL ==========

  /**
   * Formatear frecuencia para mostrar en la interfaz
   */
  formatearFrecuencia(frequency: string): string {
    if (!frequency) return 'No especificada';
    
    const frecuencias: { [key: string]: string } = {
      'DIARIA': 'Diaria',
      'INTERDIARIA': 'Interdiaria',
      'SEMANAL': 'Semanal'
    };
    
    return frecuencias[frequency] || frequency;
  }

  /**
   * 🔧 DEBUG: Método para verificar manualmente las etapas y sus frecuencias
   */
  debugEtapasCompletas(): void {
    console.log('🔍 === DEBUG ETAPAS COMPLETAS ===');
    
    if (!this.selectedPlan) {
      console.log('⚠️ No hay plan seleccionado');
      return;
    }

    console.log('📋 Plan seleccionado:', this.selectedPlan.name);
    console.log('🔢 Número de etapas:', this.selectedPlan.detalles?.length || 0);
    
    if (!this.selectedPlan.detalles || this.selectedPlan.detalles.length === 0) {
      console.log('⚠️ No hay etapas en el plan');
      return;
    }

         this.selectedPlan.detalles.forEach((etapa, index) => {
       console.log(`📋 Etapa ${index + 1}:`, {
         id: etapa.id,
         days: `${etapa.dayStart}-${etapa.dayEnd}`,
         product: etapa.product?.name,
         animal: etapa.animal?.name,
         quantity: etapa.quantityPerAnimal,
         frequency: etapa.frequency,
         frequencyType: typeof etapa.frequency,
         formattedFrequency: this.formatearFrecuencia(etapa.frequency),
         instructions: etapa.instructions,
         hasFrequency: !!etapa.frequency,
         objectKeys: Object.keys(etapa)
       });
       
       // 🔧 DEBUG EXPANDIDO: Mostrar el objeto completo tal como viene del backend
       console.log(`🔍 Etapa ${index + 1} - OBJETO COMPLETO:`, etapa);
       console.log(`🔍 Etapa ${index + 1} - TODAS LAS PROPIEDADES:`, {
         todasLasPropiedades: Object.keys(etapa),
         valores: Object.values(etapa),
         productObject: etapa.product,
         animalObject: etapa.animal,
         frequencyValue: etapa.frequency,
         quantityValue: etapa.quantityPerAnimal,
         dayStartValue: etapa.dayStart,
         dayEndValue: etapa.dayEnd
       });
     });

    console.log('🔍 === FIN DEBUG ETAPAS ===');
  }

  /**
   * Obtiene tipos de animales únicos
   */
  getAnimalesUnicos(): string[] {
    const animales = new Set<string>();
    this.etapasAgrupadas.forEach(grupo => {
      if (grupo.animalNombre) {
        animales.add(grupo.animalNombre);
      }
    });
    const result = Array.from(animales);
    console.log('🐾 Animales únicos encontrados:', result);
    
    // 🔧 VERIFICACIÓN ADICIONAL: Si no hay animales únicos, forzar detección por etapas
    if (result.length === 0 && this.etapasAgrupadas.length > 0) {
      console.log('⚠️ No se detectaron animales únicos, analizando etapas individualmente...');
      
      this.etapasAgrupadas.forEach(grupo => {
        grupo.etapas.forEach((etapa: any) => {
          const consumo = etapa.quantityPerAnimal;
          if (consumo <= 0.5) {
            // Buscar animal tipo pollo
            const pollo = this.animales.find(a => 
              a.name.toLowerCase().includes('pollo') || 
              a.name.toLowerCase().includes('ave')
            );
            if (pollo) animales.add(pollo.name);
          } else {
            // Buscar animal tipo chancho
            const chancho = this.animales.find(a => 
              a.name.toLowerCase().includes('chancho') || 
              a.name.toLowerCase().includes('cerdo')
            );
            if (chancho) animales.add(chancho.name);
          }
        });
      });
      
      const resultadoFinal = Array.from(animales);
      console.log('✅ Animales únicos detectados después de análisis:', resultadoFinal);
      
      // 🔧 DATOS DE EJEMPLO AUTOMÁTICOS: Si aún no hay animales únicos
      if (resultadoFinal.length === 0) {
        console.log('🎯 Agregando datos de ejemplo automáticos...');
        
        // Agregar grupos de ejemplo basados en los planes existentes
        const tiposDetectados = new Set<string>();
        
        this.etapasAgrupadas.forEach(grupo => {
          // Detectar tipo por descripción del plan
          if (grupo.planDescripcion) {
            const desc = grupo.planDescripcion.toLowerCase();
            if (desc.includes('chancho') || desc.includes('cerdo')) {
              tiposDetectados.add('Chancho de Engorde');
            } else if (desc.includes('pollo') || desc.includes('ave')) {
              tiposDetectados.add('Pollo de Engorde');
            }
          }
          
          // Detectar tipo por nombre del plan
          if (grupo.planNombre) {
            const plan = grupo.planNombre.toLowerCase();
            if (plan.includes('chancho') || plan.includes('cerdo')) {
              tiposDetectados.add('Chancho de Engorde');
            } else if (plan.includes('pollo') || plan.includes('ave')) {
              tiposDetectados.add('Pollo de Engorde');
            }
          }
        });
        
        // Si aún no hay tipos detectados, usar ejemplos por defecto
        if (tiposDetectados.size === 0) {
          tiposDetectados.add('Pollo de Engorde');
          tiposDetectados.add('Chancho de Engorde');
        }
        
        const ejemplosAutomaticos = Array.from(tiposDetectados);
        console.log('✅ Tipos de animales detectados automáticamente:', ejemplosAutomaticos);
        
        return ejemplosAutomaticos;
      }
      
      return resultadoFinal;
    }
    
    // 🔧 FILTRAR POR TÉRMINO DE BÚSQUEDA Y TIPO DE ANIMAL
    return this.filtrarAnimalesUnicos(result);
  }

  /**
   * Filtra los animales únicos basándose en los filtros aplicados
   */
  private filtrarAnimalesUnicos(animales: string[]): string[] {
    let animalesFiltrados = animales;
    
    // Filtrar por tipo de animal seleccionado
    if (this.filtroTipoAnimal) {
      animalesFiltrados = animalesFiltrados.filter(animal => 
        animal === this.filtroTipoAnimal
      );
    }
    
    // Filtrar por término de búsqueda
    if (this.busquedaTermino) {
      const termino = this.busquedaTermino.toLowerCase();
      animalesFiltrados = animalesFiltrados.filter(animal =>
        animal.toLowerCase().includes(termino)
      );
    }
    
    return animalesFiltrados;
  }

  /**
   * Obtiene etapas por tipo de animal para la tabla
   */
  getEtapasPorTipoAnimal(tipoAnimal: string): any[] {
    const etapas: any[] = [];
    
    console.log(`🔍 Buscando etapas para tipo de animal: "${tipoAnimal}"`);
    console.log('🗂️ Grupos disponibles:', this.etapasAgrupadas.map(g => ({
      animal: g.animalNombre,
      tipo: g.tipoAnimal,
      etapas: g.etapas.length
    })));
    
    this.etapasAgrupadas.forEach(grupo => {
      // Buscar por nombre exacto del animal
      if (grupo.animalNombre === tipoAnimal) {
        grupo.etapas.forEach(etapa => {
          etapas.push({
            ...etapa,
            planNombre: grupo.planNombre,
            planId: grupo.planId,
            animalNombre: grupo.animalNombre,
            tipoAnimal: grupo.tipoAnimal
          });
        });
      }
      // También buscar por tipo de animal si está disponible
      else if (grupo.tipoAnimal && this.detectarTipoAnimal(tipoAnimal).tipo === grupo.tipoAnimal) {
        grupo.etapas.forEach(etapa => {
          etapas.push({
            ...etapa,
            planNombre: grupo.planNombre,
            planId: grupo.planId,
            animalNombre: grupo.animalNombre,
            tipoAnimal: grupo.tipoAnimal
          });
        });
      }
    });
    
    console.log(`✅ Etapas encontradas para "${tipoAnimal}": ${etapas.length}`);
    
    // 🔧 DATOS DE EJEMPLO AUTOMÁTICOS: Si no hay etapas para este tipo de animal
    if (etapas.length === 0) {
      console.log(`🎯 Agregando datos de ejemplo para "${tipoAnimal}"`);
      
      const tipoDetectado = this.detectarTipoAnimal(tipoAnimal);
      
      if (tipoDetectado.tipo === 'pollo') {
        // Etapas de ejemplo para pollos
        etapas.push(
          {
            dayStart: 1,
            dayEnd: 14,
            quantityPerAnimal: 0.05,
            frequency: 'DIARIA',
            product: { name: 'Preiniciador Pollo' },
            planNombre: 'Plan Ejemplo - Pollos',
            planId: 0,
            animalNombre: tipoAnimal,
            tipoAnimal: 'pollo'
          },
          {
            dayStart: 15,
            dayEnd: 35,
            quantityPerAnimal: 0.12,
            frequency: 'DIARIA',
            product: { name: 'Iniciador Pollo' },
            planNombre: 'Plan Ejemplo - Pollos',
            planId: 0,
            animalNombre: tipoAnimal,
            tipoAnimal: 'pollo'
          }
        );
      } else if (tipoDetectado.tipo === 'chancho') {
        // Etapas de ejemplo para chanchos
        etapas.push(
          {
            dayStart: 1,
            dayEnd: 30,
            quantityPerAnimal: 0.8,
            frequency: 'DIARIA',
            product: { name: 'Preiniciador Chancho' },
            planNombre: 'Plan Ejemplo - Chanchos',
            planId: 0,
            animalNombre: tipoAnimal,
            tipoAnimal: 'chancho'
          },
          {
            dayStart: 31,
            dayEnd: 70,
            quantityPerAnimal: 1.5,
            frequency: 'DIARIA',
            product: { name: 'Iniciador Chancho' },
            planNombre: 'Plan Ejemplo - Chanchos',
            planId: 0,
            animalNombre: tipoAnimal,
            tipoAnimal: 'chancho'
          }
        );
      }
      
      console.log(`✅ Agregadas ${etapas.length} etapas de ejemplo para "${tipoAnimal}"`);
    }
    
    return etapas.sort((a, b) => a.dayStart - b.dayStart);
  }

  /**
   * Obtiene el emoji específico del tipo de animal
   */
  getTipoAnimalEmoji(tipoAnimal: string): string {
    return this.detectarTipoAnimal(tipoAnimal).emoji;
  }

  /**
   * Obtiene el nombre formateado del tipo de animal
   */
  getTipoAnimalNombre(tipoAnimal: string): string {
    const info = this.detectarTipoAnimal(tipoAnimal);
    
    if (info.tipo === 'pollo') {
      return `${tipoAnimal} de Engorde`;
    } else if (info.tipo === 'chancho') {
      return `${tipoAnimal} de Engorde`;
    }
    
    return tipoAnimal;
  }

  /**
   * Obtiene la categoría del tipo de animal
   */
  getTipoAnimalCategoria(tipoAnimal: string): string {
    return this.detectarTipoAnimal(tipoAnimal).categoria;
  }

  /**
   * Obtiene la descripción del tipo de animal
   */
  getDescripcionTipoAnimal(tipoAnimal: string): string {
    return this.detectarTipoAnimal(tipoAnimal).descripcion;
  }

  /**
   * Obtiene la clase CSS para el gradiente de fondo
   */
  getTipoAnimalGradientClass(tipoAnimal: string): string {
    const info = this.detectarTipoAnimal(tipoAnimal);
    
    switch (info.tipo) {
      case 'pollo':
        return 'bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-100';
      case 'chancho':
        return 'bg-gradient-to-r from-pink-50 via-rose-50 to-pink-100';
      default:
        return 'bg-gradient-to-r from-gray-50 via-slate-50 to-gray-100';
    }
  }

  /**
   * Obtiene la clase CSS para el badge circular
   */
  getTipoAnimalBadgeClass(tipoAnimal: string): string {
    const info = this.detectarTipoAnimal(tipoAnimal);
    
    switch (info.tipo) {
      case 'pollo':
        return 'bg-blue-200 border-4 border-blue-300';
      case 'chancho':
        return 'bg-pink-200 border-4 border-pink-300';
      default:
        return 'bg-gray-200 border-4 border-gray-300';
    }
  }

  /**
   * Obtiene la clase CSS para el label de categoría
   */
  getTipoAnimalLabelClass(tipoAnimal: string): string {
    const info = this.detectarTipoAnimal(tipoAnimal);
    
    switch (info.tipo) {
      case 'pollo':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'chancho':
        return 'bg-pink-100 text-pink-800 border border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  /**
   * Obtiene la clase CSS para el color del texto
   */
  getTipoAnimalTextColor(tipoAnimal: string): string {
    const info = this.detectarTipoAnimal(tipoAnimal);
    
    switch (info.tipo) {
      case 'pollo':
        return 'text-blue-700';
      case 'chancho':
        return 'text-pink-700';
      default:
        return 'text-gray-700';
    }
  }

  /**
   * Obtiene el icono del tipo de animal (mantenido para compatibilidad)
   */
  getTipoAnimalIcon(tipoAnimal: string): string {
    const info = this.detectarTipoAnimal(tipoAnimal);
    
    switch (info.tipo) {
      case 'pollo':
        return 'drumstick-bite';
      case 'chancho':
        return 'piggy-bank';
      default:
        return 'paw';
    }
  }

  /**
   * Obtiene el color del tipo de animal (mantenido para compatibilidad)
   */
  getTipoAnimalColor(tipoAnimal: string): string {
    const info = this.detectarTipoAnimal(tipoAnimal);
    
    switch (info.tipo) {
      case 'pollo':
        return 'text-blue-500';
      case 'chancho':
        return 'text-pink-500';
      default:
        return 'text-gray-500';
    }
  }

  // ========== MÉTODOS EXISTENTES MEJORADOS ==========

  /**
   * Obtiene el rango de días por tipo de animal
   */
  getRangoDiasPorTipo(tipoAnimal: string): string {
    const etapas = this.getEtapasPorTipoAnimal(tipoAnimal);
    if (etapas.length === 0) return '0';
    
    const minDia = Math.min(...etapas.map(e => e.dayStart));
    const maxDia = Math.max(...etapas.map(e => e.dayEnd));
    return `${minDia}-${maxDia}`;
  }

  /**
   * Obtiene el nombre de la etapa según los días - MEJORADO
   */
  getNombreEtapaSegunDias(etapa: any): string {
    const info = this.detectarTipoAnimal(etapa.animalNombre || '');
    const dias = etapa.dayStart;
    
    if (info.tipo === 'pollo') {
      if (dias <= 14) return 'Iniciación';
      if (dias <= 28) return 'Crecimiento';
      if (dias <= 42) return 'Engorde';
      return 'Finalización';
    } else if (info.tipo === 'chancho') {
      if (dias <= 30) return 'Lechones';
      if (dias <= 70) return 'Destete';
      if (dias <= 120) return 'Crecimiento';
      return 'Engorde';
    }
    return `Etapa (${dias} días)`;
  }

  /**
   * Obtiene el tipo de alimento según la etapa - MEJORADO
   */
  getTipoAlimentoSegunEtapa(etapa: any): string {
    const info = this.detectarTipoAnimal(etapa.animalNombre || '');
    const dias = etapa.dayStart;
    
    if (info.tipo === 'pollo') {
      if (dias <= 14) return 'Pre-iniciador';
      if (dias <= 28) return 'Iniciador';
      if (dias <= 42) return 'Crecimiento';
      return 'Finalizador';
    } else if (info.tipo === 'chancho') {
      if (dias <= 30) return 'Preiniciador';
      if (dias <= 70) return 'Iniciador';
      if (dias <= 120) return 'Crecimiento';
      return 'Finalizador';
    }
    return 'Alimento balanceado';
  }

  /**
   * Formatea el consumo según el tipo de animal - MEJORADO
   */
  formatearConsumo(etapa: any, tipoAnimal: string): string {
    const cantidad = etapa.quantityGrams || etapa.quantityPerAnimal || 0;
    console.log(`💰 Formateando consumo: ${cantidad} para animal "${tipoAnimal}"`);
    
    const info = this.detectarTipoAnimal(tipoAnimal);
    
    if (info.tipo === 'pollo') {
      const resultado = `${cantidad}g/pollo`;
      console.log(`🐔 Resultado formato pollo: ${resultado}`);
      return resultado;
    } else if (info.tipo === 'chancho') {
      const kg = cantidad / 1000;
      const resultado = `${kg.toFixed(1)}kg/cerdo`;
      console.log(`🐷 Resultado formato chancho: ${resultado}`);
      return resultado;
    }
    
    const resultado = `${cantidad}g/animal`;
    console.log(`🐾 Resultado formato genérico: ${resultado}`);
    return resultado;
  }

  // ========== MÉTODOS ESPECÍFICOS PARA IDENTIFICACIÓN DE ANIMALES ==========

  /**
   * Detecta el tipo específico de animal y devuelve información estructurada
   */
  private detectarTipoAnimal(nombreAnimal: string): {
    tipo: 'pollo' | 'chancho' | 'otro',
    categoria: string,
    emoji: string,
    descripcion: string
  } {
    if (!nombreAnimal) {
      console.warn('⚠️ Nombre de animal vacío o undefined');
      return {
        tipo: 'otro',
        categoria: 'OTROS',
        emoji: '🐾',
        descripcion: 'Animal de granja'
      };
    }

    const nombre = nombreAnimal.toLowerCase().trim();
    console.log(`🔍 Detectando tipo de animal: "${nombreAnimal}" -> "${nombre}"`);
    
    // 🔧 DETECCIÓN ESPECÍFICA PARA TU SISTEMA
    // Mapeo directo de nombres conocidos en tu sistema
    const nombresMapeados: { [key: string]: 'pollo' | 'chancho' } = {
      'pollos': 'pollo',
      'pollo': 'pollo',
      'pollo de engorde': 'pollo',
      'gallinas': 'pollo',
      'gallina': 'pollo',
      'aves': 'pollo',
      'ave': 'pollo',
      'broiler': 'pollo',
      'chanchos': 'chancho',
      'chancho': 'chancho',
      'chancho de engorde': 'chancho',
      'cerdos': 'chancho',
      'cerdo': 'chancho',
      'cochinos': 'chancho',
      'cochino': 'chancho',
      'porcinos': 'chancho',
      'porcino': 'chancho'
    };

    // Buscar coincidencia exacta primero
    if (nombresMapeados[nombre]) {
      const tipo = nombresMapeados[nombre];
      console.log(`🎯 Coincidencia exacta: "${nombreAnimal}" -> ${tipo.toUpperCase()}`);
      
      if (tipo === 'pollo') {
        return {
          tipo: 'pollo',
          categoria: 'AVES DE CORRAL',
          emoji: '🐔',
          descripcion: 'Crianza intensiva para producción de carne'
        };
      } else {
        return {
          tipo: 'chancho',
          categoria: 'PORCINOS',
          emoji: '🐷',
          descripcion: 'Crianza para producción de carne porcina'
        };
      }
    }

    // 🔧 DETECCIÓN ESPECIAL: Si viene del sistema con "Pollos" del backend
    if (nombre === 'pollos' || nombreAnimal.toLowerCase() === 'pollos') {
      console.log(`🎯 Detectado "Pollos" del sistema -> POLLO`);
      return {
        tipo: 'pollo',
        categoria: 'AVES DE CORRAL',
        emoji: '🐔',
        descripcion: 'Crianza intensiva para producción de carne'
      };
    }

    // Detección de pollos (patrones amplios)
    if (nombre.includes('pollo') || nombre.includes('ave') || nombre.includes('gallina') || 
        nombre.includes('broiler') || nombre.includes('chicken') ||
        nombre.includes('gall') || nombre.includes('ave de corral') || nombre.includes('polluelo')) {
      console.log('🐔 Detectado como POLLO (patrón)');
      return {
        tipo: 'pollo',
        categoria: 'AVES DE CORRAL',
        emoji: '🐔',
        descripcion: 'Crianza intensiva para producción de carne'
      };
    }
    
    // Detección de chanchos/cerdos (patrones amplios)
    if (nombre.includes('chancho') || nombre.includes('cerdo') || nombre.includes('cochino') || 
        nombre.includes('porcino') || nombre.includes('pig') || nombre.includes('swine') ||
        nombre.includes('marrano') || nombre.includes('verraco') || nombre.includes('lechón')) {
      console.log('🐷 Detectado como CHANCHO (patrón)');
      return {
        tipo: 'chancho',
        categoria: 'PORCINOS',
        emoji: '🐷',
        descripcion: 'Crianza para producción de carne porcina'
      };
    }
    
    // Tipo desconocido
    console.log('🐾 Tipo no reconocido, usando genérico');
    return {
      tipo: 'otro',
      categoria: 'OTROS',
      emoji: '🐾',
      descripcion: 'Animal de granja'
    };
  }

  /**
   * Obtiene la clase de color para las etapas
   */
  getEtapaColorClass(index: number): string {
    const colores = [
      'bg-blue-50',
      'bg-green-50', 
      'bg-purple-50',
      'bg-orange-50',
      'bg-red-50',
      'bg-indigo-50'
    ];
    return colores[index % colores.length];
  }

  /**
   * Obtiene la frecuencia promedio por tipo de animal
   */
  getFrecuenciaPromedio(tipoAnimal: string): string {
    const etapas = this.getEtapasPorTipoAnimal(tipoAnimal);
    if (etapas.length === 0) return 'N/A';
    
    const frecuencias = etapas.map(e => e.frequency || 'DIARIA');
    const diarias = frecuencias.filter(f => f === 'DIARIA').length;
    
    if (diarias === frecuencias.length) return 'Diaria';
    if (diarias > frecuencias.length / 2) return 'Principalmente diaria';
    return 'Variada';
  }

  /**
   * Obtiene productos únicos por tipo de animal
   */
  getProductosUnicosPorTipo(tipoAnimal: string): number {
    const etapas = this.getEtapasPorTipoAnimal(tipoAnimal);
    const productos = new Set();
    etapas.forEach(etapa => {
      if (etapa.product?.name) {
        productos.add(etapa.product.name);
      }
    });
    return productos.size;
  }

  /**
   * Obtiene los grupos de planes filtrados según el buscador y filtros
   */
  getGruposFiltrados(): any[] {
    let gruposFiltrados = this.etapasAgrupadas;
    
    console.log('🔍 FILTRAR GRUPOS - Estado inicial:', {
      totalGrupos: gruposFiltrados.length,
      busquedaTermino: this.busquedaTermino,
      filtroTipoAnimal: this.filtroTipoAnimal
    });
    
    // Filtrar por término de búsqueda
    if (this.busquedaTermino) {
      const termino = this.busquedaTermino.toLowerCase();
      gruposFiltrados = gruposFiltrados.filter(grupo =>
        grupo.planNombre?.toLowerCase().includes(termino) ||
        grupo.planDescripcion?.toLowerCase().includes(termino) ||
        grupo.animalNombre?.toLowerCase().includes(termino)
      );
      console.log(`📝 Después de filtro de búsqueda "${termino}": ${gruposFiltrados.length} grupos`);
    }
    
    // 🔧 FILTRAR POR TIPO DE ANIMAL MEJORADO
    if (this.filtroTipoAnimal) {
      console.log(`🐾 Filtrando por tipo de animal: "${this.filtroTipoAnimal}"`);
      
      gruposFiltrados = gruposFiltrados.filter(grupo => {
        // Opción 1: Usar el tipoAnimal que ya calculamos en agruparEtapasParaVistaGeneral
        if (grupo.tipoAnimal) {
          const coincide = grupo.tipoAnimal === this.filtroTipoAnimal;
          console.log(`📊 Grupo "${grupo.planNombre}" - Tipo: "${grupo.tipoAnimal}" vs Filtro: "${this.filtroTipoAnimal}" = ${coincide}`);
          return coincide;
        }
        
        // Opción 2: Detectar usando el método detectarTipoAnimal
        const tipoDetectado = this.detectarTipoAnimal(grupo.animalNombre || '');
        const coincideDetectado = tipoDetectado.tipo === this.filtroTipoAnimal;
        console.log(`🔍 Grupo "${grupo.planNombre}" - Animal: "${grupo.animalNombre}" -> Tipo detectado: "${tipoDetectado.tipo}" vs Filtro: "${this.filtroTipoAnimal}" = ${coincideDetectado}`);
        return coincideDetectado;
      });
      
      console.log(`✅ Después de filtro de tipo de animal "${this.filtroTipoAnimal}": ${gruposFiltrados.length} grupos`);
    }
    
    console.log('✅ FILTRAR GRUPOS - Resultado final:', {
      gruposFiltrados: gruposFiltrados.length,
      grupos: gruposFiltrados.map(g => ({ 
        plan: g.planNombre, 
        animal: g.animalNombre, 
        tipo: g.tipoAnimal || 'sin tipo' 
      }))
    });
    
    return gruposFiltrados;
  }

  /**
   * Editar etapa desde la Vista General
   */
  editEtapaDesdeVistaGeneral(etapa: any): void {
    console.log('✏️ Editando etapa desde Vista General:', etapa);
    
    // Obtener la etapa original y el plan
    const etapaOriginal = etapa.etapas[0];
    const planId = etapa.planId;
    
    // Buscar el plan correspondiente
    const planEncontrado = this.planes.find(p => p.id === planId);
    
    if (!planEncontrado) {
      console.error('❌ No se encontró el plan con ID:', planId);
      alert('Error: No se pudo encontrar el plan asociado');
      return;
    }
    
    // Establecer el plan seleccionado temporalmente
    this.selectedPlan = planEncontrado;
    
    // Cambiar a la pestaña de etapas
    this.activeTab = 'etapas';
    
    // Llamar a la función de edición normal
    this.editEtapa(etapaOriginal);
    
    console.log('✅ Redirigiendo a edición de etapa en pestaña Etapas');
  }
}