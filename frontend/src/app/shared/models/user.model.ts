import { ERole } from './role.model';

export interface User {
  id?: number;
  username: string;
  email: string;
  roles?: ERole[];
  active?: boolean;
  token?: string;
  refreshToken?: string;
  name?: string;
  phone?: string;
  profilePicture?: string;
  photoUrl?: string;
  // Campos adicionales para compatibilidad
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterUserDto {
  username: string;
  email: string;
  password: string;
  name?: string;
  phone?: string;
  roles?: ERole[];
  profilePicture?: string;
  photoUrl?: string;
}

export interface UserUpdateDto {
  username?: string;
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  roles?: ERole[];
  active?: boolean;
  profilePicture?: string;
  photoUrl?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}
