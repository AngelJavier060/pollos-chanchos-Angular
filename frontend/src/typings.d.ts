// typings.d.ts - Ayuda a TypeScript a reconocer servicios 
declare module '*/auth.service' { 
  import { Injectable } from '@angular/core'; 
  @Injectable() 
  export class AuthService { 
    public getCurrentUser(): any; 
    public isAuthenticated(): boolean; 
  }
}
