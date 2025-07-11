import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { Lote } from '../lotes/interfaces/lote.interface';

// Interface para registros de morbilidad
export interface RegistroMorbilidad {
  id?: number;
  loteId: number;
  fecha: string;
  hora: string;
  cantidadEnfermos: number;
  enfermedad: string;
  sintomasObservados: string[];
  gravedad: 'leve' | 'moderada' | 'severa';
  estadoTratamiento: 'en_tratamiento' | 'en_observacion' | 'recuperado' | 'movido_a_mortalidad';
  medicamentoAplicado: string;
  dosisAplicada: string;
  fechaInicioTratamiento: string;
  fechaFinTratamiento?: string;
  observacionesVeterinario: string;
  proximaRevision: string;
  costo?: number;
  requiereAislamiento: boolean;
  contagioso: boolean;
  usuarioRegistro: string;
  fechaRegistro: string;
  // Campos calculados
  diasEnTratamiento: number;
  porcentajeAfectado: number;
  animalesTratados: number;
}

// Interface para estadísticas de morbilidad
export interface EstadisticasMorbilidad {
  totalEnfermos: number;
  enTratamiento: number;
  recuperados: number;
  movidosAMortalidad: number;
  principalesEnfermedades: { enfermedad: string; casos: number; porcentaje: number }[];
  eficaciaTratamientos: { medicamento: string; eficacia: number; casos: number }[];
  costoTotalTratamientos: number;
  alertas: { tipo: string; mensaje: string; urgencia: 'alta' | 'media' | 'baja' }[];
}

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
  
  // Modales
  modalMorbilidadAbierto = false;
  loteSeleccionado: Lote | null = null;
  
  // Nuevo registro de morbilidad
  nuevoRegistro: Partial<RegistroMorbilidad> = {
    loteId: 0,
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    cantidadEnfermos: 1,
    enfermedad: '',
    sintomasObservados: [],
    gravedad: 'leve',
    estadoTratamiento: 'en_observacion',
    medicamentoAplicado: '',
    dosisAplicada: '',
    fechaInicioTratamiento: new Date().toISOString().split('T')[0],
    observacionesVeterinario: '',
    proximaRevision: '',
    costo: 0,
    requiereAislamiento: false,
    contagioso: false,
    usuarioRegistro: '',
    fechaRegistro: new Date().toISOString(),
    diasEnTratamiento: 0,
    porcentajeAfectado: 0,
    animalesTratados: 0
  };
  
  // Filtros y búsqueda
  filtroEstado = '';
  filtroGravedad = '';
  filtroEnfermedad = '';
  busquedaLote = '';
  
  // Estadísticas
  estadisticas: EstadisticasMorbilidad = {
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
    private loteService: LoteService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
    this.cargarDatos();
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
      next: (response: any) => {
        if (response?.status === 200 && response.object) {
          this.lotesPollos = response.object.filter((lote: any) => 
            lote.animal?.name?.toLowerCase().includes('pollo') && 
            lote.status?.toLowerCase() === 'activo'
          );
        }
      },
      error: (error) => console.error('Error al cargar lotes:', error)
    });
    
    this.subscriptions.add(lotesSub);
    
    // TODO: Cargar datos reales de morbilidad desde el backend
    this.calcularEstadisticas();
    
    this.cargando = false;
  }

  /**
   * Calcular estadísticas
   */
  private calcularEstadisticas(): void {
    const registros = this.getRegistrosFiltrados();
    
    this.estadisticas.totalEnfermos = registros.reduce((sum, r) => sum + r.cantidadEnfermos, 0);
    this.estadisticas.enTratamiento = registros.filter(r => r.estadoTratamiento === 'en_tratamiento').length;
    this.estadisticas.recuperados = registros.filter(r => r.estadoTratamiento === 'recuperado').length;
    this.estadisticas.movidosAMortalidad = registros.filter(r => r.estadoTratamiento === 'movido_a_mortalidad').length;
    
    // Calcular principales enfermedades
    const enfermedades = new Map<string, number>();
    registros.forEach(r => {
      enfermedades.set(r.enfermedad, (enfermedades.get(r.enfermedad) || 0) + r.cantidadEnfermos);
    });

    this.estadisticas.principalesEnfermedades = Array.from(enfermedades.entries())
      .map(([enfermedad, casos]) => ({
        enfermedad,
        casos,
        porcentaje: this.estadisticas.totalEnfermos > 0 ? (casos / this.estadisticas.totalEnfermos) * 100 : 0
      }))
      .sort((a, b) => b.casos - a.casos)
      .slice(0, 5);

    // Calcular eficacia de tratamientos
    const medicamentos = new Map<string, {casos: number, eficacia: number}>();
    registros.forEach(r => {
      if (r.medicamentoAplicado) {
        const existing = medicamentos.get(r.medicamentoAplicado) || {casos: 0, eficacia: 0};
        const eficacia = r.estadoTratamiento === 'recuperado' ? 100 : 
                        r.estadoTratamiento === 'en_tratamiento' ? 75 : 
                        r.estadoTratamiento === 'movido_a_mortalidad' ? 0 : 50;
        medicamentos.set(r.medicamentoAplicado, {
          casos: existing.casos + 1,
          eficacia: ((existing.eficacia * existing.casos) + eficacia) / (existing.casos + 1)
        });
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

    this.estadisticas.costoTotalTratamientos = registros.reduce((sum, r) => sum + (r.costo || 0), 0);
  }

  /**
   * Abrir modal para registrar morbilidad
   */
  abrirModalMorbilidad(lote: Lote): void {
    this.loteSeleccionado = lote;
    this.nuevoRegistro = {
      loteId: lote.id,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      cantidadEnfermos: 1,
      enfermedad: '',
      sintomasObservados: [],
      gravedad: 'leve',
      estadoTratamiento: 'en_observacion',
      medicamentoAplicado: '',
      dosisAplicada: '',
      fechaInicioTratamiento: new Date().toISOString().split('T')[0],
      observacionesVeterinario: '',
      proximaRevision: '',
      costo: 0,
      requiereAislamiento: false,
      contagioso: false,
      usuarioRegistro: this.user?.username || '',
      fechaRegistro: new Date().toISOString(),
      diasEnTratamiento: 0,
      porcentajeAfectado: 0,
      animalesTratados: 0
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
    this.nuevoRegistro = {
      loteId: 0,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      cantidadEnfermos: 1,
      enfermedad: '',
      sintomasObservados: [],
      gravedad: 'leve',
      estadoTratamiento: 'en_observacion',
      medicamentoAplicado: '',
      dosisAplicada: '',
      fechaInicioTratamiento: new Date().toISOString().split('T')[0],
      observacionesVeterinario: '',
      proximaRevision: '',
      costo: 0,
      requiereAislamiento: false,
      contagioso: false,
      usuarioRegistro: this.user?.username || '',
      fechaRegistro: new Date().toISOString(),
      diasEnTratamiento: 0,
      porcentajeAfectado: 0,
      animalesTratados: 0
    };
    this.modalMorbilidadAbierto = true;
  }

  /**
   * Registrar nueva morbilidad
   */
  registrarMorbilidad(): void {
    if (!this.nuevoRegistro.loteId || !this.nuevoRegistro.enfermedad || !this.nuevoRegistro.cantidadEnfermos) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    const registro: RegistroMorbilidad = {
      id: Date.now(),
      loteId: this.nuevoRegistro.loteId!,
      fecha: this.nuevoRegistro.fecha!,
      hora: this.nuevoRegistro.hora!,
      cantidadEnfermos: this.nuevoRegistro.cantidadEnfermos!,
      enfermedad: this.nuevoRegistro.enfermedad!,
      sintomasObservados: this.nuevoRegistro.sintomasObservados || [],
      gravedad: this.nuevoRegistro.gravedad || 'leve',
      estadoTratamiento: this.nuevoRegistro.estadoTratamiento || 'en_observacion',
      medicamentoAplicado: this.nuevoRegistro.medicamentoAplicado || '',
      dosisAplicada: this.nuevoRegistro.dosisAplicada || '',
      fechaInicioTratamiento: this.nuevoRegistro.fechaInicioTratamiento || new Date().toISOString().split('T')[0],
      observacionesVeterinario: this.nuevoRegistro.observacionesVeterinario || '',
      proximaRevision: this.nuevoRegistro.proximaRevision || '',
      costo: this.nuevoRegistro.costo || 0,
      requiereAislamiento: this.nuevoRegistro.requiereAislamiento || false,
      contagioso: this.nuevoRegistro.contagioso || false,
      usuarioRegistro: this.user?.username || 'Usuario',
      fechaRegistro: new Date().toISOString(),
      diasEnTratamiento: 0,
      porcentajeAfectado: 0,
      animalesTratados: this.nuevoRegistro.cantidadEnfermos || 0
    };

    this.registrosMorbilidad.unshift(registro);
    this.calcularEstadisticas();
    this.cerrarModalMorbilidad();
    
    console.log('✅ Morbilidad registrada exitosamente:', registro);
    alert('Morbilidad registrada exitosamente');
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
   * Eliminar registro
   */
  eliminarRegistro(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
      this.registrosMorbilidad = this.registrosMorbilidad.filter(r => r.id !== id);
      this.calcularEstadisticas();
      console.log('✅ Registro eliminado');
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
    this.filtroEstado = '';
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
    
    if (this.filtroEstado) {
      registros = registros.filter(r => r.estadoTratamiento === this.filtroEstado);
    }
    
    if (this.filtroGravedad) {
      registros = registros.filter(r => r.gravedad === this.filtroGravedad);
    }
    
    if (this.filtroEnfermedad) {
      registros = registros.filter(r => r.enfermedad.toLowerCase().includes(this.filtroEnfermedad.toLowerCase()));
    }
    
    if (this.busquedaLote) {
      registros = registros.filter(r => 
        r.loteId.toString().includes(this.busquedaLote) ||
        this.getNombreLote(r.loteId).toLowerCase().includes(this.busquedaLote.toLowerCase())
      );
    }
    
    return registros.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  }

  /**
   * Obtener nombre del lote
   */
  getNombreLote(loteId: number): string {
    const lote = this.lotesPollos.find(l => l.id === loteId);
    return lote ? `Lote ${lote.id} - ${lote.race?.name || 'Sin raza'}` : `Lote ${loteId}`;
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
}
