import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  ChanchaGestacion,
  AlertaGestacion,
  StatsGestacion,
  RegistroPartoGestacion,
  RegistroNoPrenada
} from './gestacion-chancha.interface';
import { GestacionStorageService } from './gestacion-storage.service';
import { LoteService } from '../../features/lotes/services/lote.service';
import { Lote } from '../../features/lotes/interfaces/lote.interface';
import { environment } from '../../../environments/environment';
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
  esLoteChancho,
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
  fotoUrl: string;
  activa: boolean;
}

interface FormParto {
  partoId: string | null;
  gestacionId: string;
  nombreChancha: string;
  numeroParto: number;
  fechaParto: string;
  lechonesNacidos: number | null;
  lechonesVivos: number | null;
  lechonesMuertos: number | null;
  observaciones: string;
  fotoUrl: string;
  loteNombre: string;
}

interface FormNoPrenada {
  gestacionId: string;
  nombreChancha: string;
  fechaConfirmacion: string;
  motivo: string;
  observaciones: string;
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

  /** Todas las gestaciones (activas e inactivas) — cupos y selector */
  chanchas: ChanchaGestacion[] = [];
  /** Solo ciclos abiertos — tabla principal */
  chanchasActivas: ChanchaGestacion[] = [];
  /** Ciclos cerrados (parto / no gestante) — solo admin para corregir/reabrir */
  chanchasCerradas: ChanchaGestacion[] = [];
  partos: RegistroPartoGestacion[] = [];
  noPrenadas: RegistroNoPrenada[] = [];
  stats: StatsGestacion = { total: 0, gestando: 0, preParto: 0, paridas: 0 };
  alertas: AlertaGestacion[] = [];
  detalle: ChanchaGestacion | null = null;
  /** Vista de un parto del historial (admin y consulta) */
  partoVista: RegistroPartoGestacion | null = null;
  mostrarModal = false;
  mostrarModalParto = false;
  /** Editar parto del historial — solo admin (modo edicion) */
  mostrarModalEditarParto = false;
  mostrarModalNoPrenada = false;
  form: FormGestacion = this.formularioVacio();
  formParto: FormParto = this.formularioPartoVacio();
  formEditarParto: FormParto = this.formularioPartoVacio();
  formNoPrenada: FormNoPrenada = this.formularioNoPrenadaVacio();
  mensajeError = '';
  mensajeErrorParto = '';
  mensajeErrorEditarParto = '';
  mensajeErrorNoPrenada = '';
  guardandoParto = false;
  guardandoEditarParto = false;
  guardandoNoPrenada = false;
  subiendoFoto = false;
  subiendoFotoParto = false;
  subiendoFotoDetalle = false;
  subiendoFotoEditarParto = false;

  lotes: Lote[] = [];
  lotesCargando = false;
  lotesError = '';
  opcionesChancha: OpcionChanchaLote[] = [];

  readonly fileGestacionInputId = 'gestacion-foto-input';
  readonly filePartoInputId = 'parto-foto-input';
  readonly fileDetalleInputId = 'detalle-foto-input';
  readonly fileEditarPartoInputId = 'editar-parto-foto-input';
  @ViewChild('inputFotoLista') inputFotoLista?: ElementRef<HTMLInputElement>;
  private chanchaFotoLista: ChanchaGestacion | null = null;
  private subs = new Subscription();

  constructor(
    private storage: GestacionStorageService,
    private loteService: LoteService
  ) {}

  get esEdicion(): boolean {
    return this.modo === 'edicion';
  }

  /** Para usar en plantilla */
  etiquetaLote = etiquetaLote;
  formatFechaEs = formatFechaEs;

  get loteSeleccionado(): Lote | undefined {
    return this.lotes.find(l => l.id === this.form.loteId);
  }

  ngOnInit(): void {
    this.subs.add(
      this.storage.listar().subscribe(lista => {
        this.chanchas = lista;
        this.chanchasActivas = lista.filter(c => c.activa !== false);
        this.chanchasCerradas = lista.filter(c => c.activa === false);
        if (this.detalle) {
          const actualizada = lista.find(c => c.id === this.detalle!.id);
          this.detalle = actualizada || null;
        }
        this.actualizarMetricas();
        if (this.mostrarModal) {
          this.actualizarOpcionesChancha();
        }
      })
    );
    this.subs.add(
      this.storage.listarPartos().subscribe(lista => {
        this.partos = lista;
      })
    );
    this.subs.add(
      this.storage.listarNoPrenadas().subscribe(lista => {
        this.noPrenadas = lista;
      })
    );
    this.storage.refrescarDesdeApi().subscribe({
      error: err => console.warn('Gestación API:', err?.message || err)
    });
    if (this.esEdicion) {
      this.cargarLotes();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  cargarLotes(): void {
    this.lotesCargando = true;
    this.lotesError = '';
    this.loteService.getLotes().subscribe({
      next: lotes => {
        // Admin: incluye lotes de chanchos aunque quantity esté en 0 (corrección)
        this.lotes = lotes
          .filter(l => (this.esEdicion ? esLoteChancho(l) && !l.fechaCierre : esLoteElegibleGestacion(l)))
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
      fotoUrl: c.fotoUrl || '',
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

  abrirRegistrarParto(c: ChanchaGestacion, event?: Event): void {
    event?.stopPropagation();
    if (c.activa === false) return;
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    this.formParto = {
      partoId: null,
      gestacionId: c.id,
      nombreChancha: c.nombre,
      numeroParto: c.numeroParto || 1,
      fechaParto: `${yyyy}-${mm}-${dd}`,
      lechonesNacidos: null,
      lechonesVivos: null,
      lechonesMuertos: 0,
      observaciones: '',
      fotoUrl: '',
      loteNombre: c.loteNombre || c.loteCodigo || ''
    };
    this.mensajeErrorParto = '';
    this.mostrarModalParto = true;
  }

  abrirNoPrenada(c: ChanchaGestacion, event?: Event): void {
    event?.stopPropagation();
    if (!this.esEdicion || c.activa === false) return;
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    this.formNoPrenada = {
      gestacionId: c.id,
      nombreChancha: c.nombre,
      fechaConfirmacion: `${yyyy}-${mm}-${dd}`,
      motivo: 'retorno_celo',
      observaciones: ''
    };
    this.mensajeErrorNoPrenada = '';
    this.mostrarModalNoPrenada = true;
  }

  cerrarModalNoPrenada(): void {
    this.mostrarModalNoPrenada = false;
    this.mensajeErrorNoPrenada = '';
    this.guardandoNoPrenada = false;
  }

  guardarNoPrenada(): void {
    const f = this.formNoPrenada;
    if (!f.fechaConfirmacion) {
      this.mensajeErrorNoPrenada = 'La fecha de confirmación es obligatoria.';
      return;
    }
    this.guardandoNoPrenada = true;
    this.storage
      .registrarNoPrenada(f.gestacionId, {
        fechaConfirmacion: f.fechaConfirmacion,
        motivo: f.motivo || 'otro',
        observaciones: f.observaciones.trim() || undefined
      })
      .subscribe({
        next: () => {
          if (this.detalle?.id === f.gestacionId) {
            this.detalle = null;
          }
          this.cerrarModalNoPrenada();
        },
        error: err => {
          this.guardandoNoPrenada = false;
          this.mensajeErrorNoPrenada = err?.message || 'No se pudo registrar.';
        }
      });
  }

  etiquetaMotivo(motivo?: string): string {
    switch (motivo) {
      case 'retorno_celo':
        return 'Retorno a celo';
      case 'ultrasonido_negativo':
        return 'Ultrasonido negativo';
      default:
        return 'Otro';
    }
  }

  verPartoHistorial(p: RegistroPartoGestacion): void {
    this.partoVista = {
      ...p,
      fotoChanchaUrl: p.fotoChanchaUrl || this.fotoChanchaDeParto(p)
    };
  }

  /** Foto de la chancha desde la gestación vinculada (fallback si el API no la trae). */
  fotoChanchaDeParto(p: RegistroPartoGestacion): string {
    if (p.fotoChanchaUrl) return p.fotoChanchaUrl;
    const gest = this.chanchas.find(c => c.id === p.gestacionId);
    if (gest?.fotoUrl) return gest.fotoUrl;
    return (
      this.chanchas.find(
        c => c.loteId === p.loteId && c.numeroEnLote === p.numeroEnLote && !!c.fotoUrl
      )?.fotoUrl || ''
    );
  }

  cerrarPartoVista(): void {
    this.partoVista = null;
  }

  abrirEditarParto(p: RegistroPartoGestacion): void {
    if (!this.esEdicion) return;
    this.formEditarParto = {
      partoId: p.id,
      gestacionId: p.gestacionId,
      nombreChancha: p.nombreChancha,
      numeroParto: p.numeroParto,
      fechaParto: p.fechaParto,
      lechonesNacidos: p.lechonesNacidos,
      lechonesVivos: p.lechonesVivos,
      lechonesMuertos: p.lechonesMuertos ?? 0,
      observaciones: p.observaciones || '',
      fotoUrl: p.fotoUrl || '',
      loteNombre: p.loteNombre || ''
    };
    this.mensajeErrorEditarParto = '';
    this.mostrarModalEditarParto = true;
    this.partoVista = null;
  }

  cerrarModalEditarParto(): void {
    this.mostrarModalEditarParto = false;
    this.mensajeErrorEditarParto = '';
    this.guardandoEditarParto = false;
  }

  guardarEditarParto(): void {
    if (!this.esEdicion) return;
    const f = this.formEditarParto;
    if (!f.partoId) return;

    const error = this.validarCamposParto(f);
    if (error) {
      this.mensajeErrorEditarParto = error;
      return;
    }

    this.guardandoEditarParto = true;
    this.storage
      .actualizarParto(f.partoId, {
        fechaParto: f.fechaParto,
        lechonesNacidos: Number(f.lechonesNacidos),
        lechonesVivos: Number(f.lechonesVivos),
        lechonesMuertos: f.lechonesMuertos == null ? 0 : Number(f.lechonesMuertos),
        observaciones: f.observaciones.trim() || undefined,
        fotoUrl: f.fotoUrl.trim()
      })
      .subscribe({
        next: actualizado => {
          if (this.partoVista?.id === actualizado.id) {
            this.partoVista = actualizado;
          }
          this.cerrarModalEditarParto();
        },
        error: err => {
          this.guardandoEditarParto = false;
          this.mensajeErrorEditarParto = err?.message || 'No se pudo actualizar el parto.';
        }
      });
  }

  onSelectFotoEditarParto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendoFotoEditarParto = true;
    this.mensajeErrorEditarParto = '';
    this.storage.uploadFoto(file).subscribe({
      next: url => {
        this.formEditarParto.fotoUrl = url;
        this.subiendoFotoEditarParto = false;
        input.value = '';
      },
      error: err => {
        this.subiendoFotoEditarParto = false;
        this.mensajeErrorEditarParto = err?.message || 'No se pudo subir la foto.';
        input.value = '';
      }
    });
  }

  quitarFotoEditarParto(): void {
    this.formEditarParto.fotoUrl = '';
  }

  cerrarModalParto(): void {
    this.mostrarModalParto = false;
    this.mensajeErrorParto = '';
    this.guardandoParto = false;
  }

  guardarParto(): void {
    const f = this.formParto;
    const error = this.validarCamposParto(f);
    if (error) {
      this.mensajeErrorParto = error;
      return;
    }

    this.guardandoParto = true;
    this.storage
      .registrarParto(f.gestacionId, {
        fechaParto: f.fechaParto,
        lechonesNacidos: Number(f.lechonesNacidos),
        lechonesVivos: Number(f.lechonesVivos),
        lechonesMuertos: f.lechonesMuertos == null ? 0 : Number(f.lechonesMuertos),
        observaciones: f.observaciones.trim() || undefined,
        fotoUrl: f.fotoUrl.trim() || undefined
      })
      .subscribe({
        next: () => {
          if (this.detalle?.id === f.gestacionId) {
            this.detalle = null;
          }
          this.cerrarModalParto();
        },
        error: err => {
          this.guardandoParto = false;
          this.mensajeErrorParto = err?.message || 'No se pudo registrar el parto.';
        }
      });
  }

  private validarCamposParto(f: FormParto): string | null {
    if (!f.fechaParto) return 'La fecha de parto es obligatoria.';
    const nacidos = Number(f.lechonesNacidos);
    const vivos = Number(f.lechonesVivos);
    const muertos = f.lechonesMuertos == null ? 0 : Number(f.lechonesMuertos);
    if (!Number.isFinite(nacidos) || nacidos < 0) return 'Indique lechones nacidos (0 o más).';
    if (!Number.isFinite(vivos) || vivos < 0) return 'Indique lechones vivos (0 o más).';
    if (!Number.isFinite(muertos) || muertos < 0) return 'Lechones muertos debe ser 0 o más.';
    if (vivos > nacidos) return 'Lechones vivos no puede superar a nacidos.';
    if (muertos > nacidos) return 'Lechones muertos no puede superar a nacidos.';
    if (vivos + muertos > nacidos) return 'La suma de vivos y muertos no puede superar a nacidos.';
    return null;
  }

  onLoteChange(): void {
    const lote = this.loteSeleccionado;
    if (lote) {
      this.form.raza = lote.race?.name || '';
      this.form.numeroEnLote = null;
      this.form.nombre = '';
      this.form.numeroParto = 1;
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
      if (!this.form.id && lote.id) {
        this.storage.siguienteNumeroParto(lote.id, num).subscribe({
          next: n => {
            this.form.numeroParto = n;
          },
          error: () => {
            /* mantener valor actual */
          }
        });
      }
    }
  }

  actualizarOpcionesChancha(): void {
    const lote = this.loteSeleccionado;
    if (!lote?.id) {
      this.opcionesChancha = [];
      return;
    }
    // Admin puede elegir cualquier cupo (corrección); consulta sigue reglas normales
    this.opcionesChancha = construirOpcionesChancha(
      lote,
      this.chanchas,
      this.form.id,
      this.esEdicion
    );
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
    // Solo bloquea disponibilidad fuera del modo admin (admin usa correccionAdmin)
    if (!this.esEdicion && this.form.activa && opcion && !opcion.disponible) {
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
      fotoUrl: this.form.fotoUrl.trim() || undefined,
      loteId: lote.id,
      loteCodigo: lote.codigo,
      loteNombre: (lote.name || '').trim() || lote.codigo,
      numeroEnLote: this.form.numeroEnLote,
      activa: this.form.activa
    };
    this.storage.guardar(chancha, { correccionAdmin: this.esEdicion }).subscribe({
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

  reactivarGestacion(c: ChanchaGestacion, event?: Event): void {
    event?.stopPropagation();
    if (!this.esEdicion) return;
    if (
      !confirm(
        `¿Reabrir ${c.nombre} a gestaciones activas?\nPodrá editar lote/chancha e iniciar o corregir el ciclo.`
      )
    ) {
      return;
    }
    this.storage.reactivar(c.id).subscribe({
      next: () => {
        /* lista se refresca en storage */
      },
      error: err => alert(err?.message || 'No se pudo reactivar.')
    });
  }

  gestacionCerradaDeParto(p: RegistroPartoGestacion): boolean {
    const g = this.chanchas.find(c => c.id === p.gestacionId);
    return !!g && g.activa === false;
  }

  reactivarDesdeParto(p: RegistroPartoGestacion, event?: Event): void {
    event?.stopPropagation();
    const g = this.chanchas.find(c => c.id === p.gestacionId);
    if (!g) {
      alert('No se encontró la gestación vinculada a este parto.');
      return;
    }
    this.reactivarGestacion(g, event);
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
    setTimeout(() => {
      document.getElementById('gestacion-ficha')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  urlFoto(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    const base = environment.apiUrl.replace(/\/$/, '');
    return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  }

  onSelectFotoGestacion(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendoFoto = true;
    this.mensajeError = '';
    this.storage.uploadFoto(file).subscribe({
      next: url => {
        this.form.fotoUrl = url;
        this.subiendoFoto = false;
        input.value = '';
      },
      error: err => {
        this.subiendoFoto = false;
        this.mensajeError = err?.message || 'No se pudo subir la foto.';
        input.value = '';
      }
    });
  }

  onSelectFotoParto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendoFotoParto = true;
    this.mensajeErrorParto = '';
    this.storage.uploadFoto(file).subscribe({
      next: url => {
        this.formParto.fotoUrl = url;
        this.subiendoFotoParto = false;
        input.value = '';
      },
      error: err => {
        this.subiendoFotoParto = false;
        this.mensajeErrorParto = err?.message || 'No se pudo subir la foto del parto.';
        input.value = '';
      }
    });
  }

  onSelectFotoDetalle(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.detalle) return;
    this.subiendoFotoDetalle = true;
    this._guardarFotoChancha(this.detalle, file, () => {
      this.subiendoFotoDetalle = false;
      input.value = '';
    });
  }

  /** Admin y consulta: tomar/subir foto desde la miniatura de la lista. */
  abrirCamaraFotoChancha(c: ChanchaGestacion, event?: Event): void {
    event?.stopPropagation();
    this.chanchaFotoLista = c;
    const el = this.inputFotoLista?.nativeElement;
    if (el) {
      el.value = '';
      el.click();
    }
  }

  onSelectFotoLista(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const chancha = this.chanchaFotoLista;
    if (!file || !chancha) return;
    this._guardarFotoChancha(chancha, file, () => {
      this.chanchaFotoLista = null;
      input.value = '';
    });
  }

  private _guardarFotoChancha(chancha: ChanchaGestacion, file: File, done: () => void): void {
    this.storage.uploadFoto(file).subscribe({
      next: url => {
        const actualizada: ChanchaGestacion = { ...chancha, fotoUrl: url };
        this.storage.guardar(actualizada).subscribe({
          next: guardada => {
            if (this.detalle?.id === guardada.id) {
              this.detalle = guardada;
            }
            done();
          },
          error: err => {
            alert(err?.message || 'No se pudo guardar la foto.');
            done();
          }
        });
      },
      error: err => {
        alert(err?.message || 'No se pudo subir la foto.');
        done();
      }
    });
  }

  quitarFotoForm(): void {
    this.form.fotoUrl = '';
  }

  quitarFotoParto(): void {
    this.formParto.fotoUrl = '';
  }

  textoBannerParto(c: ChanchaGestacion): string {
    const transcurridos = diasTranscurridos(c.fechaInseminacion);
    if (transcurridos > DIAS_GESTACION_TOTAL) return 'LISTO';
    if (transcurridos < 0) return '—';
    const rest = this.restantesDe(c);
    if (rest === 0) return 'HOY';
    return `${rest} DÍAS`;
  }

  partosDeChancha(c: ChanchaGestacion): RegistroPartoGestacion[] {
    if (!c.loteId || c.numeroEnLote == null) return [];
    return this.partos.filter(
      p => p.loteId === c.loteId && p.numeroEnLote === c.numeroEnLote
    );
  }

  noPrenadasDeChancha(c: ChanchaGestacion): RegistroNoPrenada[] {
    if (!c.loteId || c.numeroEnLote == null) return [];
    return this.noPrenadas.filter(
      n => n.loteId === c.loteId && n.numeroEnLote === c.numeroEnLote
    );
  }

  subtituloChancha(c: ChanchaGestacion): string {
    const partes: string[] = [];
    const loteTxt = (c.loteNombre || '').trim() || (c.loteCodigo || '').trim();
    if (loteTxt) {
      partes.push(loteTxt);
    }
    if (c.raza) partes.push(c.raza);
    if (c.numeroParto) partes.push(`Parto #${c.numeroParto}`);
    return partes.join(' · ');
  }

  infoLoteSeleccionado(): string {
    const lote = this.loteSeleccionado;
    if (!lote) return '';
    const vivas = hembrasVivasEnLote(lote);
    const cupos = cuposHembrasLote(lote);
    const libres = this.opcionesChancha.filter(o => o.disponible).length;
    return `${vivas} hembra(s) viva(s) · ${libres} libres de ${cupos} cupos`;
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

  fechaPartoFmt(p: RegistroPartoGestacion): string {
    return formatFechaEs(p.fechaParto);
  }

  etapaIdxDetalle(): number {
    if (!this.detalle) return -1;
    const idx = getEtapaIdx(this.detalle.fechaInseminacion);
    if (idx >= 0) return idx;
    const d = diasTranscurridos(this.detalle.fechaInseminacion);
    if (d > DIAS_GESTACION_TOTAL) return this.etapas.length - 1;
    return -1;
  }

  restantesDe(c: ChanchaGestacion): number {
    return diasRestantes(c.fechaInseminacion);
  }

  textoDiasFaltan(c: ChanchaGestacion): string {
    const transcurridos = diasTranscurridos(c.fechaInseminacion);
    if (transcurridos > DIAS_GESTACION_TOTAL) return 'Listo para parto';
    if (transcurridos < 0) return '—';
    const rest = this.restantesDe(c);
    if (rest === 0) return '¡Hoy!';
    if (rest === 1) return '1 día';
    return `${rest} días`;
  }

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
      return `parto inminente (día ${d} de ${this.diasTotal}) — registre el parto al ocurrir`;
    }
    return 'en pre-parto — preparar jaula de maternidad';
  }

  private actualizarMetricas(): void {
    const activas = this.chanchasActivas;
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
      fotoUrl: '',
      activa: true
    };
  }

  private formularioPartoVacio(): FormParto {
    return {
      partoId: null,
      gestacionId: '',
      nombreChancha: '',
      numeroParto: 1,
      fechaParto: '',
      lechonesNacidos: null,
      lechonesVivos: null,
      lechonesMuertos: 0,
      observaciones: '',
      fotoUrl: '',
      loteNombre: ''
    };
  }

  private formularioNoPrenadaVacio(): FormNoPrenada {
    return {
      gestacionId: '',
      nombreChancha: '',
      fechaConfirmacion: '',
      motivo: 'retorno_celo',
      observaciones: ''
    };
  }
}
