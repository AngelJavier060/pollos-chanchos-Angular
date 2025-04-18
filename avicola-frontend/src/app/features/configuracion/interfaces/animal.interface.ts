export interface Animal {
    id?: number;
    name: string;
    description?: string;
    type?: string;
    breed?: string;
    birthDate?: Date;
    weight?: number;
    status?: 'active' | 'inactive';
    createdAt?: Date;
    updatedAt?: Date;
} 