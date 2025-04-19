import { Animal } from './animal.interface';

export interface Race {
    id?: number;
    name: string;
    animal: Animal;
    create_date?: Date;
    update_date?: Date;
}