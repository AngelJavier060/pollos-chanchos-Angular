import { Category } from './category.interface';

export interface Subcategory {
  id?: number;
  name: string;
  description?: string;
  typeFood?: { id: number; name: string };
  // Mantener category para compatibilidad temporal
  category?: { id: number; name: string };
}
