import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { MorbilidadService } from './services/morbilidad.service';
import { MorbilidadBackendService, ConvertirMortalidadRequest } from '../../shared/services/morbilidad-backend.service';
import { CausaMortalidad, CAUSAS_MORTALIDAD } from './models/mortalidad.model';
import { RegistroMorbilidad, EstadisticasMorbilidad, Enfermedad, Tratamiento, EstadoEnfermedad, ESTADOS_ENFERMEDAD } from './models/morbilidad.model';

@Component({
  selector: 'app-pollos-morbilidad',
  templateUrl: './pollos-morbilidad.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosMorbilidadComponent implements OnInit, OnDestroy {
  user: User | null = null;
  
  // Variables principales
  lotesPollos: Lote[] = [];
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
  
  // Estadísticas
  estadisticas: any = { // Temporalmente any para evitar errores de compilación
    totalEnfermos: 0,
    enTratamiento: 0,
    recuperados: 0,
    movidosAMortalidad: 0,
    principalesEnfermedades: [],
    eficaciaTratamientos: [],
    costoTotalTratamientos: 0,
    alertas: []
  };
  
  // Opciones predefinidas
  enfermedadesComunes = [
    'Bronquitis Infecciosa',
    'Newcastle',
    'Cólera Aviar',
    'Coccidiosis',
    'Salmonelosis',
    'E. Coli',
    'Estrés Térmico',
    'Problemas Respiratorios',
    'Problemas Digestivos',
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
    'Plumas erizadas',
    'Cojera',
    'Ojos llorosos',
    'Cresta pálida',
    'Convulsiones',
    'Pérdida de peso'
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
    'Anticoccidial'
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
    
    // ✅ VERIFICAR SI ES AUTOREGISTRO DESDE REGISTRO DIARIO
    this.verificarAutoregistro();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Cargar todos los datos necesarios
   */
  cargarDatos(): void {
    this.cargando = true;
    
    // Cargar lotes
    const lotesSub = this.loteService.getLotes().subscribe({
      next: (lotes: Lote[]) => {
        this.lotesPollos = (lotes || []).filter((lote: Lote) => 
          lote?.race?.animal?.name?.toLowerCase().includes('pollo')
        );
      },
      error: (error) => console.error('Error al cargar lotes:', error)
    });
    
    this.subscriptions.add(lotesSub);
    
    // Cargar enfermedades para el dropdown
    const enfermedadesSub = this.morbilidadService.getEnfermedades().subscribe({
      next: (data) => {
        this.enfermedades = data;
      },
      error: (error) => console.error('Error al cargar enfermedades:', error)
    });
    this.subscriptions.add(enfermedadesSub);
    
    const morbilidadSub = this.morbilidadService.getRegistrosMorbilidad().subscribe({
      next: (data) => {
        this.registrosMorbilidad = (data || []).map((r: any) => this.mapRegistroDesdeBackend(r));
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

  /**
   * Calcular estadísticas
   */
  private calcularEstadisticas(): void {
    const registros = this.getRegistrosFiltrados();
    
    this.estadisticas.totalEnfermos = registros.reduce((sum, r) => sum + (r.cantidadEnfermos || 0), 0);
    this.estadisticas.enTratamiento = registros.filter(r => r.estado?.nombre === 'En Tratamiento').length;
    this.estadisticas.recuperados = registros.filter(r => r.estado?.nombre === 'Recuperado').length;
    this.estadisticas.movidosAMortalidad = registros.filter(r => !!r.derivadoAMortalidad).length;
    
    // Calcular principales enfermedades
    const enfermedadesMap = new Map<string, number>();
    registros.forEach(r => {
      const nombreEnfermedad = r.enfermedad?.nombre || 'Sin especificar';
      enfermedadesMap.set(nombreEnfermedad, (enfermedadesMap.get(nombreEnfermedad) || 0) + (r.cantidadEnfermos || 0));
    });

    this.estadisticas.principalesEnfermedades = Array.from(enfermedadesMap.entries())
      .map(([enfermedad, casos]) => ({
        enfermedad,
        casos,
        porcentaje: this.estadisticas.totalEnfermos > 0 ? (casos / this.estadisticas.totalEnfermos) * 100 : 0
      }))
      .sort((a, b) => b.casos - a.casos)
      .slice(0, 5);

    // Calcular eficacia de tratamientos y costo
    const medicamentos = new Map<string, {casos: number, eficacia: number}>();
    let costoTotal = 0;
    registros.forEach(r => {
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

  /**
   * Abrir modal para registrar morbilidad
   */
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
      usuarioRegistro: this.user?.username || '',
      tratamiento: {
        id: 0,
        nombre: 'Inicial',
        descripcion: '',
        duracion: 0,
        efectividad: 0
      }
    };
    this.modalMorbilidadAbierto = true;
  }

  /**
   * Cerrar modal de morbilidad
   */
  cerrarModalMorbilidad(): void {
    this.modalMorbilidadAbierto = false;
    this.loteSeleccionado = null;
    this.nuevoRegistro = {};
  }

  /**
   * Abrir modal para nuevo registro
   */
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
      usuarioRegistro: this.user?.username || '',
      tratamiento: {
        id: 0,
        nombre: 'Inicial',
        descripcion: '',
        duracion: 0,
        efectividad: 0
      }
    };
    this.modalMorbilidadAbierto = true;
  }

  /**
   * Registrar nueva morbilidad
   */
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

    // Resolver loteId numérico para backend si el id del lote es UUID/código
    let loteIdParaBackend: any = Number(String(this.nuevoRegistro.loteId));
    if (isNaN(loteIdParaBackend)) {
      const loteObj = this.lotesPollos.find(l => String(l.id) === String(this.nuevoRegistro.loteId));
      const codigo = loteObj?.codigo || '';
      const digits = (codigo.match(/\d+/g) || []).join('');
      const parsed = Number(digits);
      if (!isNaN(parsed) && parsed > 0) {
        loteIdParaBackend = parsed;
      } else {
        // Si no se puede resolver, dejar como string (backend podría soportarlo)
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
      medicamento: undefined,
      dosisAplicada: undefined,
      fechaInicioTratamiento: undefined,
      fechaFinTratamiento: undefined,
      observacionesVeterinario: this.nuevoRegistro.observaciones || '',
      proximaRevision: undefined,
      costo: undefined,
      requiereAislamiento: !!this.nuevoRegistro.aislado,
      contagioso: (typeof (this.nuevoRegistro as any).contagioso === 'boolean') 
        ? !!(this.nuevoRegistro as any).contagioso 
        : !!enfermedadSeleccionada?.esContagiosa,
      usuarioRegistro: this.user?.username || 'Usuario',
      animalesTratados: Number(this.nuevoRegistro.cantidadEnfermos)
    };

    this.morbilidadService.registrarMorbilidad(payload as any).subscribe({
      next: (nuevoRegistro) => {
        const adaptado = this.mapRegistroDesdeBackend(nuevoRegistro as any);
        this.registrosMorbilidad.unshift(adaptado);
        this.calcularEstadisticas();
        this.cerrarModalMorbilidad();
        console.log('✅ Morbilidad registrada exitosamente:', adaptado);
        alert('Morbilidad registrada exitosamente');
      },
      error: (error) => {
        console.error('Error al registrar morbilidad:', error);
        alert('Error al registrar morbilidad. Por favor, intente de nuevo.');
      }
    });
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
   * Marcar como recuperado (registra costo)
   */
  marcarComoRecuperado(registro: RegistroMorbilidad): void {
    if (!confirm('¿Confirma marcar como RECUPERADO? (No alterará stock del lote)')) return;
    this.cargando = true;
    const input = prompt('Ingrese el costo de recuperación (S/.):', '0');
    if (input === null) { this.cargando = false; return; }
    const costo = Number((input || '0').toString().replace(',', '.'));
    this.morbilidadBackend.marcarComoRecuperado(registro.id!, isNaN(costo) ? undefined : costo).subscribe({
      next: () => {
        alert('✅ Registro marcado como RECUPERADO');
        this.cargarDatos();
      },
      error: (err) => {
        console.error('❌ Error al marcar como recuperado:', err);
        alert('❌ Error al marcar como recuperado');
        this.cargando = false;
      }
    });
  }

  /**
   * Mover a mortalidad (redirige a módulo Mortalidad)
   */
  moverAMortalidad(registro: RegistroMorbilidad): void {
    if (!confirm('¿Confirma mover estos animales a MORTALIDAD?')) return;
    this.cargando = true;
    const causa = (CAUSAS_MORTALIDAD || []).find(c => c.nombre === 'Causa Desconocida');
    const causaId = causa?.id ?? 8;
    const req: ConvertirMortalidadRequest = {
      loteId: String(registro.loteId),
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
        this.router.navigate(['/pollos/mortalidad']);
      },
      error: (err) => {
        console.error('❌ Error al convertir a mortalidad:', err);
        alert('❌ Error al convertir a mortalidad. Puede registrar manualmente en la pantalla de mortalidad.');
        this.cargando = false;
      }
    });
  }

  /**
   * Eliminar registro
   */
  eliminarRegistro(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
      this.morbilidadService.eliminarRegistro(id).subscribe({
        next: () => {
          this.registrosMorbilidad = this.registrosMorbilidad.filter(r => r.id !== id);
          this.calcularEstadisticas();
          console.log('✅ Registro eliminado');
        },
        error: (error) => {
          console.error('Error al eliminar registro:', error);
          alert('Error al eliminar el registro.');
        }
      });
    }
  }

  /**
   * Aplicar filtros
   */
  aplicarFiltros(): void {
    this.calcularEstadisticas();
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtroEstadoId = null;
    this.filtroGravedad = '';
    this.filtroEnfermedad = '';
    this.busquedaLote = '';
    this.aplicarFiltros();
  }

  /**
   * Obtener registros filtrados
   */
  getRegistrosFiltrados(): RegistroMorbilidad[] {
    let registros = [...this.registrosMorbilidad];
    
    if (this.filtroEstadoId) {
      registros = registros.filter(r => r.estado && r.estado.id === this.filtroEstadoId);
    }
    
    if (this.filtroGravedad) {
      registros = registros.filter(r => r.severidad === this.filtroGravedad);
    }
    
    if (this.filtroEnfermedad) {
      const term = this.filtroEnfermedad.toLowerCase();
      registros = registros.filter(r => (r.enfermedad?.nombre || '').toLowerCase().includes(term));
    }
    
    if (this.busquedaLote) {
      registros = registros.filter(r => 
        String(r.loteId).includes(this.busquedaLote) ||
        this.getNombreLote(r.loteId).toLowerCase().includes(this.busquedaLote.toLowerCase())
      );
    }
    
    return registros.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  }

  /**
   * Obtener nombre del lote
   */
  getNombreLote(loteId: string): string {
    const lote = this.lotesPollos.find(l => String(l.id) === loteId);
    return lote ? `Lote ${lote.id} - ${lote.race?.name || 'Sin raza'}` : `Lote ${loteId}`;
  }

  /**
   * Comparar objetos de enfermedad para el select
   */
  compareEnfermedades(e1: Enfermedad, e2: Enfermedad): boolean {
    return e1 && e2 ? e1.id === e2.id : e1 === e2;
  }

  private mapRegistroDesdeBackend(r: any): RegistroMorbilidad {
    const estadoTrat = (r?.estadoTratamiento || '').toString().toUpperCase();
    const gravedadBk = (r?.gravedad || '').toString().toUpperCase();
    const estado = this.mapEstadoTratamiento(estadoTrat);
    const severidad = this.mapGravedad(gravedadBk);

    const fechaReg = r?.fechaRegistro ? new Date(r.fechaRegistro) : new Date();
    const derivadoAMortalidad = estadoTrat === 'MOVIDO_A_MORTALIDAD' ? true : !!r?.derivadoAMortalidad;

    const registroAdaptado: any = {
      ...r,
      fechaRegistro: fechaReg,
      estado,
      severidad,
      derivadoAMortalidad
    };
    return registroAdaptado as RegistroMorbilidad;
  }

  private mapEstadoTratamiento(estadoTrat: string): EstadoEnfermedad {
    const nombre = estadoTrat === 'EN_TRATAMIENTO' ? 'En Tratamiento'
      : estadoTrat === 'RECUPERADO' ? 'Recuperado'
      : estadoTrat === 'MOVIDO_A_MORTALIDAD' ? 'Fallecido'
      : 'En Observación';
    return this.estados.find(e => e.nombre === nombre) || this.estados[1];
  }

  private mapGravedad(gravedad: string): 'leve' | 'moderada' | 'grave' | 'critica' {
    if (gravedad === 'MODERADA') return 'moderada';
    if (gravedad === 'SEVERA') return 'grave';
    if (gravedad === 'CRITICA') return 'critica';
    return 'leve';
  }

  /**
   * Exportar datos
   */
  exportarDatos(): void {
    console.log('🔄 Exportando datos de morbilidad...');
    alert('Funcionalidad de exportación en desarrollo');
  }

  /**
   * Imprimir reporte
   */
  imprimirReporte(): void {
    console.log('🖨️ Generando reporte para impresión...');
    alert('Funcionalidad de impresión en desarrollo');
  }

  /**
   * ✅ VERIFICAR SI ES AUTOREGISTRO DESDE FORMULARIO DIARIO
   */
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
          };
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
        };
        this.modalMorbilidadAbierto = true;
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      }
    });
  }

}
