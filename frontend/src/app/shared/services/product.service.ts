import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, of } from 'rxjs';
import { Product, ProductFilter, Provider, TypeFood, UnitMeasurement, Animal, Stage, Category } from '../models/product.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  // Actualizado para usar la ruta correcta del backend
  private apiUrl = `${environment.apiUrl}/api/product`;
  private providerUrl = `${environment.apiUrl}/api/provider`;
  private typeFoodUrl = `${environment.apiUrl}/api/typefood`;
  private unitMeasurementUrl = `${environment.apiUrl}/api/unitmeasurement`;
  private animalUrl = `${environment.apiUrl}/api/animal`;
  private stageUrl = `${environment.apiUrl}/api/stage`;
  private categoryUrl = `${environment.apiUrl}/api/category`;
  
  constructor(private http: HttpClient) { }
  
  // Configuración de encabezados HTTP para todas las peticiones
  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    };
  }
  
  // Obtener todos los productos
  getProducts(filter?: ProductFilter): Observable<Product[]> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.name) params = params.set('name', filter.name);
      if (filter.providerId) params = params.set('providerId', filter.providerId.toString());
      if (filter.typeFoodId) params = params.set('typeFoodId', filter.typeFoodId.toString());
      if (filter.animalId) params = params.set('animalId', filter.animalId.toString());
      if (filter.stageId) params = params.set('stageId', filter.stageId.toString());
    }
    
    return this.http.get<Product[]>(this.apiUrl, { params });
  }
  
  // Obtener un producto por ID
  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }
  
  // Obtener categorías
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.categoryUrl);
  }
  
  // Crear un nuevo producto - MEJORADO para buscar un ID de categoría válido
  createProduct(product: Product): Observable<Product> {
    // Crear un objeto simple con solo los datos básicos del producto
    const productData = {
      name: product.name,
      quantity: product.quantity,
      price_unit: product.price_unit,
      number_facture: product.number_facture,
      date_compra: product.date_compra,
      level_min: product.level_min,
      level_max: product.level_max,
      name_stage: '' // Aseguramos que este campo no sea nulo
    };
    
    // Primero buscar una categoría válida
    return this.getCategories().pipe(
      switchMap(categories => {
        // Si hay categorías, usar la primera, de lo contrario usar ID 2
        const categoryId = categories && categories.length > 0 ? categories[0].id : 2;
        
        // URL con los IDs como variables de ruta, usando la categoría encontrada
        const url = `${this.apiUrl}/${product.provider_id}/${product.typeFood_id}/${product.unitMeasurement_id}/${product.animal_id}/${product.stage_id}/${categoryId}`;
        
        console.log('Enviando petición a:', url);
        console.log('Datos del producto:', productData);
        
        // Enviamos la solicitud con el objeto product básico
        return this.http.post<Product>(url, productData);
      })
    );
  }
  
  // Actualizar un producto existente
  updateProduct(product: Product): Observable<Product> {
    return this.http.put<Product>(this.apiUrl, product);
  }
  
  // Eliminar un producto
  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  
  // Servicios para obtener entidades relacionadas
  getProviders(): Observable<Provider[]> {
    return this.http.get<Provider[]>(this.providerUrl);
  }
  
  getTypeFoods(): Observable<TypeFood[]> {
    return this.http.get<TypeFood[]>(this.typeFoodUrl);
  }
  
  getUnitMeasurements(): Observable<UnitMeasurement[]> {
    return this.http.get<UnitMeasurement[]>(this.unitMeasurementUrl);
  }
  
  getAnimals(): Observable<Animal[]> {
    return this.http.get<Animal[]>(this.animalUrl);
  }
  
  getStages(): Observable<Stage[]> {
    return this.http.get<Stage[]>(this.stageUrl);
  }
}