import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, throwError, forkJoin, of, map } from 'rxjs';
import {
  ChanchaGestacion,
  RegistrarNoPrenadaPayload,
  RegistrarPartoPayload,
  RegistroNoPrenada,
  RegistroPartoGestacion
} from './gestacion-chancha.interface';
import { GestacionApiService } from './gestacion-api.service';

@Injectable({ providedIn: 'root' })
export class GestacionStorageService {
  private readonly chanchas$ = new BehaviorSubject<ChanchaGestacion[]>([]);
  private readonly partos$ = new BehaviorSubject<RegistroPartoGestacion[]>([]);
  private readonly noPrenadas$ = new BehaviorSubject<RegistroNoPrenada[]>([]);
  private cargado = false;

  constructor(private api: GestacionApiService) {}

  listar(): Observable<ChanchaGestacion[]> {
    if (!this.cargado) {
      this.refrescarDesdeApi().subscribe();
    }
    return this.chanchas$.asObservable();
  }

  listarPartos(): Observable<RegistroPartoGestacion[]> {
    if (!this.cargado) {
      this.refrescarDesdeApi().subscribe();
    }
    return this.partos$.asObservable();
  }

  listarNoPrenadas(): Observable<RegistroNoPrenada[]> {
    if (!this.cargado) {
      this.refrescarDesdeApi().subscribe();
    }
    return this.noPrenadas$.asObservable();
  }

  obtenerSnapshot(): ChanchaGestacion[] {
    return [...this.chanchas$.value];
  }

  obtenerPartosSnapshot(): RegistroPartoGestacion[] {
    return [...this.partos$.value];
  }

  refrescarDesdeApi(): Observable<ChanchaGestacion[]> {
    return forkJoin({
      gestaciones: this.api.listar(),
      partos: this.api.listarPartos().pipe(catchError(() => of([] as RegistroPartoGestacion[]))),
      noPrenadas: this.api.listarNoPrenadas().pipe(catchError(() => of([] as RegistroNoPrenada[])))
    }).pipe(
      tap(({ gestaciones, partos, noPrenadas }) => {
        this.chanchas$.next(gestaciones);
        this.partos$.next(partos);
        this.noPrenadas$.next(noPrenadas);
        this.cargado = true;
      }),
      map(({ gestaciones }) => gestaciones),
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

  registrarParto(
    gestacionId: string,
    payload: RegistrarPartoPayload
  ): Observable<RegistroPartoGestacion> {
    return this.api.registrarParto(gestacionId, payload).pipe(
      tap(parto => {
        const lista = this.obtenerSnapshot().map(c =>
          c.id === gestacionId ? { ...c, activa: false } : c
        );
        this.chanchas$.next(lista);
        this.partos$.next([parto, ...this.obtenerPartosSnapshot()]);
      })
    );
  }

  actualizarParto(
    partoId: string,
    payload: RegistrarPartoPayload
  ): Observable<RegistroPartoGestacion> {
    return this.api.actualizarParto(partoId, payload).pipe(
      tap(actualizado => {
        const lista = this.obtenerPartosSnapshot();
        const idx = lista.findIndex(p => p.id === partoId || p.id === actualizado.id);
        if (idx >= 0) {
          lista[idx] = actualizado;
        }
        this.partos$.next([...lista]);
      })
    );
  }

  registrarNoPrenada(
    gestacionId: string,
    payload: RegistrarNoPrenadaPayload
  ): Observable<RegistroNoPrenada> {
    return this.api.registrarNoPrenada(gestacionId, payload).pipe(
      tap(reg => {
        const lista = this.obtenerSnapshot().map(c =>
          c.id === gestacionId ? { ...c, activa: false } : c
        );
        this.chanchas$.next(lista);
        this.noPrenadas$.next([reg, ...this.noPrenadas$.value]);
      })
    );
  }

  siguienteNumeroParto(loteId: string, numeroEnLote: number): Observable<number> {
    return this.api.siguienteNumeroParto(loteId, numeroEnLote);
  }

  uploadFoto(file: File): Observable<string> {
    return this.api.uploadFoto(file);
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
