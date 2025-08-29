import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InventarioEventsService {
  // Evento cuando se registra un consumo o cambia el inventario
  private inventarioActualizadoSubject = new Subject<void>();
  inventarioActualizado$: Observable<void> = this.inventarioActualizadoSubject.asObservable();

  anunciarInventarioActualizado(): void {
    this.inventarioActualizadoSubject.next();
  }
}
