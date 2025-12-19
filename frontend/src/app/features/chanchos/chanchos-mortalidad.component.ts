import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { LoteService } from '../lotes/services/lote.service';
import { User } from '../../shared/models/user.model';
import { Lote } from '../lotes/interfaces/lote.interface';
import { MortalidadService } from '../pollos/services/mortalidad.service';
import { CausaMortalidad, RegistroMortalidad, EstadisticasMortalidad, AlertaMortalidad } from '../pollos/models/mortalidad.model';

@Component({
  selector: 'app-chanchos-mortalidad',
  templateUrl: './chanchos-mortalidad.component.html',
  styleUrls: ['./chanchos-dashboard.component.scss']
})
export class ChanchosMortalidadComponent implements OnInit, OnDestroy {
  user: User | null = null;

  registrosMortalidad: RegistroMortalidad[] = [];
  estadisticas: EstadisticasMortalidad | null = null;
  alertas: AlertaMortalidad[] = [];
  lotes: Lote[] = [];
  causasMortalidad: CausaMortalidad[] = [];
  loteSeleccionado: Lote | null = null;

  mostrarModalRegistro = false;
  mostrarModalEstadisticas = false;
  mostrarModalAlertas = false;
  mostrarModalCausa = false;
  cargando = false;

  registroSeleccionado: RegistroMortalidad | null = null;

  filtroLote: string | null = null;
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  filtroCausa: string = '';

  nuevoRegistro: Partial<RegistroMortalidad> = {
    cantidadMuertos: 1,
    observaciones: '',
    edad: 0,
    ubicacion: '',
    confirmado: false
  };

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private mortalidadService: MortalidadService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
    this.cargarDatosIniciales();
    this.verificarAutoregistro();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  cargarDatosIniciales(): void {
    this.cargando = true;

    const lotesSub = this.loteService.getLotes().subscribe({
      next: (lotes: Lote[]) => {
        this.lotes = lotes.filter((lote: Lote) =>
          (lote.race?.animal?.name?.toLowerCase().includes('chancho') ||
           lote.race?.animal?.name?.toLowerCase().includes('cerdo') ||
           lote.race?.animal?.id === 2) && (Number(lote.quantity) || 0) > 0
        );
        this.cargarRegistrosMortalidad();
      },
      error: (error) => {
        console.error('Error al cargar lotes:', error);
        this.cargando = false;
      }
    });
    this.subscriptions.add(lotesSub);

    const causasSub = this.mortalidadService.getCausas().subscribe({
      next: (data) => (this.causasMortalidad = data),
      error: (error) => console.error('Error al cargar causas de mortalidad:', error)
    });
    this.subscriptions.add(causasSub);
  }

  cargarRegistrosMortalidad(): void {
    const mortalidadSub = this.mortalidadService.getRegistrosMortalidad().subscribe({
      next: (data) => {
        const aceptados = new Set<string>();
        const aceptadosDigitsNorm = new Set<string>();
        const aceptadosDigitsRaw = new Set<string>();
        (this.lotes || []).forEach(l => {
          const idStr = String(l.id);
          aceptados.add(idStr);
          if (l.codigo) {
            const codStr = String(l.codigo);
            aceptados.add(codStr);
            const d = (codStr.match(/\d+/g) || []).join('');
            if (d) {
              aceptados.add(d);
              aceptadosDigitsRaw.add(d);
              const n = parseInt(d, 10);
              if (!isNaN(n)) aceptadosDigitsNorm.add(String(n));
            }
          }
        });
        this.registrosMortalidad = (data || []).filter(r => {
          const val = String(r.loteId || '');
          if (aceptados.has(val)) return true;
          const d = (val.match(/\d+/g) || []).join('');
          if (d && aceptados.has(d)) return true;
          if (d) {
            const n = parseInt(d, 10);
            if (!isNaN(n) && aceptadosDigitsNorm.has(String(n))) return true;
            // Coincidencia por sufijo: ej. '3001' termina en '001'
            for (const ar of Array.from(aceptadosDigitsRaw)) {
              if (!ar) continue;
              if (d.endsWith(ar)) return true;   // 3001 vs 001
              if (ar.endsWith(d)) return true;   // 003 vs 3
            }
          }
          return false;
        });
        this.cargarEstadisticasDesdeBackend();
        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar registros de mortalidad:', error);
        this.registrosMortalidad = [];
        this.cargando = false;
      }
    });
    this.subscriptions.add(mortalidadSub);
  }

  registrarMortalidad(): void {
    if (!this.nuevoRegistro.loteId || !this.nuevoRegistro.cantidadMuertos || this.nuevoRegistro.cantidadMuertos <= 0) {
      alert('Por favor seleccione un lote y especifique la cantidad de animales muertos (> 0)');
      return;
    }

    if (this.nuevoRegistro.causa && (this.nuevoRegistro as any).causa.id) {
      const registroConCausa: any = {
        loteId: this.nuevoRegistro.loteId!,
        cantidadMuertos: this.nuevoRegistro.cantidadMuertos!,
        causaId: (this.nuevoRegistro as any).causa.id,
        observaciones: this.nuevoRegistro.observaciones || '',
        edad: this.nuevoRegistro.edad || 0,
        ubicacion: this.nuevoRegistro.ubicacion || '',
        confirmado: false,
        usuarioRegistro: this.user?.username || 'Desconocido'
      };

      this.mortalidadService.registrarMortalidadConCausa(registroConCausa).subscribe({
        next: (nuevoRegistro) => {
          this.registrosMortalidad.unshift(nuevoRegistro);
          this.cargarEstadisticasDesdeBackend();
          this.recargarLotesActualizados(String(this.nuevoRegistro.loteId!));
          this.cerrarModalRegistro();
          alert('Mortalidad registrada exitosamente');
        },
        error: (error) => {
          console.error('❌ Error al registrar mortalidad con causa:', error);
          alert('Error al registrar mortalidad. Por favor, intente de nuevo.');
        }
      });
    } else {
      const registroSimple: any = {
        loteId: this.nuevoRegistro.loteId!,
        cantidadMuertos: this.nuevoRegistro.cantidadMuertos!,
        observaciones: this.nuevoRegistro.observaciones || '',
        edad: this.nuevoRegistro.edad || 0,
        ubicacion: this.nuevoRegistro.ubicacion || '',
        confirmado: false,
        usuarioRegistro: this.user?.username || 'Desconocido'
      };

      this.mortalidadService.registrarMortalidad(registroSimple).subscribe({
        next: (nuevoRegistro) => {
          this.registrosMortalidad.unshift(nuevoRegistro);
          this.cargarEstadisticasDesdeBackend();
          this.recargarLotesActualizados(String(this.nuevoRegistro.loteId!));
          this.cerrarModalRegistro();
          alert('Mortalidad registrada exitosamente');
        },
        error: (error) => {
          console.error('❌ Error al registrar mortalidad:', error);
          alert('Error al registrar mortalidad. Por favor, intente de nuevo.');
        }
      });
    }
  }

  private recargarLotesActualizados(loteId: string): void {
    const lotesSub = this.loteService.getLotes().subscribe({
      next: (lotes: Lote[]) => {
        const lotesChanchos = lotes.filter((lote: Lote) =>
          (lote.race?.animal?.name?.toLowerCase().includes('chancho') ||
           lote.race?.animal?.name?.toLowerCase().includes('cerdo') ||
           lote.race?.animal?.id === 2) && (Number(lote.quantity) || 0) > 0
        );
        this.lotes = lotesChanchos;
      },
      error: (error) => console.error('❌ Error al recargar lotes:', error)
    });
    this.subscriptions.add(lotesSub);
  }

  getNombreLote(loteId: string): string {
    const val = String(loteId);
    const lote = this.lotes.find(l => 
      String(l.id) === val || 
      String(l.codigo) === val || 
      ((String(l.codigo || '').match(/\d+/g) || []).join('') === (val.match(/\d+/g) || []).join(''))
    );
    return lote ? lote.name : `Lote ${loteId}`;
  }

  getRegistrosFiltrados(): RegistroMortalidad[] {
    let registros = [...this.registrosMortalidad];

    if (this.filtroLote) {
      registros = registros.filter(r => r.loteId === this.filtroLote || String(this.filtroLote) === r.loteId);
    }
    if (this.filtroFechaInicio) {
      const fechaInicio = new Date(this.filtroFechaInicio);
      registros = registros.filter(r => new Date(r.fechaRegistro) >= fechaInicio);
    }
    if (this.filtroFechaFin) {
      const fechaFin = new Date(this.filtroFechaFin);
      registros = registros.filter(r => new Date(r.fechaRegistro) <= fechaFin);
    }
    if (this.filtroCausa) {
      registros = registros.filter(r => r.causa?.nombre?.toLowerCase().includes(this.filtroCausa.toLowerCase()));
    }

    return registros.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  }

  /**
   * Aplicar filtros (placeholder para compatibilidad con el template)
   */
  aplicarFiltros(): void {
    // Los filtros se aplican dinámicamente en getRegistrosFiltrados()
  }

  /**
   * Exportar datos a CSV
   */
  exportarDatos(): void {
    try {
      const registrosFiltrados = this.getRegistrosFiltrados();
      if (registrosFiltrados.length === 0) {
        alert('No hay datos para exportar');
        return;
      }

      const csvContent = this.convertirACSV(registrosFiltrados);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `mortalidad-chanchos-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error al exportar datos:', error);
      alert('Error al exportar datos');
    }
  }

  /**
   * Convertir registros a formato CSV
   */
  private convertirACSV(registros: any[]): string {
    if (registros.length === 0) return '';
    const headers = ['Fecha', 'Lote', 'Cantidad Muertos', 'Observaciones', 'Edad'];
    const csvRows = [headers.join(',')];
    registros.forEach(registro => {
      const row = [
        registro.fechaRegistro,
        this.getNombreLote(registro.loteId),
        registro.cantidadMuertos,
        registro.observaciones,
        registro.edad
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });
    return csvRows.join('\n');
  }

  cargarEstadisticasDesdeBackend(): void {
    const estadisticasSub = this.mortalidadService.getEstadisticas().subscribe({
      next: (data) => {
        this.estadisticas = {
          totalMuertes: data.mortalidadHoy || 0,
          totalLotes: this.lotes.length,
          tasaPromedioMortalidad: 0,
          porcentajeMortalidad: 0,
          causaMasFrecuente: 'Ninguna',
          tendencia: 'estable',
          muertesPorDia: data.tendenciaUltimos7Dias || [],
          muertesPorCausa: data.estadisticasPorCausa || [],
          principalesCausas: data.estadisticasPorCausa || [],
          tendenciaSemanal: data.tendenciaUltimos7Dias || [],
          alertas: this.alertas
        } as any;
      },
      error: (error) => {
        console.error('❌ Error al cargar estadísticas desde el backend:', error);
      }
    });
    this.subscriptions.add(estadisticasSub);
  }

  abrirModalRegistro(lote?: Lote): void {
    this.nuevoRegistro = {
      cantidadMuertos: 1,
      observaciones: '',
      edad: 0,
      ubicacion: '',
      confirmado: false
    };
    // Preseleccionar causa por defecto si existen causas cargadas
    if (this.causasMortalidad && this.causasMortalidad.length > 0) {
      const causaDef = this.causasMortalidad.find(c => (c.nombre || '').toLowerCase().includes('desconocida'))
        || this.causasMortalidad[0];
      (this.nuevoRegistro as any).causa = causaDef;
    }
    if (lote) {
      this.loteSeleccionado = lote;
      this.nuevoRegistro.loteId = String(lote.id);
    } else {
      this.loteSeleccionado = null;
    }
    this.mostrarModalRegistro = true;
  }

  cerrarModalRegistro(): void {
    this.mostrarModalRegistro = false;
    this.nuevoRegistro = {};
    this.loteSeleccionado = null;
  }

  abrirModalCausa(registro: RegistroMortalidad): void {
    this.registroSeleccionado = registro;
    this.mostrarModalCausa = true;
  }

  cerrarModalCausa(): void { this.mostrarModalCausa = false; this.registroSeleccionado = null; }

  guardarCausa(causaId: number): void {
    if (!this.registroSeleccionado?.id) return;
    this.mortalidadService.actualizarRegistro(this.registroSeleccionado.id, { causa: { id: causaId } } as any).subscribe({
      next: () => {
        this.mostrarModalCausa = false;
        this.cargarRegistrosMortalidad();
      },
      error: (err) => console.error('❌ Error al guardar causa:', err)
    });
  }

  calcularPorcentajeEstimado(): number {
    if (!this.loteSeleccionado) return 0;
    const vivos = this.loteSeleccionado.quantity || 0;
    const muertos = Number(this.nuevoRegistro.cantidadMuertos || 0);
    if (vivos === 0) return 0;
    return Math.max(0, Math.min(100, (muertos / vivos) * 100));
  }

  getClaseAlerta(tipo: string): string {
    switch ((tipo || '').toLowerCase()) {
      case 'critica': return 'border-red-300 bg-red-50 text-red-800';
      case 'advertencia': return 'border-yellow-300 bg-yellow-50 text-yellow-800';
      default: return 'border-blue-300 bg-blue-50 text-blue-800';
    }
  }

  verificarAutoregistro(): void {
    this.route.queryParams.subscribe(params => {
      if (!params) return;
      const loteId = params['loteId'];
      const cantidad = Number(params['cantidad'] || 0);
      if (!loteId || !(cantidad > 0)) return;

      // Registro automático sin mostrar formulario
      const payload: any = {
        loteId: String(loteId),
        cantidadMuertos: cantidad,
        observaciones: 'Registro automático desde alimentación.',
        confirmado: false,
        usuarioRegistro: this.user?.username || 'Sistema'
      };
      this.cargando = true;
      this.mortalidadService.registrarMortalidad(payload).subscribe({
        next: (nuevo) => {
          // Refrescar lista y limpiar query params para evitar duplicados si se recarga
          this.cargarRegistrosMortalidad();
          this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
          this.cargando = false;
        },
        error: (err) => {
          console.error('❌ Error en registro automático de mortalidad:', err);
          // Limpiar query params para no reintentar en loop
          this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
          this.cargando = false;
          alert('Ocurrió un error al registrar mortalidad automáticamente.');
        }
      });
    });
  }
}
