import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { LoteService } from '../lotes/services/lote.service';
import { User } from '../../shared/models/user.model';
import { Lote } from '../lotes/interfaces/lote.interface';
import { MortalidadService } from './services/mortalidad.service';
import { CausaMortalidad, RegistroMortalidad, EstadisticasMortalidad, AlertaMortalidad } from './models/mortalidad.model';

@Component({
  selector: 'app-pollos-mortalidad',
  templateUrl: './pollos-mortalidad.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosMortalidadComponent implements OnInit, OnDestroy {
  user: User | null = null;
  
  // Variables principales
  registrosMortalidad: RegistroMortalidad[] = [];
  estadisticas: EstadisticasMortalidad | null = null;
  alertas: AlertaMortalidad[] = [];
  lotes: Lote[] = [];
  causasMortalidad: CausaMortalidad[] = [];
  
  // Variables de control de UI
  mostrarModalRegistro = false;
  mostrarModalEstadisticas = false;
  mostrarModalAlertas = false;
  cargando = false;
  
  // Filtros
  filtroLote: number | null = null;
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  filtroCausa: string = '';
  
  // Formulario de nuevo registro
  nuevoRegistro: Partial<RegistroMortalidad> = {
    cantidadMuertos: 1,
    observaciones: '',
    peso: 0,
    edad: 0,
    ubicacion: '',
    confirmado: false
  };
  
  // Suscripciones
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
    
    // ✅ VERIFICAR SI ES AUTOREGISTRO DESDE REGISTRO DIARIO
    this.verificarAutoregistro();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Cargar datos iniciales
   */
  cargarDatosIniciales(): void {
    this.cargando = true;
    
    // Cargar lotes
    const lotesSub = this.loteService.getLotes().subscribe({
      next: (response: any) => {
        if (response?.status === 200 && response.object) {
          this.lotes = response.object.filter((lote: any) => 
            lote.animal?.name?.toLowerCase().includes('pollo') && 
            lote.status?.toLowerCase() === 'activo'
          );
        }
      },
      error: (error) => console.error('Error al cargar lotes:', error)
    });
    
    this.subscriptions.add(lotesSub);
    
    const mortalidadSub = this.mortalidadService.getRegistrosMortalidad().subscribe({
      next: (data) => {
        this.registrosMortalidad = data;
        this.calcularEstadisticas();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar registros de mortalidad:', error);
        this.cargando = false;
      }
    });

    const causasSub = this.mortalidadService.getCausas().subscribe({
      next: (data) => {
        this.causasMortalidad = data;
      },
      error: (error) => {
        console.error('Error al cargar causas de mortalidad:', error);
      }
    });

    this.subscriptions.add(mortalidadSub);
    this.subscriptions.add(causasSub);
  }

  /**
   * Registrar nueva mortalidad
   */
  registrarMortalidad(): void {
    if (!this.nuevoRegistro.loteId || !this.nuevoRegistro.causa || !this.nuevoRegistro.cantidadMuertos) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }
    
    const registro: Partial<RegistroMortalidad> = {
      loteId: this.nuevoRegistro.loteId!,
      cantidadMuertos: this.nuevoRegistro.cantidadMuertos!,
      causa: this.nuevoRegistro.causa!,
      observaciones: this.nuevoRegistro.observaciones || '',
      peso: this.nuevoRegistro.peso || 0,
      edad: this.nuevoRegistro.edad || 0,
      ubicacion: this.nuevoRegistro.ubicacion || '',
      confirmado: false,
      fechaRegistro: new Date(),
      usuarioRegistro: this.user?.username || 'Desconocido'
    };

    this.mortalidadService.registrarMortalidad(registro as RegistroMortalidad).subscribe({
      next: (nuevoRegistro) => {
        this.registrosMortalidad.unshift(nuevoRegistro);
        this.calcularEstadisticas();
        this.cerrarModalRegistro();
        console.log('✅ Mortalidad registrada exitosamente:', nuevoRegistro);
        alert('Mortalidad registrada exitosamente');
      },
      error: (error) => {
        console.error('Error al registrar mortalidad:', error);
        alert('Error al registrar mortalidad. Por favor, intente de nuevo.');
      }
    });
  }

  /**
   * Confirmar un registro de mortalidad
   */
  confirmarRegistro(id: number): void {
    if (confirm('¿Está seguro de confirmar este registro de mortalidad?')) {
      this.mortalidadService.confirmarRegistro(id).subscribe({
        next: () => {
          const registro = this.registrosMortalidad.find(r => r.id === id);
          if (registro) {
            registro.confirmado = true;
          }
          console.log('✅ Registro confirmado');
        },
        error: (error) => {
          console.error('Error al confirmar registro:', error);
          alert('Error al confirmar el registro.');
        }
      });
    }
  }

  /**
   * Eliminar un registro de mortalidad
   */
  eliminarRegistro(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
      this.mortalidadService.eliminarRegistro(id).subscribe({
        next: () => {
          this.registrosMortalidad = this.registrosMortalidad.filter(r => r.id !== id);
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
   * Marcar alerta como leída
   */
  marcarAlertaLeida(id: number): void {
    const alerta = this.alertas.find(a => a.id === id);
    if (alerta) {
      alerta.leida = true;
      console.log('✅ Alerta marcada como leída');
    }
  }

  /**
   * Calcular estadísticas
   */
  calcularEstadisticas(): void {
    const registros = this.getRegistrosFiltrados();
    
    const totalMuertes = registros.reduce((sum, r) => sum + r.cantidadMuertos, 0);
    const totalLotes = new Set(registros.map(r => r.loteId)).size;
    
    // Calcular principales causas
    const muertesPorCausa = this.registrosMortalidad.reduce((acc, registro) => {
      const index = acc.findIndex(a => a.causa === registro.causa.nombre);
      if (index >= 0) {
        acc[index].muertes += registro.cantidadMuertos;
      } else {
        acc.push({
          causa: registro.causa.nombre,
          muertes: registro.cantidadMuertos,
          porcentaje: 0
        });
      }
      return acc;
    }, [] as { causa: string; muertes: number; porcentaje: number }[]);

    const principalesCausas = muertesPorCausa.map(causa => ({
      causa: causa.causa,
      muertes: causa.muertes,
      porcentaje: totalMuertes > 0 ? (causa.muertes / totalMuertes) * 100 : 0
    }))
      .sort((a, b) => b.muertes - a.muertes)
      .slice(0, 5);

    // Calcular tendencia semanal
    const tendencia = new Map<string, number>();
    registros.forEach(r => {
      const fecha = new Date(r.fechaRegistro).toISOString().split('T')[0];
      tendencia.set(fecha, (tendencia.get(fecha) || 0) + r.cantidadMuertos);
    });

    const tendenciaSemanal = Array.from(tendencia.entries())
      .map(([fecha, muertes]) => ({ fecha, muertes }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .slice(-7);

    this.estadisticas = {
      totalMuertes,
      totalLotes,
      tasaPromedioMortalidad: 0, // TODO: Calcular con datos reales
      porcentajeMortalidad: totalMuertes > 0 ? (totalMuertes / (totalLotes * 1000)) * 100 : 0, // Asumiendo 1000 pollos por lote
      causaMasFrecuente: principalesCausas[0]?.causa || 'Ninguna',
      tendencia: this.calcularTendencia(tendenciaSemanal),
      muertesPorDia: tendenciaSemanal.map(t => ({
        fecha: t.fecha,
        muertes: t.muertes
      })),
      muertesPorCausa: principalesCausas,
      principalesCausas,
      tendenciaSemanal,
      alertas: this.alertas
    };
  }

  /**
   * Generar alertas
   */
  private generarAlertas(): void {
    this.alertas = [];
    
    // Alerta por alta mortalidad
    const hoy = new Date().toISOString().split('T')[0];
    const muertesHoy = this.registrosMortalidad
      .filter(r => new Date(r.fechaRegistro).toISOString().split('T')[0] === hoy)
      .reduce((sum, r) => sum + r.cantidadMuertos, 0);
    
    if (muertesHoy > 2) {
      this.alertas.push({
        id: Date.now(),
        tipo: 'critica',
        titulo: 'Alta mortalidad detectada',
        mensaje: `Se registraron ${muertesHoy} muertes hoy`,
        fechaCreacion: new Date(),
        leida: false,
        loteId: null
      });
    }
  }

  /**
   * Aplicar filtros a los registros
   */
  aplicarFiltros(): void {
    this.calcularEstadisticas();
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtroLote = null;
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroCausa = '';
    this.aplicarFiltros();
  }

  /**
   * Abrir modal de registro
   */
  abrirModalRegistro(): void {
    this.nuevoRegistro = {
      cantidadMuertos: 1,
      observaciones: '',
      peso: 0,
      edad: 0,
      ubicacion: '',
      confirmado: false
    };
    this.mostrarModalRegistro = true;
  }

  /**
   * Cerrar modal de registro
   */
  cerrarModalRegistro(): void {
    this.mostrarModalRegistro = false;
    this.nuevoRegistro = {};
  }

  /**
   * Obtener nombre del lote por ID
   */
  getNombreLote(loteId: number): string {
    const lote = this.lotes.find(l => l.id === loteId);
    return lote ? `Lote ${lote.id} - ${lote.race?.name || 'Sin raza'}` : `Lote ${loteId}`;
  }

  /**
   * Obtener color de la causa de mortalidad
   */
  getColorCausa(causa: CausaMortalidad): string {
    return causa.color;
  }

  /**
   * Obtener registros filtrados para mostrar en la tabla
   */
  getRegistrosFiltrados(): RegistroMortalidad[] {
    let registros = [...this.registrosMortalidad];
    
    if (this.filtroLote) {
      registros = registros.filter(r => r.loteId === this.filtroLote);
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
      registros = registros.filter(r => r.causa.nombre.toLowerCase().includes(this.filtroCausa.toLowerCase()));
    }
    
    return registros.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  }

  /**
   * Obtener alertas no leídas
   */
  getAlertasNoLeidas(): AlertaMortalidad[] {
    return this.alertas.filter(a => !a.leida);
  }

  /**
   * Obtener clase CSS para el tipo de alerta
   */
  getClaseAlerta(tipo: string): string {
    switch (tipo) {
      case 'critica': return 'bg-red-50 border-red-200 text-red-800';
      case 'advertencia': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'informativa': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Exportar datos (placeholder)
   */
  exportarDatos(): void {
    console.log('🔄 Exportando datos de mortalidad...');
    alert('Funcionalidad de exportación en desarrollo');
  }

  /**
   * Imprimir reporte (placeholder)
   */
  imprimirReporte(): void {
    console.log('🖨️ Generando reporte para impresión...');
    alert('Funcionalidad de impresión en desarrollo');
  }

  /**
   * Calcular tendencia de mortalidad
   */
  private calcularTendencia(tendenciaSemanal: { fecha: string; muertes: number }[]): 'subiendo' | 'bajando' | 'estable' {
    if (tendenciaSemanal.length < 2) return 'estable';
    
    const primerDia = tendenciaSemanal[0].muertes;
    const ultimoDia = tendenciaSemanal[tendenciaSemanal.length - 1].muertes;
    
    const diferencia = ultimoDia - primerDia;
    const porcentajeCambio = (diferencia / primerDia) * 100;
    
    if (porcentajeCambio > 10) return 'subiendo';
    if (porcentajeCambio < -10) return 'bajando';
    return 'estable';
  }

  /**
   * ✅ VERIFICAR SI ES AUTOREGISTRO DESDE FORMULARIO DIARIO
   */
  verificarAutoregistro(): void {
    this.route.queryParams.subscribe(params => {
      if (params['autoRegistro'] === 'true' && params['datos']) {
        try {
          const datosAutoregistro = JSON.parse(params['datos']);
          console.log('🔄 Autoregistro de mortalidad recibido:', datosAutoregistro);
          
          // Prellenar el formulario con los datos recibidos
          this.nuevoRegistro = {
            loteId: Number(datosAutoregistro.loteId),
            cantidadMuertos: Number(datosAutoregistro.cantidad),
            observaciones: 'Registro automático desde alimentación.',
            peso: 0,
            edad: 0,
            ubicacion: '',
            confirmado: false,
            fechaRegistro: new Date()
          };
          
          // Abrir el modal automáticamente
          this.mostrarModalRegistro = true;
          
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
}
