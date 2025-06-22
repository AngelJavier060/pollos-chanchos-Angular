import { NgModule } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { ReactiveFormsModule } from '@angular/forms'; 
// import { NavbarComponent } from './components/navbar/navbar.component'; 
import { MatDialogModule } from '@angular/material/dialog'; 
import { MatButtonModule } from '@angular/material/button'; 
import { DialogService } from './services/dialog.service'; 
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component'; 
 
/** 
 * Módulo compartido actualizado para Angular 17+ 
 * Los componentes standalone no deben ser importados en el módulo, 
 * sino usados directamente en los componentes que los necesiten. 
 */ 
@NgModule({ 
  imports: [ 
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule, 
    MatDialogModule, 
    MatButtonModule, 
    // Los componentes standalone no deben importarse aquí 
    // NavbarComponent, 
    // ConfirmationDialogComponent 
  ], 
  exports: [ 
    // Los componentes standalone no se exportan desde módulos 
    // NavbarComponent, 
    ReactiveFormsModule, 
    MatDialogModule, 
    MatButtonModule, 
    // ConfirmationDialogComponent 
  ], 
  providers: [ 
    DialogService 
  ] 
}) 
export class SharedModule { } 
