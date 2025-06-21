import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from './components/navbar/navbar.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DialogService } from './services/dialog.service';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    NavbarComponent,
    ConfirmationDialogComponent
  ],
  exports: [
    NavbarComponent,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    ConfirmationDialogComponent
  ],
  providers: [
    DialogService
  ]
})
export class SharedModule { }
