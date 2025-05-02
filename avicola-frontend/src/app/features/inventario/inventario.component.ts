import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ProductService } from '../../shared/services/product.service';
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
  
  productForm: FormGroup;
  searchForm: FormGroup;
  
  selectedProduct: Product | null = null;
  isLoading = false;
  showForm = false;
  isEditMode = false;
  
  constructor(
    private productService: ProductService,
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
}