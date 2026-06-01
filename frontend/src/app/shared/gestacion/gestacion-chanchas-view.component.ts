import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  ChanchaGestacion,
  AlertaGestacion,
  StatsGestacion
} from './gestacion-chancha.interface';
import { GestacionStorageService } from './gestacion-storage.service';
import { LoteService } from '../../features/lotes/services/lote.service';
import { Lote } from '../../features/lotes/interfaces/lote.interface';
import {
  ETAPAS_GESTACION,
  DIAS_GESTACION_TOTAL,
  diasTranscurridos,
  formatFechaEs,
  formatFechaDesdeDate,
  fechaPartoEstimada,
  getEtapaIdx,
  getEtapaNombre,
  getEstadoGestacion,
  progresoPorcentaje,
  calcularStats,
  calcularAlertas,
  diasRestantes
} from './gestacion-calculo.util';
import {
  OpcionChanchaLote,
  esLoteElegibleGestacion,
  construirOpcionesChancha,
  resolverNombreChancha,
  etiquetaLote,
  hembrasVivasEnLote,
  cuposHembrasLote
} from './gestacion-lote.helper';

type ModoGestacion = 'edicion' | 'consulta';
type TemaGestacion = 'admin' | 'chanchos';

interface FormGestacion {
  id: string | null;
  loteId: string;
  numeroEnLote: number | null;
  nombre: string;
  raza: string;
  fechaInseminacion: string;
  numeroParto: number;
  observaciones: string;
  activa: boolean;
}

@Component({
  selector: 'app-gestacion-chanchas-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestacion-chanchas-view.component.html',
  styleUrls: ['./gestacion-chanchas-view.component.scss']
})
export class GestacionChanchasViewComponent implements OnInit, OnDestroy {
  @Input() modo: ModoGestacion = 'consulta';
  @Input() tema: TemaGestacion = 'admin';

  readonly etapas = ETAPAS_GESTACION;
  readonly diasTotal = DIAS_GESTACION_TOTAL;

  chanchas: ChanchaGestacion[] = [];
  stats: StatsGestacion = { total: 0, gestando: 0, preParto: 0, paridas: 0 };
  alertas: AlertaGestacion[] = [];
  detalle: ChanchaGestacion | null = null;
  mostrarModal = false;
  form: FormGestacion = this.formularioVacio();
  mensajeError = '';

  lotes: Lote[] = [];
  lotesCargando = false;
  lotesError = '';
  opcionesChancha: OpcionChanchaLote[] = [];

  private sub: Subscription | null = null;

  constructor(
    private storage: GestacionStorageService,
    private loteService: LoteService
  ) {}

  get esEdicion(): boolean {
    return this.modo === 'edicion';
  }

  /** Para usar en plantilla */
  etiquetaLote = etiquetaLote;

  get loteSeleccionado(): Lote | undefined {
    return this.lotes.find(l => l.id === this.form.loteId);
  }

  ngOnInit(): void {
    this.sub = this.storage.listar().subscribe(lista => {
      this.chanchas = lista;
      this.actualizarMetricas();
      if (this.mostrarModal) {
        this.actualizarOpcionesChancha();
      }
    });
    this.storage.refrescarDesdeApi().subscribe({
      error: err => console.warn('Gestación API:', err?.message || err)
    });
    if (this.esEdicion) {
      this.cargarLotes();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  cargarLotes(): void {
    this.lotesCargando = true;
    this.lotesError = '';
    this.loteService.getLotes().subscribe({
      next: lotes => {
        this.lotes = lotes
          .filter(esLoteElegibleGestacion)
          .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
        this.lotesCargando = false;
      },
      error: () => {
        this.lotesError = 'No se pudieron cargar los lotes. Verifique que el backend esté activo.';
        this.lotesCargando = false;
      }
    });
  }

  abrirNueva(): void {
    this.form = this.formularioVacio();
    if (this.lotes.length === 0 && !this.lotesCargando) {
      this.cargarLotes();
    }
    this.actualizarOpcionesChancha();
    this.mensajeError = '';
    this.mostrarModal = true;
  }

  abrirEditar(c: ChanchaGestacion): void {
    this.form = {
      id: c.id,
      loteId: c.loteId || '',
      numeroEnLote: c.numeroEnLote ?? null,
      nombre: c.nombre,
      raza: c.raza || '',
      fechaInseminacion: c.fechaInseminacion,
      numeroParto: c.numeroParto,
      observaciones: c.observaciones || '',
      activa: c.activa !== false
    };
    if (this.lotes.length === 0) {
      this.cargarLotes();
    }
    this.actualizarOpcionesChancha();
    this.mensajeError = '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.mensajeError = '';
    this.opcionesChancha = [];
  }

  onLoteChange(): void {
    const lote = this.loteSeleccionado;
    if (lote) {
      this.form.raza = lote.race?.name || '';
      this.form.numeroEnLote = null;
      this.form.nombre = '';
    }
    this.actualizarOpcionesChancha();
  }

  onNumeroChanchaChange(): void {
    const lote = this.loteSeleccionado;
    const num = this.form.numeroEnLote;
    if (lote && num != null) {
      this.form.nombre = resolverNombreChancha(lote, num);
      if (!this.form.raza) {
        this.form.raza = lote.race?.name || '';
      }
    }
  }

  actualizarOpcionesChancha(): void {
    const lote = this.loteSeleccionado;
    if (!lote?.id) {
      this.opcionesChancha = [];
      return;
    }
    this.opcionesChancha = construirOpcionesChancha(lote, this.chanchas, this.form.id);
  }

  guardar(): void {
    if (!this.form.loteId) {
      this.mensajeError = 'Seleccione un lote.';
      return;
    }
    if (this.form.numeroEnLote == null) {
      this.mensajeError = 'Seleccione el número de chancha (Chancha-01, Chancha-02…).';
      return;
    }
    if (!this.form.fechaInseminacion) {
      this.mensajeError = 'La fecha de inseminación es obligatoria.';
      return;
    }

    const lote = this.loteSeleccionado;
    if (!lote) {
      this.mensajeError = 'Lote no válido.';
      return;
    }

    const opcion = this.opcionesChancha.find(o => o.numero === this.form.numeroEnLote);
    if (this.form.activa && opcion && !opcion.disponible) {
      this.mensajeError = opcion.motivoNoDisponible || 'Esta chancha no está disponible.';
      return;
    }

    const nombre = resolverNombreChancha(lote, this.form.numeroEnLote);
    const chancha: ChanchaGestacion = {
      id: this.form.id || this.storage.crearId(),
      nombre,
      raza: (lote.race?.name || this.form.raza || '').trim() || undefined,
      fechaInseminacion: this.form.fechaInseminacion,
      numeroParto: Math.max(1, Number(this.form.numeroParto) || 1),
      observaciones: this.form.observaciones.trim() || undefined,
      loteId: lote.id,
      loteCodigo: lote.codigo,
      loteNombre: (lote.name || '').trim() || lote.codigo,
      numeroEnLote: this.form.numeroEnLote,
      activa: this.form.activa
    };
    this.storage.guardar(chancha).subscribe({
      next: guardada => {
        if (this.detalle?.id === chancha.id) {
          this.detalle = guardada;
        }
        this.cerrarModal();
      },
      error: err => {
        this.mensajeError = err?.message || 'No se pudo guardar el registro.';
      }
    });
  }

  eliminar(c: ChanchaGestacion, event?: Event): void {
    event?.stopPropagation();
    if (!confirm(`¿Eliminar el registro de ${c.nombre}?`)) return;
    this.storage.eliminar(c.id).subscribe({
      next: () => {
        if (this.detalle?.id === c.id) {
          this.detalle = null;
        }
      },
      error: err => alert(err?.message || 'No se pudo eliminar.')
    });
  }

  verDetalle(c: ChanchaGestacion): void {
    this.detalle = c;
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  subtituloChancha(c: ChanchaGestacion): string {
    const partes: string[] = [];
    const loteTxt = (c.loteNombre || '').trim() || (c.loteCodigo || '').trim();
    if (loteTxt) {
      partes.push(loteTxt);
    }
    if (c.raza) partes.push(c.raza);
    if (c.activa === false) partes.push('Baja');
    return partes.join(' · ');
  }

  infoLoteSeleccionado(): string {
    const lote = this.loteSeleccionado;
    if (!lote) return '';
    const vivas = hembrasVivasEnLote(lote);
    const cupos = cuposHembrasLote(lote);
    return `${vivas} hembra(s) viva(s) de ${cupos} registrada(s) en el lote`;
  }

  diasDe(c: ChanchaGestacion): number {
    return diasTranscurridos(c.fechaInseminacion);
  }

  pctDe(c: ChanchaGestacion): number {
    return progresoPorcentaje(c.fechaInseminacion);
  }

  etapaDe(c: ChanchaGestacion): string {
    return getEtapaNombre(c.fechaInseminacion);
  }

  estadoDe(c: ChanchaGestacion) {
    return getEstadoGestacion(c.fechaInseminacion);
  }

  partoEstimadoDe(c: ChanchaGestacion): string {
    return formatFechaDesdeDate(fechaPartoEstimada(c.fechaInseminacion));
  }

  inseminacionFmt(c: ChanchaGestacion): string {
    return formatFechaEs(c.fechaInseminacion);
  }

  etapaIdxDetalle(): number {
    return this.detalle ? getEtapaIdx(this.detalle.fechaInseminacion) : -1;
  }

  restantesDe(c: ChanchaGestacion): number {
    return diasRestantes(c.fechaInseminacion);
  }

  restantesDetalle(): number {
    return this.detalle ? diasRestantes(this.detalle.fechaInseminacion) : 0;
  }

  /** Texto del contador: "42 días", "¡Hoy!", "Parida", etc. */
  textoDiasFaltan(c: ChanchaGestacion): string {
    const transcurridos = diasTranscurridos(c.fechaInseminacion);
    if (transcurridos > DIAS_GESTACION_TOTAL) return 'Parida';
    if (transcurridos < 0) return '—';
    const rest = this.restantesDe(c);
    if (rest === 0) return '¡Hoy!';
    if (rest === 1) return '1 día';
    return `${rest} días`;
  }

  /** Número grande para el badge (solo si aún gestando) */
  numeroDiasFaltan(c: ChanchaGestacion): number | null {
    const transcurridos = diasTranscurridos(c.fechaInseminacion);
    if (transcurridos < 0 || transcurridos > DIAS_GESTACION_TOTAL) return null;
    return this.restantesDe(c);
  }

  claseContadorDias(c: ChanchaGestacion): string {
    const transcurridos = diasTranscurridos(c.fechaInseminacion);
    if (transcurridos > DIAS_GESTACION_TOTAL) return 'contador-dias contador-dias--parida';
    if (transcurridos < 0) return 'contador-dias contador-dias--pendiente';
    const rest = this.restantesDe(c);
    if (rest <= 7) return 'contador-dias contador-dias--urgente';
    if (rest <= 21) return 'contador-dias contador-dias--proximo';
    return 'contador-dias contador-dias--normal';
  }

  mensajeAlerta(a: AlertaGestacion): string {
    const d = diasTranscurridos(a.chancha.fechaInseminacion);
    if (a.tipo === 'danger') {
      return `parto inminente (día ${d} de ${this.diasTotal})`;
    }
    return 'en pre-parto — preparar jaula de maternidad';
  }

  private actualizarMetricas(): void {
    const activas = this.chanchas.filter(c => c.activa !== false);
    this.stats = calcularStats(activas);
    this.alertas = calcularAlertas(activas);
  }

  private formularioVacio(): FormGestacion {
    return {
      id: null,
      loteId: '',
      numeroEnLote: null,
      nombre: '',
      raza: '',
      fechaInseminacion: '',
      numeroParto: 1,
      observaciones: '',
      activa: true
    };
  }
}
