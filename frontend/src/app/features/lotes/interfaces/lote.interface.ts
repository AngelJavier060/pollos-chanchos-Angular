import { Race } from '../../configuracion/interfaces/race.interface';
import { Animal } from '../../configuracion/interfaces/animal.interface';

export interface Lote {
  id?: number;  // Cambiado de string a number para coincidir con el backend
  codigo?: string; // Nueva propiedad para el código secuencial amigable
  name: string; // Campo obligatorio para el nombre descriptivo del lote
  quantity: number; // Cantidad actual de animales vivos
  quantityOriginal?: number; // Cantidad original registrada al crear el lote
  birthdate: Date | null;
  cost: number;
  create_date?: Date;
  update_date?: Date;
  race: Race;
  // Añadimos animal_id opcional por si necesitas usar la relación directa con Animal
  race_animal_id?: number;
}