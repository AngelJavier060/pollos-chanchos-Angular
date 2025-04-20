import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * Abre un diálogo de confirmación
   * @param data Datos para configurar el diálogo
   * @returns Observable que emite true si el usuario confirma, false si cancela
   */
  confirm(data: ConfirmDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data,
      disableClose: true
    });

    return dialogRef.afterClosed();
  }

  /**
   * Método específico para confirmar la continuación de una iteración
   * @returns Observable que emite true si el usuario confirma, false si cancela
   */
  confirmIteracion(): Observable<boolean> {
    return this.confirm({
      title: 'Confirmar iteración',
      message: '¿Desea continuar con la iteración?',
      confirmText: 'Continuar',
      cancelText: 'Cancelar'
    });
  }
}