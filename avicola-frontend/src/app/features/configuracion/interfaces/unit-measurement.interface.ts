export interface UnitMeasurement {
    id?: number;
    name: string;
    name_short: string; // Cambiado de 'symbol' a 'name_short' para coincidir con el backend
    create_date?: Date;
    update_date?: Date;
}