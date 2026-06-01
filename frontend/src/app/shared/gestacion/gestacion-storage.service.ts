import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { ChanchaGestacion } from './gestacion-chancha.interface';
import { GestacionApiService } from './gestacion-api.service';

@Injectable({ providedIn: 'root' })
export class GestacionStorageService {
  private readonly chanchas$ = new BehaviorSubject<ChanchaGestacion[]>([]);
  private cargado = false;

  constructor(private api: GestacionApiService) {}

  listar(): Observable<ChanchaGestacion[]> {
    if (!this.cargado) {
      this.refrescarDesdeApi().subscribe();
    }
    return this.chanchas$.asObservable();
  }

  obtenerSnapshot(): ChanchaGestacion[] {
    return [...this.chanchas$.value];
  }

  refrescarDesdeApi(): Observable<ChanchaGestacion[]> {
    return this.api.listar().pipe(
      tap(lista => {
        this.chanchas$.next(lista);
        this.cargado = true;
      }),
      catchError(err => {
        console.error('Error cargando gestaciones:', err);
        return throwError(() => err);
      })
    );
  }

  guardar(chancha: ChanchaGestacion): Observable<ChanchaGestacion> {
    const esEdicion =
      !!chancha.id &&
      !chancha.id.startsWith('tmp-') &&
      !chancha.id.startsWith('ch-') &&
      !chancha.id.startsWith('demo-') &&
      /^\d+$/.test(chancha.id);
    const op = esEdicion
      ? this.api.actualizar(chancha.id, chancha)
      : this.api.crear(chancha);

    return op.pipe(
      tap(guardada => {
        const lista = this.obtenerSnapshot();
        const idx = lista.findIndex(c => c.id === chancha.id || c.id === guardada.id);
        if (idx >= 0) {
          lista[idx] = guardada;
        } else {
          lista.push(guardada);
        }
        this.chanchas$.next([...lista]);
        this.cargado = true;
      })
    );
  }

  eliminar(id: string): Observable<void> {
    return this.api.eliminar(id).pipe(
      tap(() => {
        const lista = this.obtenerSnapshot().filter(c => c.id !== id);
        this.chanchas$.next(lista);
      })
    );
  }

  crearId(): string {
    return `tmp-${Date.now()}`;
  }
}
