export interface Product {
  id: number;
  name: string;
  name_stage?: string;
  quantity: number; // Cambiado a number para coincidir con el backend
  price_unit: number; // Cambiado a number
  number_facture: number; // Cambiado de number_fac a number_facture para coincidir con el backend
  date_compra: Date;
  level_min: number; // Cambiado a number
  level_max: number; // Cambiado a number
  description?: string;
  provider_id?: number;
  typeFood_id?: number;
  unitMeasurement_id?: number;
  animal_id?: number;
  stage_id?: number;
  
  // Propiedades para relaciones (objetos relacionados)
  provider?: Provider;
  typeFood?: TypeFood;
  unitMeasurement?: UnitMeasurement;
  animal?: Animal;
  stage?: Stage;
  category?: Category;
  
  // Para registrar cuando se creó o actualizó el registro
  create_date?: Date;
  update_date?: Date;
}

export interface Provider {
  id: number;
  name: string;
}

export interface TypeFood {
  id: number;
  name: string;
}

export interface UnitMeasurement {
  id: number;
  name: string;
  name_short?: string;
}

export interface Animal {
  id: number;
  name: string;
}

export interface Stage {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

// Catálogo de nombres de productos (admin)
export interface NombreProducto {
  id?: number;
  nombre: string;
  descripcion?: string;
  createDate?: Date;
  updateDate?: Date;
}

// Interface para filtros de búsqueda
export interface ProductFilter {
  name?: string;
  providerId?: number;
  typeFoodId?: number;
  animalId?: number;
  stageId?: number;
}