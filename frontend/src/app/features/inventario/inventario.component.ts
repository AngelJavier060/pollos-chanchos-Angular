import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ProductService } from '../../shared/services/product.service';
import { AnalisisInventarioService, InventarioAnalisis } from '../../shared/services/analisis-inventario.service';
import { InventarioService, InventarioAlimento, MovimientoInventario } from '../pollos/services/inventario.service';
import { 
  Product, Provider, TypeFood, UnitMeasurement, Animal, Stage 
} from '../../shared/models/product.model';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, HttpClientModule]
})
export class InventarioComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  providers: Provider[] = [];
  typeFoods: TypeFood[] = [];
  unitMeasurements: UnitMeasurement[] = [];
  animals: Animal[] = [];
  stages: Stage[] = [];
  
  // Análisis de inventario
  analisisInventario: InventarioAnalisis | null = null;
  cargandoAnalisis = false;
  
  // Inventario automático con disminución
  inventarioAlimentos: InventarioAlimento[] = [];
  inventariosStockBajo: InventarioAlimento[] = [];
  movimientosSeleccionados: MovimientoInventario[] = [];
  ultimaActualizacion: Date = new Date();
  
  // Movimientos de inventario
  movimientosInventario: MovimientoInventario[] = [];
  cargandoMovimientos = false;
  
  // Vista actual
  vistaActual: 'productos' | 'analisis' | 'inventario-automatico' | 'movimientos' = 'productos';
  
  productForm: FormGroup;
  searchForm: FormGroup;
  
  selectedProduct: Product | null = null;
  isLoading = false;
  showForm = false;
  isEditMode = false;
  
  // Referencia a Math para usarlo en el template
  Math = Math;
  
  constructor(
    private productService: ProductService,
    private analisisService: AnalisisInventarioService,
    private inventarioService: InventarioService,
    private fb: FormBuilder
  ) {
    this.productForm = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.maxLength(45)]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      price_unit: [0, [Validators.required, Validators.min(0)]],
      number_facture: [0],
      date_compra: [null],
      level_min: [0],
      level_max: [0],
      provider_id: [null, [Validators.required]],
      typeFood_id: [null, [Validators.required]],
      unitMeasurement_id: [null, [Validators.required]],
      animal_id: [null, [Validators.required]],
      stage_id: [null, [Validators.required]]
    });
    
    this.searchForm = this.fb.group({
      name: [''],
      providerId: [null],
      typeFoodId: [null],
      animalId: [null],
      stageId: [null]
    });
  }

  ngOnInit(): void {
    this.loadRelatedEntities();
    this.loadProducts();
    this.cargarAnalisisInventario();
    this.cargarInventarioAutomatico();
    
    // ✅ NUEVA FUNCIONALIDAD: Actualizar inventario automáticamente cada 30 segundos
    // cuando se está viendo la vista de inventario automático
    this.setupAutoRefresh();
  }

  /**
   * Configurar actualización automática del inventario
   */
  private setupAutoRefresh(): void {
    // Actualizar cada 30 segundos si estamos en la vista de inventario automático
    setInterval(() => {
      if (this.vistaActual === 'inventario-automatico') {
        console.log('🔄 Auto-refresh: Actualizando inventario automáticamente...');
        this.cargarInventarioAutomatico();
      }
    }, 30000); // 30 segundos
  }
  
  loadProducts(): void {
    this.isLoading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        console.log('Productos cargados:', data);
        this.products = data;
        this.filteredProducts = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      }
    });
  }
  
  loadRelatedEntities(): void {
    this.isLoading = true;
    
    // Cargar proveedores
    this.productService.getProviders().subscribe({
      next: (data) => {
        console.log('Proveedores cargados:', data);
        this.providers = data;
      },
      error: (err) => console.error('Error al cargar proveedores:', err)
    });
    
    // Cargar tipos de alimentos
    this.productService.getTypeFoods().subscribe({
      next: (data) => {
        console.log('Tipos de alimentos cargados:', data);
        this.typeFoods = data;
      },
      error: (err) => console.error('Error al cargar tipos de alimentos:', err)
    });
    
    // Cargar unidades de medida
    this.productService.getUnitMeasurements().subscribe({
      next: (data) => {
        console.log('Unidades de medida cargadas:', data);
        this.unitMeasurements = data;
      },
      error: (err) => console.error('Error al cargar unidades de medida:', err)
    });
    
    // Cargar animales
    this.productService.getAnimals().subscribe({
      next: (data) => {
        console.log('Animales cargados:', data);
        this.animals = data;
      },
      error: (err) => console.error('Error al cargar animales:', err)
    });
    
    // Cargar etapas
    this.productService.getStages().subscribe({
      next: (data) => {
        console.log('Etapas cargadas:', data);
        this.stages = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar etapas:', err);
        this.isLoading = false;
      }
    });
  }
  
  /**
   * Cargar análisis de inventario
   */
  cargarAnalisisInventario(): void {
    this.cargandoAnalisis = true;
    this.analisisService.getAnalisisInventario().subscribe({
      next: (analisis) => {
        this.analisisInventario = analisis;
        this.cargandoAnalisis = false;
        console.log('Análisis de inventario cargado:', analisis);
      },
      error: (error) => {
        console.error('Error al cargar análisis de inventario:', error);
        this.cargandoAnalisis = false;
      }
    });
  }
  
  /**
   * Cambiar entre vistas
   */
  cambiarVista(vista: 'productos' | 'analisis' | 'inventario-automatico' | 'movimientos'): void {
    this.vistaActual = vista;
    
    // Cargar datos específicos según la vista
    switch (vista) {
      case 'analisis':
        if (!this.analisisInventario) {
          this.cargarAnalisisInventario();
        }
        break;
      case 'inventario-automatico':
        this.cargarInventarioAutomatico();
        break;
      case 'movimientos':
        this.cargarMovimientos();
        break;
      case 'productos':
        this.loadProducts();
        break;
    }
  }
  
  /**
   * Obtener indicador de tendencia
   */
  getTendencia(valores: number[]): 'up' | 'down' | 'stable' {
    if (valores.length < 2) return 'stable';
    
    const ultimo = valores[valores.length - 1];
    const penultimo = valores[valores.length - 2];
    
    if (ultimo > penultimo) return 'up';
    if (ultimo < penultimo) return 'down';
    return 'stable';
  }
  
  /**
   * Formatear número con separadores de miles
   */
  formatearNumero(numero: number): string {
    return numero.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  }
  
  /**
   * Obtener clase CSS para el estado del lote
   */
  getClaseEstado(estado: string): string {
    return estado === 'activo' ? 'text-green-600' : 'text-red-600';
  }
  
  /**
   * Obtener color para el rendimiento
   */
  getColorRendimiento(rendimiento: number): string {
    if (rendimiento >= 80) return 'text-green-600';
    if (rendimiento >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  /**
   * Obtener color para la rentabilidad
   */
  getColorRentabilidad(rentabilidad: number): string {
    if (rentabilidad >= 20) return 'text-green-600';
    if (rentabilidad >= 10) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  // ============================================================================
  // MÉTODOS PARA INVENTARIO AUTOMÁTICO CON DISMINUCIÓN
  // ============================================================================
  
  /**
   * Cargar inventario automático con control de stock
   */
  cargarInventarioAutomatico(): void {
    console.log('📦 Cargando inventario automático...');
    
    // Cargar inventarios disponibles
    this.inventarioService.obtenerInventarios().subscribe({
      next: (inventarios) => {
        console.log('✅ Inventarios cargados desde backend:', inventarios);
        console.log('📊 Total inventarios recibidos:', inventarios.length);
        
        // Mostrar detalles de cada inventario con los datos ya calculados por el backend
        inventarios.forEach((inv, index) => {
          console.log(`📦 Inventario ${index + 1}:`, {
            id: inv.id,
            tipoAlimento: inv.tipoAlimento?.name || 'N/A',
            stockActual: inv.cantidadStock,
            stockOriginal: inv.cantidadOriginal,
            totalConsumido: inv.totalConsumido,
            unidadMedida: inv.unidadMedida,
            stockMinimo: inv.stockMinimo
          });
        });
        
        this.inventarioAlimentos = inventarios;
        this.ultimaActualizacion = new Date();
        
        // Si no hay inventarios, mostrar mensaje de ayuda
        if (inventarios.length === 0) {
          console.log('⚠️ No hay inventarios disponibles. Puede necesitar crear datos de ejemplo.');
        } else {
          console.log('🎉 Inventarios con totales calculados por backend asignados correctamente');
        }
      },
      error: (error) => {
        console.error('❌ Error cargando inventarios:', error);
        console.log('💡 Intente crear datos de ejemplo si la base de datos está vacía');
        this.inventarioAlimentos = [];
      }
    });
    
    // Cargar inventarios con stock bajo
    this.inventarioService.obtenerInventariosStockBajo().subscribe({
      next: (stockBajo) => {
        console.log('⚠️ Inventarios con stock bajo:', stockBajo);
        this.inventariosStockBajo = stockBajo;
      },
      error: (error) => {
        console.error('❌ Error cargando stock bajo:', error);
        this.inventariosStockBajo = [];
      }
    });
  }

  /**
   * Crear datos de ejemplo para el inventario (para pruebas)
   */
  crearDatosEjemplo(): void {
    console.log('🔧 Creando datos de ejemplo...');
    
    this.inventarioService.crearDatosEjemplo().subscribe({
      next: (response) => {
        console.log('✅ Datos de ejemplo creados:', response);
        alert('Datos de ejemplo creados exitosamente. Actualizando inventario...');
        
        // Recargar el inventario después de crear los datos
        this.cargarInventarioAutomatico();
      },
      error: (error) => {
        console.error('❌ Error creando datos de ejemplo:', error);
        alert('Error al crear datos de ejemplo. Verifique la consola para más detalles.');
      }
    });
  }
  
  /**
   * Sincronizar inventario con productos reales
   */
  sincronizarConProductosReales(): void {
    console.log('🔄 Sincronizando inventario con productos reales...');
    
    this.inventarioService.sincronizarConProductos().subscribe({
      next: (response) => {
        console.log('✅ Sincronización completada:', response);
        alert('Inventario sincronizado con productos reales exitosamente. Actualizando...');
        
        // Recargar el inventario después de sincronizar
        this.cargarInventarioAutomatico();
      },
      error: (error) => {
        console.error('❌ Error sincronizando inventario:', error);
        alert('Error al sincronizar inventario. Verifique la consola para más detalles.');
      }
    });
  }
  
  /**
   * Ver movimientos de un producto específico
   */
  verMovimientos(inventario: InventarioAlimento): void {
    console.log('📋 Consultando movimientos para:', inventario.tipoAlimento.name);
    
    // En este caso necesitamos los movimientos por tipo de alimento, no por lote
    // Por ahora mostramos la información básica
    this.movimientosSeleccionados = [];
    
    alert(`Producto: ${inventario.tipoAlimento.name}\nStock Actual: ${inventario.cantidadStock} ${inventario.unidadMedida}\nStock Mínimo: ${inventario.stockMinimo} ${inventario.unidadMedida}`);
  }
  
  /**
   * Calcular porcentaje de stock usado
   */
  calcularPorcentajeUsado(inventario: InventarioAlimento): number {
    if (!inventario.cantidadOriginal || inventario.cantidadOriginal === 0) {
      return 0;
    }
    
    const usado = inventario.cantidadOriginal - inventario.cantidadStock;
    return (usado / inventario.cantidadOriginal) * 100;
  }
  
  /**
   * Obtener color del indicador de stock
   */
  getColorStock(inventario: InventarioAlimento): string {
    const porcentaje = (inventario.cantidadStock / inventario.stockMinimo) * 100;
    
    if (porcentaje <= 100) return 'bg-red-500'; // Stock crítico
    if (porcentaje <= 150) return 'bg-yellow-500'; // Stock bajo
    return 'bg-green-500'; // Stock normal
  }
  
  /**
   * Obtener estado del stock
   */
  getEstadoStock(inventario: InventarioAlimento): string {
    if (inventario.cantidadStock <= inventario.stockMinimo) {
      return 'CRÍTICO';
    } else if (inventario.cantidadStock <= inventario.stockMinimo * 1.5) {
      return 'BAJO';
    }
    return 'NORMAL';
  }
  
  searchProducts(): void {
    const filter = this.searchForm.value;
    
    // Si no hay filtros, mostrar todos los productos
    if (!filter.name && !filter.providerId && !filter.typeFoodId && 
        !filter.animalId && !filter.stageId) {
      this.filteredProducts = this.products;
      return;
    }
    
    // Filtrar localmente si ya tenemos los productos cargados
    this.filteredProducts = this.products.filter(product => {
      let matches = true;
      
      if (filter.name && !product.name.toLowerCase().includes(filter.name.toLowerCase())) {
        matches = false;
      }
      
      if (filter.providerId && product.provider?.id !== parseInt(filter.providerId)) {
        matches = false;
      }
      
      if (filter.typeFoodId && product.typeFood?.id !== parseInt(filter.typeFoodId)) {
        matches = false;
      }
      
      if (filter.animalId && product.animal?.id !== parseInt(filter.animalId)) {
        matches = false;
      }
      
      if (filter.stageId && product.stage?.id !== parseInt(filter.stageId)) {
        matches = false;
      }
      
      return matches;
    });
  }
  
  openForm(isEdit: boolean = false, product?: Product): void {
    this.isEditMode = isEdit;
    this.showForm = true;
    
    if (isEdit && product) {
      this.selectedProduct = product;
      this.productForm.patchValue({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        price_unit: product.price_unit,
        number_facture: product.number_facture,
        date_compra: product.date_compra ? new Date(product.date_compra).toISOString().split('T')[0] : null,
        level_min: product.level_min,
        level_max: product.level_max,
        provider_id: product.provider?.id || product.provider_id,
        typeFood_id: product.typeFood?.id || product.typeFood_id,
        unitMeasurement_id: product.unitMeasurement?.id || product.unitMeasurement_id,
        animal_id: product.animal?.id || product.animal_id,
        stage_id: product.stage?.id || product.stage_id
      });
    } else {
      this.selectedProduct = null;
      this.productForm.reset();
    }
  }
  
  closeForm(): void {
    this.showForm = false;
    this.productForm.reset();
    this.selectedProduct = null;
  }
  
  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      console.log('Formulario inválido:', this.productForm.value);
      console.log('Errores:', this.getFormValidationErrors());
      return;
    }
    
    const productData = this.productForm.value;
    
    // Verificar datos críticos antes de enviar
    if (!productData.name || productData.name.trim() === '') {
      console.error('El nombre del producto es obligatorio');
      alert('Por favor, ingrese un nombre para el producto');
      return;
    }
    
    this.isLoading = true;
    
    if (this.isEditMode && this.selectedProduct) {
      // Para editar, se necesita el ID del producto
      productData.id = this.selectedProduct.id;
      
      // Asegurarse de que los tipos de datos son correctos
      this.convertFormDataTypes(productData);
      
      this.productService.updateProduct(productData).subscribe({
        next: () => {
          this.loadProducts();
          this.closeForm();
        },
        error: (err) => {
          console.error('Error al actualizar producto', err);
          this.isLoading = false;
          alert('Error al actualizar producto: ' + (err.error || 'Ocurrió un error inesperado'));
        }
      });
    } else {
      // Asegurarse de que los tipos de datos son correctos
      this.convertFormDataTypes(productData);
      
      console.log('Enviando producto:', productData);
      
      this.productService.createProduct(productData).subscribe({
        next: () => {
          this.loadProducts();
          this.closeForm();
        },
        error: (err) => {
          console.error('Error al crear producto', err);
          this.isLoading = false;
          alert('Error al crear producto: ' + (err.error || 'Ocurrió un error inesperado'));
        }
      });
    }
  }
  
  // Método para asegurar los tipos de datos correctos antes de enviar al backend
  convertFormDataTypes(product: any): void {
    product.quantity = Number(product.quantity);
    product.price_unit = Number(product.price_unit);
    product.number_facture = Number(product.number_facture);
    product.level_min = Number(product.level_min);
    product.level_max = Number(product.level_max);
    product.provider_id = Number(product.provider_id);
    product.typeFood_id = Number(product.typeFood_id);
    product.unitMeasurement_id = Number(product.unitMeasurement_id);
    product.animal_id = Number(product.animal_id);
    product.stage_id = Number(product.stage_id);
    
    // Si la fecha viene como string, convertirla a Date
    if (product.date_compra && typeof product.date_compra === 'string') {
      product.date_compra = new Date(product.date_compra);
    }
  }
  
  // Método auxiliar para depuración de errores de validación
  getFormValidationErrors() {
    const result: any = {};
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      if (control && control.errors) {
        result[key] = control.errors;
      }
    });
    return result;
  }
  
  deleteProduct(id: number): void {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.isLoading = true;
      this.productService.deleteProduct(id).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err) => {
          console.error('Error al eliminar producto', err);
          this.isLoading = false;
        }
      });
    }
  }
  
  // Helpers para mostrar nombres en lugar de IDs - actualizados para manejar valores indefinidos
  getProviderName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const provider = this.providers.find(p => p.id === id);
    return provider ? provider.name : 'No disponible';
  }
  
  getTypeFoodName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const typeFood = this.typeFoods.find(t => t.id === id);
    return typeFood ? typeFood.name : 'No disponible';
  }
  
  getUnitMeasurementName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const unit = this.unitMeasurements.find(u => u.id === id);
    return unit ? unit.name : 'No disponible';
  }
  
  getAnimalName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const animal = this.animals.find(a => a.id === id);
    return animal ? animal.name : 'No disponible';
  }
  
  getStageName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const stage = this.stages.find(s => s.id === id);
    return stage ? stage.name : 'No disponible';
  }
  
  resetFilters(): void {
    this.searchForm.reset();
    this.filteredProducts = this.products;
  }

  /**
   * Calcular porcentaje de stock disponible
   */
  calcularPorcentajeStock(inventario: InventarioAlimento): number {
    const porcentaje = (inventario.cantidadStock / (inventario.cantidadOriginal || inventario.cantidadStock || 1)) * 100;
    return Math.min(100, Math.round(porcentaje));
  }

  /**
   * Contar inventarios por estado
   */
  contarInventariosPorEstado(estado: string): number {
    return this.inventarioAlimentos.filter(inv => this.getEstadoStock(inv) === estado).length;
  }

  /**
   * Cargar movimientos de inventario
   */
  cargarMovimientos(): void {
    this.cargandoMovimientos = true;
    console.log('🔄 Cargando movimientos de inventario...');
    
    this.inventarioService.obtenerMovimientos().subscribe({
      next: (movimientos) => {
        console.log('✅ Movimientos cargados:', movimientos);
        this.movimientosInventario = movimientos;
        this.cargandoMovimientos = false;
      },
      error: (error) => {
        console.error('❌ Error cargando movimientos:', error);
        this.cargandoMovimientos = false;
      }
    });
  }

  /**
   * Contar movimientos por tipo
   */
  contarMovimientosPorTipo(tipo: string): number {
    return this.movimientosInventario.filter(mov => mov.tipoMovimiento === tipo).length;
  }

  /**
   * Contar lotes únicos
   */
  contarLotesUnicos(): number {
    const lotes = new Set(this.movimientosInventario
      .filter(mov => mov.loteId)
      .map(mov => mov.loteId));
    return lotes.size;
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: string | Date): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Formatear hora para mostrar
   */
  formatearHora(fecha: string | Date): string {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}