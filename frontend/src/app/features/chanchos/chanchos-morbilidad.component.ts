import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { MorbilidadService } from '../pollos/services/morbilidad.service';
import { MorbilidadBackendService, ConvertirMortalidadRequest } from '../../shared/services/morbilidad-backend.service';
import { CausaMortalidad } from '../pollos/models/mortalidad.model';
import { RegistroMorbilidad, Enfermedad, EstadoEnfermedad, ESTADOS_ENFERMEDAD } from '../pollos/models/morbilidad.model';

@Component({
  selector: 'app-chanchos-morbilidad',
  templateUrl: './chanchos-morbilidad.component.html',
  styleUrls: ['./chanchos-dashboard.component.scss']
})
export class ChanchosMorbilidadComponent implements OnInit, OnDestroy {
  user: User | null = null;

  lotesChanchos: Lote[] = [];
  registrosMorbilidad: RegistroMorbilidad[] = [];
  cargando = false;
  enfermedades: Enfermedad[] = [];
  estados: EstadoEnfermedad[] = ESTADOS_ENFERMEDAD;

  // Modales
  modalMorbilidadAbierto = false;
  loteSeleccionado: Lote | null = null;

  // Nuevo registro de morbilidad
  nuevoRegistro: Partial<RegistroMorbilidad> = {};

  // Filtros y búsqueda
  filtroEstadoId: number | null = null;
  filtroGravedad = '';
  filtroEnfermedad = '';
  busquedaLote = '';

  // Estadísticas (placeholder compatible)
  estadisticas: any = {
    totalEnfermos: 0,
    enTratamiento: 0,
    recuperados: 0,
    movidosAMortalidad: 0,
    principalesEnfermedades: [],
    eficaciaTratamientos: [],
    costoTotalTratamientos: 0,
    alertas: []
  };

  // Opciones predefinidas para chanchos
  enfermedadesComunes = [
    'Peste Porcina Clásica',
    'Peste Porcina Africana',
    'Fiebre Aftosa',
    'Enfermedad de Aujeszky',
    'Neumonía Enzoótica',
    'Parvovirosis Porcina',
    'Disentería Porcina',
    'Erisipela Porcina',
    'Infecciones Respiratorias',
    'Problemas Digestivos',
    'Estrés Térmico',
    'Deficiencias Nutricionales',
    'Otras Enfermedades'
  ];

  sintomasDisponibles = [
    'Dificultad respiratoria',
    'Tos frecuente',
    'Secreción nasal',
    'Diarrea',
    'Pérdida de apetito',
    'Letargo',
    'Fiebre alta',
    'Cojera',
    'Lesiones cutáneas',
    'Vómitos',
    'Convulsiones',
    'Pérdida de peso',
    'Debilidad muscular'
  ];

  medicamentosDisponibles = [
    'Antibiótico Amplio Espectro',
    'Enrofloxacina',
    'Amoxicilina',
    'Tetraciclina',
    'Sulfametoxazol',
    'Probióticos',
    'Vitaminas A+D+E',
    'Electrolitos',
    'Antiinflamatorio',
    'Antiparasitario',
    'Complejo B'
  ];

  // Suscripciones
  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private morbilidadService: MorbilidadService,
    private morbilidadBackend: MorbilidadBackendService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
    this.cargarDatos();
    this.verificarAutoregistro();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  cargarDatos(): void {
    this.cargando = true;

    // Primero cargar lotes, luego morbilidad para asegurar filtrado correcto
    const lotesSub = this.loteService.getLotes().subscribe({
      next: (lotes: Lote[]) => {
        this.lotesChanchos = (lotes || []).filter((lote: Lote) =>
          lote.race?.animal?.name?.toLowerCase().includes('chancho') ||
          lote.race?.animal?.name?.toLowerCase().includes('cerdo') ||
          lote.race?.animal?.id === 2
        );
        
        // Después de cargar lotes, cargar morbilidad
        this.cargarMorbilidad();
      },
      error: (error) => {
        console.error('Error al cargar lotes:', error);
        this.cargando = false;
      }
    });
    this.subscriptions.add(lotesSub);

    const enfermedadesSub = this.morbilidadService.getEnfermedades().subscribe({
      next: (data) => (this.enfermedades = data),
      error: (error) => console.error('Error al cargar enfermedades:', error)
    });
    this.subscriptions.add(enfermedadesSub);
  }

  private cargarMorbilidad(): void {
    const morbilidadSub = this.morbilidadService.getRegistrosMorbilidad().subscribe({
      next: (data) => {
        console.log('[Chanchos Morbilidad] Total registros recibidos:', data?.length || 0);

        // Mostrar todos los registros de morbilidad que devuelve el backend (sin filtrar por lote)
        // para garantizar que el historial completo se vea siempre en chanchos.
        this.registrosMorbilidad = (data || [])
          .map((r: any) => this.mapRegistroDesdeBackend(r));

        console.log('[Chanchos Morbilidad] Registros cargados en listado:', this.registrosMorbilidad.length);
        this.calcularEstadisticas();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar registros de morbilidad:', error);
        this.cargando = false;
      }
    });
    this.subscriptions.add(morbilidadSub);
  }

  private calcularEstadisticas(): void {
    const registros = this.getRegistrosFiltrados();
    this.estadisticas.totalEnfermos = registros.reduce((sum: number, r: any) => sum + (r.cantidadEnfermos || 0), 0);
    this.estadisticas.enTratamiento = registros.filter((r: any) => r.estado?.nombre === 'En Tratamiento').length;
    this.estadisticas.recuperados = registros.filter((r: any) => r.estado?.nombre === 'Recuperado').length;
    this.estadisticas.movidosAMortalidad = registros.filter((r: any) => !!r.derivadoAMortalidad).length;

    const enfermedadesMap = new Map<string, number>();
    registros.forEach((r: any) => {
      const nombreEnfermedad = r.enfermedad?.nombre || 'Sin especificar';
      enfermedadesMap.set(nombreEnfermedad, (enfermedadesMap.get(nombreEnfermedad) || 0) + (r.cantidadEnfermos || 0));
    });
    this.estadisticas.principalesEnfermedades = Array.from(enfermedadesMap.entries())
      .map(([enfermedad, casos]) => ({ enfermedad, casos, porcentaje: this.estadisticas.totalEnfermos > 0 ? (casos / this.estadisticas.totalEnfermos) * 100 : 0 }))
      .sort((a, b) => b.casos - a.casos)
      .slice(0, 5);

    // Calcular eficacia de tratamientos y costo
    const medicamentos = new Map<string, {casos: number, eficacia: number}>();
    let costoTotal = 0;
    registros.forEach((r: any) => {
      if (r.tratamiento && r.tratamiento.medicamento) {
        const med = r.tratamiento.medicamento;
        const existing = medicamentos.get(med) || {casos: 0, eficacia: 0};
        const eficacia = r.estado.nombre === 'Recuperado' ? 100 : 
                        r.estado.nombre === 'En Tratamiento' ? 75 : 
                        r.derivadoAMortalidad ? 0 : 50;
        medicamentos.set(med, {
          casos: existing.casos + 1,
          eficacia: ((existing.eficacia * existing.casos) + eficacia) / (existing.casos + 1)
        });
      }
      if(r.tratamiento && r.tratamiento.costo){
        costoTotal += r.tratamiento.costo;
      }
    });

    this.estadisticas.eficaciaTratamientos = Array.from(medicamentos.entries())
      .map(([medicamento, data]) => ({
        medicamento,
        eficacia: data.eficacia,
        casos: data.casos
      }))
      .sort((a, b) => b.eficacia - a.eficacia)
      .slice(0, 5);

    this.estadisticas.costoTotalTratamientos = costoTotal;
  }

  abrirModalMorbilidad(lote: Lote): void {
    this.loteSeleccionado = lote;
    const estadoPorDefecto = this.estados.find(e => e.nombre === 'En Observación');
    this.nuevoRegistro = {
      loteId: lote.id,
      fechaRegistro: new Date(),
      cantidadEnfermos: 1,
      sintomas: [],
      severidad: 'leve',
      estado: estadoPorDefecto,
      aislado: false,
      usuarioRegistro: this.user?.username || ''
    } as any;
    this.modalMorbilidadAbierto = true;
  }

  cerrarModalMorbilidad(): void {
    this.modalMorbilidadAbierto = false;
    this.loteSeleccionado = null;
    this.nuevoRegistro = {};
  }

  abrirModalRegistro(): void {
    const estadoPorDefecto = this.estados.find(e => e.nombre === 'En Observación');
    this.nuevoRegistro = {
      loteId: '',
      fechaRegistro: new Date(),
      cantidadEnfermos: 1,
      sintomas: [],
      severidad: 'leve',
      estado: estadoPorDefecto,
      aislado: false,
      usuarioRegistro: this.user?.username || ''
    } as any;
    this.modalMorbilidadAbierto = true;
  }

  registrarMorbilidad(): void {
    if (!this.nuevoRegistro.loteId || !this.nuevoRegistro.cantidadEnfermos) {
      alert('Por favor complete todos los campos obligatorios: Lote y Cantidad.');
      return;
    }

    const ahora = new Date();
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    const fechaStr = `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
    const horaStr = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;

    let enfermedadSeleccionada: any = null;
    if (this.nuevoRegistro.enfermedad && typeof (this.nuevoRegistro.enfermedad as any) === 'object') {
      enfermedadSeleccionada = this.nuevoRegistro.enfermedad as any;
    } else if (this.nuevoRegistro.enfermedad && typeof (this.nuevoRegistro.enfermedad as any) === 'string') {
      const nombre = String(this.nuevoRegistro.enfermedad);
      enfermedadSeleccionada = (this.enfermedades || []).find(e => e.nombre?.toLowerCase() === nombre.toLowerCase()) || null;
    }
    if (!enfermedadSeleccionada) {
      alert('Seleccione una enfermedad válida.');
      return;
    }

    const gravedadUi = (this.nuevoRegistro.severidad || 'leve').toLowerCase();
    const gravedadEnum = gravedadUi === 'moderada' ? 'MODERADA' : (gravedadUi === 'grave' || gravedadUi === 'critica') ? 'SEVERA' : 'LEVE';

    const estadoNombre = (this.nuevoRegistro.estado?.nombre || 'En Observación').toLowerCase();
    let estadoTratamiento: string = 'EN_OBSERVACION';
    if (estadoNombre.includes('tratamiento')) estadoTratamiento = 'EN_TRATAMIENTO';
    else if (estadoNombre.includes('recuperado')) estadoTratamiento = 'RECUPERADO';
    else if (estadoNombre.includes('mortalidad')) estadoTratamiento = 'MOVIDO_A_MORTALIDAD';

    let loteIdParaBackend: any = Number(String(this.nuevoRegistro.loteId));
    if (isNaN(loteIdParaBackend)) {
      const loteObj = this.lotesChanchos.find(l => String(l.id) === String(this.nuevoRegistro.loteId));
      const codigo = loteObj?.codigo || '';
      const digits = (codigo.match(/\d+/g) || []).join('');
      const parsed = Number(digits);
      if (!isNaN(parsed) && parsed > 0) {
        loteIdParaBackend = parsed;
      } else {
        loteIdParaBackend = String(this.nuevoRegistro.loteId);
      }
    }

    const payload: any = {
      loteId: loteIdParaBackend,
      fecha: fechaStr,
      hora: horaStr,
      cantidadEnfermos: Number(this.nuevoRegistro.cantidadEnfermos),
      enfermedad: { id: enfermedadSeleccionada.id },
      sintomasObservados: (this.nuevoRegistro.sintomas || []).join(', '),
      gravedad: gravedadEnum,
      estadoTratamiento,
      observacionesVeterinario: this.nuevoRegistro.observaciones || '',
      requiereAislamiento: !!this.nuevoRegistro.aislado,
      contagioso: (typeof (this.nuevoRegistro as any).contagioso === 'boolean') ? !!(this.nuevoRegistro as any).contagioso : !!enfermedadSeleccionada?.esContagiosa,
      usuarioRegistro: this.user?.username || 'Usuario',
      animalesTratados: Number(this.nuevoRegistro.cantidadEnfermos)
    };

    this.morbilidadService.registrarMorbilidad(payload as any).subscribe({
      next: (nuevoRegistro) => {
        const adaptado = this.mapRegistroDesdeBackend(nuevoRegistro as any);
        this.registrosMorbilidad.unshift(adaptado);
        this.calcularEstadisticas();
        this.cerrarModalMorbilidad();
        alert('Morbilidad registrada exitosamente');
      },
      error: (error) => {
        console.error('Error al registrar morbilidad:', error);
        alert('Error al registrar morbilidad. Por favor, intente de nuevo.');
      }
    });
  }

  private ajustarLotePorRecuperacion(registro: RegistroMorbilidad): void {
    try {
      const lote = this.lotesChanchos.find(l => String(l.id) === String(registro.loteId));
      if (!lote) return;
      const cantidadActual = Number(lote.quantity || 0);
      const recuperados = Number(registro.cantidadEnfermos || 0);
      if (!isNaN(recuperados) && recuperados > 0) {
        const actualizado: Lote = { ...lote, quantity: cantidadActual + recuperados } as any;
        this.loteService.updateLote(actualizado).subscribe({
          next: () => {},
          error: (e) => console.error('❌ Error actualizando cantidad de lote tras recuperación:', e)
        });
      }
    } catch (e) {
      console.error('❌ Error en ajuste de lote por recuperación:', e);
    }
  }

  marcarComoRecuperado(registro: RegistroMorbilidad): void {
    if (!registro?.id) return;
    if (!confirm('¿Confirma marcar como RECUPERADO?')) return;
    this.cargando = true;
    const input = prompt('Ingrese el costo de recuperación (S/.):', '0');
    if (input === null) { this.cargando = false; return; }
    const costo = Number((input || '0').toString().replace(',', '.'));
    this.morbilidadBackend.marcarComoRecuperado(registro.id!, isNaN(costo) ? undefined : costo).subscribe({
      next: () => {
        alert('✅ Registro marcado como RECUPERADO');
        this.ajustarLotePorRecuperacion(registro);
        this.cargarDatos();
      },
      error: (err) => {
        console.error('❌ Error al marcar como recuperado:', err);
        alert('❌ Error al marcar como recuperado');
        this.cargando = false;
      }
    });
  }

  moverAMortalidad(registro: RegistroMorbilidad): void {
    if (!confirm('¿Confirma mover estos animales a MORTALIDAD?')) return;
    this.cargando = true;
    const causaId = 8; // Causa por defecto
    const rid = String(registro.loteId || '');
    const ridDigits = (rid.match(/\d+/g) || []).join('');
    const loteMatch = this.lotesChanchos.find(l => {
      const codigo = String(l.codigo || '');
      const codigoDigits = (codigo.match(/\d+/g) || []).join('');
      return String(l.id) === rid || codigo === rid || (codigoDigits && (codigoDigits === rid || codigoDigits === ridDigits));
    });
    const req: ConvertirMortalidadRequest = {
      // Preferimos enviar el UUID real si lo encontramos; como fallback, el código del lote
      loteId: loteMatch ? String(loteMatch.id) : (rid || undefined),
      loteCodigo: loteMatch && loteMatch.codigo ? String(loteMatch.codigo) : undefined,
      cantidad: registro.cantidadEnfermos,
      causaId,
      observaciones: `Derivado de morbilidad: ${registro.enfermedad?.nombre || ''}. ${registro.observaciones || ''}`.trim(),
      confirmado: true,
      usuarioRegistro: this.user?.username || 'Sistema'
    };
    this.morbilidadBackend.moverAMortalidad(registro.id!, req).subscribe({
      next: () => {
        alert('✅ Mortalidad registrada desde Morbilidad');
        this.cargarDatos();
        this.router.navigate(['/chanchos/mortalidad']);
      },
      error: (err) => {
        console.error('❌ Error al convertir a mortalidad:', err);
        alert('❌ Error al convertir a mortalidad. Puede registrar manualmente en la pantalla de mortalidad.');
        this.cargando = false;
      }
    });
  }

  eliminarRegistro(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
      this.morbilidadService.eliminarRegistro(id).subscribe({
        next: () => {
          this.registrosMorbilidad = this.registrosMorbilidad.filter(r => r.id !== id);
          this.calcularEstadisticas();
        },
        error: (error) => {
          console.error('Error al eliminar registro:', error);
          alert('Error al eliminar el registro.');
        }
      });
    }
  }

  aplicarFiltros(): void { this.calcularEstadisticas(); }
  limpiarFiltros(): void { this.filtroEstadoId = null; this.filtroGravedad = ''; this.filtroEnfermedad = ''; this.busquedaLote = ''; this.aplicarFiltros(); }

  getRegistrosFiltrados(): RegistroMorbilidad[] {
    let registros = [...this.registrosMorbilidad];
    if (this.filtroEstadoId) registros = registros.filter(r => r.estado && r.estado.id === this.filtroEstadoId);
    if (this.filtroGravedad) registros = registros.filter(r => r.severidad === this.filtroGravedad);
    if (this.filtroEnfermedad) {
      const term = this.filtroEnfermedad.toLowerCase();
      registros = registros.filter(r => (r.enfermedad?.nombre || '').toLowerCase().includes(term));
    }
    if (this.busquedaLote) {
      registros = registros.filter(r => String(r.loteId).includes(this.busquedaLote));
    }
    return registros.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  }

  getNombreLote(loteId: string): string {
    const lote = this.lotesChanchos.find(l => String(l.id) === loteId);
    return lote ? `Lote ${lote.id} - ${lote.race?.name || 'Sin raza'}` : `Lote ${loteId}`;
  }

  compareEnfermedades(e1: Enfermedad, e2: Enfermedad): boolean { return e1 && e2 ? e1.id === e2.id : e1 === e2; }

  private mapRegistroDesdeBackend(r: any): RegistroMorbilidad {
    const estadoTrat = (r?.estadoTratamiento || '').toString().toUpperCase();
    const gravedadBk = (r?.gravedad || '').toString().toUpperCase();
    const estado = this.mapEstadoTratamiento(estadoTrat);
    const severidad = this.mapGravedad(gravedadBk);
    const fechaReg = r?.fechaRegistro ? new Date(r.fechaRegistro) : new Date();
    const derivadoAMortalidad = estadoTrat === 'MOVIDO_A_MORTALIDAD' ? true : !!r?.derivadoAMortalidad;
    return { ...r, fechaRegistro: fechaReg, estado, severidad, derivadoAMortalidad } as any;
  }

  private mapEstadoTratamiento(estadoTrat: string): EstadoEnfermedad {
    const nombre = estadoTrat === 'EN_TRATAMIENTO' ? 'En Tratamiento' :
                   estadoTrat === 'RECUPERADO' ? 'Recuperado' :
                   estadoTrat === 'MOVIDO_A_MORTALIDAD' ? 'Fallecido' : 'En Observación';
    return this.estados.find(e => e.nombre === nombre) || this.estados[1];
  }

  private mapGravedad(gravedad: string): 'leve' | 'moderada' | 'grave' | 'critica' {
    if (gravedad === 'MODERADA') return 'moderada';
    if (gravedad === 'SEVERA') return 'grave';
    if (gravedad === 'CRITICA') return 'critica';
    return 'leve';
  }

  /**
   * Ver detalles de un registro
   */
  verDetalles(registro: RegistroMorbilidad): void {
    console.log('Ver detalles del registro:', registro);
    alert('Funcionalidad de detalles en desarrollo');
  }

  /**
   * Editar registro
   */
  editarRegistro(registro: RegistroMorbilidad): void {
    console.log('Editar registro:', registro);
    alert('Funcionalidad de edición en desarrollo');
  }

  /**
   * Exportar datos
   */
  exportarDatos(): void {
    console.log('🔄 Exportando datos de morbilidad de chanchos...');
    alert('Funcionalidad de exportación en desarrollo');
  }

  /**
   * Imprimir reporte
   */
  imprimirReporte(): void {
    console.log('🖨️ Generando reporte para impresión...');
    alert('Funcionalidad de impresión en desarrollo');
  }

  verificarAutoregistro(): void {
    this.route.queryParams.subscribe(params => {
      const estadoPorDefecto = this.estados.find(e => e.nombre === 'En Observación');
      if (params['autoRegistro'] === 'true' && params['datos']) {
        try {
          const datosAutoregistro = JSON.parse(params['datos']);
          this.nuevoRegistro = {
            loteId: String(datosAutoregistro.loteId),
            cantidadEnfermos: Number(datosAutoregistro.cantidad),
            fechaRegistro: new Date(),
            sintomas: [],
            severidad: 'leve',
            estado: estadoPorDefecto,
            aislado: false,
            observaciones: 'Registro automático desde alimentación.',
            usuarioRegistro: this.user?.username || '',
          } as any;
          this.modalMorbilidadAbierto = true;
          this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        } catch (error) {
          console.error('❌ Error al procesar autoregistro:', error);
        }
        return;
      }
      if (params && (params['loteId'] || params['cantidad'])) {
        this.nuevoRegistro = {
          loteId: String(params['loteId'] || ''),
          cantidadEnfermos: Number(params['cantidad'] || 1),
          fechaRegistro: new Date(),
          sintomas: [],
          severidad: 'leve',
          estado: estadoPorDefecto,
          aislado: false,
          observaciones: 'Registro automático desde alimentación.',
          usuarioRegistro: this.user?.username || '',
        } as any;
        this.modalMorbilidadAbierto = true;
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      }
    });
  }
}
