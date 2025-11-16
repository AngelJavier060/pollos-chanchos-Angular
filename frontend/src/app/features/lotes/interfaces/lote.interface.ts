import { Race } from '../../configuracion/interfaces/race.interface';
import { Animal } from '../../configuracion/interfaces/animal.interface';

export interface Lote {
  id?: string;  // UUID que viene del backend
  codigo?: string; // Nueva propiedad para el código secuencial amigable
  name: string; // Campo obligatorio para el nombre descriptivo del lote
  quantity: number; // Cantidad actual de animales vivos
  quantityOriginal?: number; // Cantidad original registrada al crear el lote
  birthdate: Date | null;
  cost: number;
  create_date?: Date;
  update_date?: Date;
  fechaCierre?: Date | null; // Fecha en la que el lote quedó en 0 (histórico)
  race: Race;
  // Añadimos animal_id opcional por si necesitas usar la relación directa con Animal
  race_animal_id?: number;
  // Distribución por sexo (solo chanchos)
  maleCount?: number;
  femaleCount?: number;
  malePurpose?: string;   // engorde | reproduccion | venta, etc.
  femalePurpose?: string; // engorde | reproduccion | venta, etc.
}