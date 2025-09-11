import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { MorbilidadService } from './services/morbilidad.service';
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
        this.registrosMorbilidad = data;
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
    
    this.estadisticas.totalEnfermos = registros.reduce((sum, r) => sum + r.cantidadEnfermos, 0);
    this.estadisticas.enTratamiento = registros.filter(r => r.estado.nombre === 'En Tratamiento').length;
    this.estadisticas.recuperados = registros.filter(r => r.estado.nombre === 'Recuperado').length;
    this.estadisticas.movidosAMortalidad = registros.filter(r => r.derivadoAMortalidad).length;
    
    // Calcular principales enfermedades
    const enfermedadesMap = new Map<string, number>();
    registros.forEach(r => {
      const nombreEnfermedad = r.enfermedad.nombre;
      enfermedadesMap.set(nombreEnfermedad, (enfermedadesMap.get(nombreEnfermedad) || 0) + r.cantidadEnfermos);
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
    if (!this.nuevoRegistro.loteId || !this.nuevoRegistro.enfermedad || !this.nuevoRegistro.cantidadEnfermos) {
      alert('Por favor complete todos los campos obligatorios: Lote, Enfermedad y Cantidad.');
      return;
    }

    const registro: RegistroMorbilidad = {
      loteId: this.nuevoRegistro.loteId!,
      fechaRegistro: new Date(),
      cantidadEnfermos: this.nuevoRegistro.cantidadEnfermos!,
      enfermedad: this.nuevoRegistro.enfermedad!,
      sintomas: this.nuevoRegistro.sintomas || [],
      severidad: this.nuevoRegistro.severidad || 'leve',
      estado: this.nuevoRegistro.estado!,
      aislado: this.nuevoRegistro.aislado || false,
      observaciones: this.nuevoRegistro.observaciones || '',
      tratamiento: this.nuevoRegistro.tratamiento,
      usuarioRegistro: this.user?.username || 'Usuario',
    };

    this.morbilidadService.registrarMorbilidad(registro).subscribe({
      next: (nuevoRegistro) => {
        this.registrosMorbilidad.unshift(nuevoRegistro);
        this.calcularEstadisticas();
        this.cerrarModalMorbilidad();
        console.log('✅ Morbilidad registrada exitosamente:', nuevoRegistro);
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
      registros = registros.filter(r => r.estado.id === this.filtroEstadoId);
    }
    
    if (this.filtroGravedad) {
      registros = registros.filter(r => r.severidad === this.filtroGravedad);
    }
    
    if (this.filtroEnfermedad) {
      registros = registros.filter(r => r.enfermedad.nombre.toLowerCase().includes(this.filtroEnfermedad.toLowerCase()));
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
      if (params['autoRegistro'] === 'true' && params['datos']) {
        try {
          const datosAutoregistro = JSON.parse(params['datos']);
          console.log('🔄 Autoregistro de morbilidad recibido:', datosAutoregistro);
          const estadoPorDefecto = this.estados.find(e => e.nombre === 'En Observación');
          
          // Prellenar el formulario con los datos recibidos
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
          
          // Abrir el modal automáticamente
          this.modalMorbilidadAbierto = true;
          
          // Limpiar los query params
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
          });
          
        } catch (error) {
          console.error('❌ Error al procesar autoregistro:', error);
        }
      }
    });
  }

  /**
   * ✅ FUNCIONALIDAD PARA RECUPERACIÓN DE ANIMALES
   */
  marcarComoRecuperado(registro: RegistroMorbilidad): void {
    if (confirm('¿Confirma que los animales se han recuperado y deben volver al lote?')) {
      // Cambiar estado a recuperado
      const estadoRecuperado = this.estados.find(e => e.nombre === 'Recuperado');
      if (estadoRecuperado) {
        registro.estado = estadoRecuperado;
      }
      registro.fechaRecuperacion = new Date();
      
      // Devolver animales al lote
      this.devolverAnimalesAlLote(registro);
      
      console.log('✅ Animales marcados como recuperados y devueltos al lote');
    }
  }

  /**
   * ✅ DEVOLVER ANIMALES RECUPERADOS AL LOTE
   */
  private async devolverAnimalesAlLote(registro: RegistroMorbilidad): Promise<void> {
    try {
      // Buscar el lote
      const lote = this.lotesPollos.find(l => l.id === registro.loteId);
      if (!lote) {
        console.error('❌ Lote no encontrado');
        return;
      }
      
      // Incrementar la cantidad de animales
      const nuevaCantidad = lote.quantity + registro.cantidadEnfermos;
      
      console.log(`🔄 Devolviendo ${registro.cantidadEnfermos} animales al lote ${lote.id}:`, {
        cantidadAnterior: lote.quantity,
        animalesRecuperados: registro.cantidadEnfermos,
        nuevaCantidad: nuevaCantidad
      });
      
      // Actualizar en el backend
      const loteActualizado = { ...lote, quantity: nuevaCantidad };
      await this.loteService.updateLote(loteActualizado).toPromise();
      
      // Actualizar en la vista local
      lote.quantity = nuevaCantidad;
      
      alert(`✅ ${registro.cantidadEnfermos} animales recuperados devueltos al lote ${lote.name}`);
      
    } catch (error) {
      console.error('❌ Error al devolver animales al lote:', error);
      alert('Error al devolver animales al lote. Intente nuevamente.');
    }
  }

  /**
   * ✅ MOVER ANIMALES A MORTALIDAD
   */
  moverAMortalidad(registro: RegistroMorbilidad): void {
    if (confirm('¿Confirma que los animales han muerto y deben registrarse en mortalidad?')) {
      // Cambiar estado
      const estadoMortalidad = this.estados.find(e => e.nombre === 'Muerto'); // Asumiendo que existe este estado
      if(estadoMortalidad) {
        registro.estado = estadoMortalidad;
      }
      registro.derivadoAMortalidad = true;
      registro.fechaMuerte = new Date();
      
      // Redirigir a mortalidad con datos
      const datosMortalidad = {
        loteId: registro.loteId,
        cantidad: registro.cantidadEnfermos,
        fecha: new Date().toISOString(),
        observaciones: `Derivado de morbilidad: ${registro.enfermedad.nombre}. ${registro.observaciones}`
      };
      
      this.router.navigate(['/pollos/mortalidad'], {
        queryParams: {
          autoRegistro: 'true',
          datos: JSON.stringify(datosMortalidad)
        }
      });
    }
  }
}
