import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DialogService } from './services/dialog.service';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    MatDialogModule,
    MatButtonModule,
    NavbarComponent,
    ConfirmationDialogComponent
  ],
  exports: [
    NavbarComponent,
    MatDialogModule,
    MatButtonModule,
    ConfirmationDialogComponent
  ],
  providers: [
    DialogService
  ]
})
export class SharedModule { }
