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
  loteSeleccionado: Lote | null = null;
  
  // Variables de control de UI
  mostrarModalRegistro = false;
  mostrarModalEstadisticas = false;
  mostrarModalAlertas = false;
  mostrarModalCausa = false;
  cargando = false;
  
  // Registro seleccionado para agregar causa
  registroSeleccionado: RegistroMortalidad | null = null;
  
  // Filtros
  filtroLote: string | null = null;
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  filtroCausa: string = '';
  
  // Formulario de nuevo registro
  nuevoRegistro: Partial<RegistroMortalidad> = {
    cantidadMuertos: 1,
    observaciones: '',
    edad: 0,
    ubicacion: '',
    confirmado: false
  };
  
  // Suscripciones
  private subscriptions: Subscription = new Subscription();

  // Estadísticas de lotes - Cache para mortalidad
  private estadisticasLotes: Map<string, {
    pollosRegistrados: number;
    pollosVivos: number;
    mortalidadTotal: number;
    porcentajeMortalidad: number;
    tieneDatos: boolean;
  }> = new Map();

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

  /**
   * Cargar datos iniciales
   */
  cargarDatosIniciales(): void {
    this.cargando = true;
    
    const lotesSub = this.loteService.getLotes().subscribe({
      next: (lotes: Lote[]) => {
        this.lotes = lotes.filter((lote: Lote) => 
          lote.race?.animal?.name?.toLowerCase().includes('pollo')
        );
        console.log('✅ Lotes filtrados para pollos:', this.lotes);
        
        // Una vez que los lotes están cargados, cargar la mortalidad
        this.cargarRegistrosMortalidad();
      },
      error: (error) => {
        console.error('Error al cargar lotes:', error);
        this.cargando = false;
      }
    });
    
    this.subscriptions.add(lotesSub);

    const causasSub = this.mortalidadService.getCausas().subscribe({
      next: (data) => {
        this.causasMortalidad = data;
      },
      error: (error) => {
        console.error('Error al cargar causas de mortalidad:', error);
      }
    });

    this.subscriptions.add(causasSub);
  }

  /**
   * Cargar registros de mortalidad
   */
  cargarRegistrosMortalidad(): void {
    console.log('🔄 Cargando registros de mortalidad...');
    const mortalidadSub = this.mortalidadService.getRegistrosMortalidad().subscribe({
      next: (data) => {
        console.log('📋 Datos de mortalidad recibidos del servicio:', data);
        this.registrosMortalidad = data || [];
        console.log('📋 Array asignado, total registros:', this.registrosMortalidad.length);
        
        if (this.registrosMortalidad.length > 0) {
          console.log('📋 Primer registro:', this.registrosMortalidad[0]);
        }
        
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

  /**
   * Registrar nueva mortalidad
   */
  registrarMortalidad(): void {
    console.log('🔄 Iniciando registro de mortalidad...');
    console.log('📋 Datos del formulario:', this.nuevoRegistro);
    
    // Validación mínima: lote y cantidad > 0. La causa es opcional.
    if (!this.nuevoRegistro.loteId || !this.nuevoRegistro.cantidadMuertos || this.nuevoRegistro.cantidadMuertos <= 0) {
      alert('Por favor seleccione un lote y especifique la cantidad de animales muertos (> 0)');
      return;
    }
    
    // Si hay causa, usar el endpoint con causa; si no, usar el endpoint simple
    if (this.nuevoRegistro.causa && this.nuevoRegistro.causa.id) {
      const registroConCausa: any = {
        loteId: this.nuevoRegistro.loteId!,
        cantidadMuertos: this.nuevoRegistro.cantidadMuertos!,
        causaId: this.nuevoRegistro.causa.id,
        observaciones: this.nuevoRegistro.observaciones || '',
        edad: this.nuevoRegistro.edad || 0,
        ubicacion: this.nuevoRegistro.ubicacion || '',
        confirmado: false,
        usuarioRegistro: this.user?.username || 'Desconocido'
      };

      console.log('📤 Enviando registro CON causa al backend:', registroConCausa);

      this.mortalidadService.registrarMortalidadConCausa(registroConCausa).subscribe({
        next: (nuevoRegistro) => {
          console.log('✅ Respuesta del backend:', nuevoRegistro);
          this.registrosMortalidad.unshift(nuevoRegistro);
          this.cargarEstadisticasDesdeBackend();
          this.recargarLotesActualizados(this.nuevoRegistro.loteId!);
          this.cerrarModalRegistro();
          console.log('✅ Mortalidad registrada exitosamente con causa, lote actualizado');
          alert(`Mortalidad registrada exitosamente. La cantidad del lote ha sido actualizada automáticamente.`);
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

      console.log('📤 Enviando registro SIN causa al backend:', registroSimple);

      this.mortalidadService.registrarMortalidad(registroSimple).subscribe({
        next: (nuevoRegistro) => {
          console.log('✅ Respuesta del backend:', nuevoRegistro);
          this.registrosMortalidad.unshift(nuevoRegistro);
          this.cargarEstadisticasDesdeBackend();
          this.recargarLotesActualizados(this.nuevoRegistro.loteId!);
          this.cerrarModalRegistro();
          console.log('✅ Mortalidad registrada exitosamente sin causa, lote actualizado');
          alert(`Mortalidad registrada exitosamente. La cantidad del lote ha sido actualizada automáticamente.`);
        },
        error: (error) => {
          console.error('❌ Error al registrar mortalidad sin causa:', error);
          alert('Error al registrar mortalidad. Por favor, intente de nuevo.');
        }
      });
    }
  }

  /**
   * Recargar lotes actualizados desde el backend después de registrar mortalidad
   */
  private recargarLotesActualizados(loteId: string): void {
    console.log('🔄 Recargando lotes actualizados desde el backend...');
    
    const lotesSub = this.loteService.getLotes().subscribe({
      next: (lotes: Lote[]) => {
        // Actualizar solo los lotes de pollos
        const lotesPollos = lotes.filter((lote: Lote) => 
          lote.race?.animal?.name?.toLowerCase().includes('pollo')
        );
        
        // Encontrar el lote afectado para mostrar el cambio
        const loteAfectado = lotesPollos.find(l => String(l.id) === loteId);
        const loteAnterior = this.lotes.find(l => String(l.id) === loteId);
        
        if (loteAfectado && loteAnterior) {
          console.log(`✅ Lote ${loteAfectado.codigo} actualizado correctamente:`);
          console.log(`   - Cantidad anterior (frontend): ${loteAnterior.quantity}`);
          console.log(`   - Nueva cantidad (backend): ${loteAfectado.quantity}`);
        }
        
        // Actualizar la lista de lotes
        this.lotes = lotesPollos;
        console.log('✅ Lotes actualizados desde el backend');
      },
      error: (error) => {
        console.error('❌ Error al recargar lotes:', error);
        // Continúa sin problemas aunque falle la recarga
      }
    });
    
    this.subscriptions.add(lotesSub);
  }

  /**
   * Obtener nombre del lote por ID
   */
  getNombreLote(loteId: string): string {
    const lote = this.lotes.find(l => String(l.id) === loteId);
    return lote ? lote.name : `Lote ${loteId}`;
  }

  /**
   * Obtener registros filtrados para mostrar en la tabla
   */
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
      registros = registros.filter(r => r.causa.nombre.toLowerCase().includes(this.filtroCausa.toLowerCase()));
    }
    
    return registros.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  }

  /**
   * Cargar estadísticas desde el backend
   */
  cargarEstadisticasDesdeBackend(): void {
    console.log('📊 Cargando estadísticas desde el backend...');
    
    const estadisticasSub = this.mortalidadService.getEstadisticas().subscribe({
      next: (data) => {
        console.log('📊 Estadísticas recibidas del backend:', data);
        
        // Mapear los datos del backend al formato del frontend
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
        };
        
        console.log('✅ Estadísticas procesadas:', this.estadisticas);
      },
      error: (error) => {
        console.error('❌ Error al cargar estadísticas desde el backend:', error);
        // Fallback: usar cálculos locales como respaldo
        this.calcularEstadisticasLocal();
      }
    });
    
    this.subscriptions.add(estadisticasSub);
  }

  /**
   * Calcular estadísticas localmente (método de respaldo)
   */
  private calcularEstadisticasLocal(): void {
    const registros = this.getRegistrosFiltrados();
    
    const totalMuertes = registros.reduce((sum, r) => sum + r.cantidadMuertos, 0);
    const totalLotes = new Set(registros.map(r => r.loteId)).size;
    
    this.estadisticas = {
      totalMuertes,
      totalLotes,
      tasaPromedioMortalidad: 0,
      porcentajeMortalidad: totalMuertes > 0 ? (totalMuertes / (totalLotes * 1000)) * 100 : 0,
      causaMasFrecuente: 'Ninguna',
      tendencia: 'estable',
      muertesPorDia: [],
      muertesPorCausa: [],
      principalesCausas: [],
      tendenciaSemanal: [],
      alertas: this.alertas
    };
  }

  /**
   * Abrir modal de registro
   */
  abrirModalRegistro(lote?: Lote): void {
    this.nuevoRegistro = {
      cantidadMuertos: 1,
      observaciones: '',
      edad: 0,
      ubicacion: '',
      confirmado: false
    };
    
    if (lote) {
      this.loteSeleccionado = lote;
      this.nuevoRegistro.loteId = String(lote.id);
    } else {
      this.loteSeleccionado = null;
    }
    
    this.mostrarModalRegistro = true;
  }

  /**
   * Cerrar modal de registro
   */
  cerrarModalRegistro(): void {
    this.mostrarModalRegistro = false;
    this.nuevoRegistro = {};
    this.loteSeleccionado = null;
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
   * Verificar si es autoregistro desde formulario diario
   */
  verificarAutoregistro(): void {
    this.route.queryParams.subscribe(params => {
      if (!params) return;
      const loteId = params['loteId'];
      const cantidad = params['cantidad'];
      const causaNombre = params['causa'];

      // Si llegan parámetros desde alimentación, prellenar y abrir modal automáticamente
      if (loteId || cantidad || causaNombre) {
        console.log('🧭 Autocompletando registro de mortalidad desde parámetros:', params);

        // Prefill de datos mínimos
        this.nuevoRegistro = {
          loteId: String(loteId || ''),
          cantidadMuertos: Number(cantidad) > 0 ? Number(cantidad) : 1,
          observaciones: this.nuevoRegistro.observaciones || '',
          edad: this.nuevoRegistro.edad || 0,
          ubicacion: this.nuevoRegistro.ubicacion || '',
          confirmado: false
        };

        // Intentar asignar la causa por nombre si está en parámetros
        if (causaNombre && this.causasMortalidad && this.causasMortalidad.length > 0) {
          const causa = this.causasMortalidad.find(c => c.nombre.toLowerCase() === String(causaNombre).toLowerCase());
          if (causa) {
            (this.nuevoRegistro as any).causa = causa;
          }
        }

        // Abrir modal de registro
        this.mostrarModalRegistro = true;

        // Limpiar parámetros de URL para evitar re-procesos
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
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
        link.setAttribute('download', `mortalidad-${new Date().toISOString().split('T')[0]}.csv`);
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

  /**
   * Aplicar filtros a los datos
   */
  aplicarFiltros(): void {
    // Los filtros se aplican automáticamente a través de getRegistrosFiltrados()
    // Este método existe para compatibilidad con el template
  }

  /**
   * Cargar estadísticas de mortalidad para todos los lotes
   */
  private async cargarEstadisticasLotes(): Promise<void> {
    console.log('📊 Cargando estadísticas de mortalidad para los lotes...');
    
    const promesasEstadisticas = this.lotes.map(async (lote) => {
      try {
        // Obtener mortalidad total del backend
        const mortalidadTotal = await this.mortalidadService.contarMortalidadPorLote(String(lote.id)).toPromise() || 0;
        
        const pollosRegistrados = lote.quantityOriginal || lote.quantity || 0;
        const pollosVivos = lote.quantity || 0;
        const porcentajeMortalidad = pollosRegistrados > 0 ? (mortalidadTotal / pollosRegistrados) * 100 : 0;
        const tieneDatos = lote.quantityOriginal ? true : false;

        // Guardar en cache
        this.estadisticasLotes.set(String(lote.id!), {
          pollosRegistrados,
          pollosVivos,
          mortalidadTotal,
          porcentajeMortalidad,
          tieneDatos
        });

        console.log(`📊 Estadísticas lote ${lote.codigo}:`, {
          pollosRegistrados,
          pollosVivos,
          mortalidadTotal,
          porcentajeMortalidad: porcentajeMortalidad.toFixed(1) + '%'
        });

      } catch (error) {
        console.error(`❌ Error cargando estadísticas para lote ${lote.codigo}:`, error);
        
        // Fallback: usar cálculo local
        const pollosRegistrados = lote.quantityOriginal || lote.quantity || 0;
        const pollosVivos = lote.quantity || 0;
        const mortalidadTotal = lote.quantityOriginal ? Math.max(0, pollosRegistrados - pollosVivos) : 0;
        
        this.estadisticasLotes.set(String(lote.id!), {
          pollosRegistrados,
          pollosVivos,
          mortalidadTotal,
          porcentajeMortalidad: 0,
          tieneDatos: false
        });
      }
    });

    await Promise.all(promesasEstadisticas);
    console.log('✅ Estadísticas de mortalidad cargadas para todos los lotes');
  }

  /**
   * Obtener estadísticas completas del lote para mostrar en la tarjeta
   */
  getEstadisticasLote(lote: Lote): {
    pollosRegistrados: number;
    pollosVivos: number;
    mortalidadTotal: number;
    porcentajeMortalidad: number;
    tieneDatos: boolean;
  } {
    // Usar datos del cache si están disponibles
    if (lote.id && this.estadisticasLotes.has(String(lote.id))) {
      return this.estadisticasLotes.get(String(lote.id))!;
    }

    // Fallback: calcular localmente
    const pollosRegistrados = lote.quantityOriginal || lote.quantity || 0;
    const pollosVivos = lote.quantity || 0;
    const mortalidadTotal = lote.quantityOriginal ? Math.max(0, pollosRegistrados - pollosVivos) : 0;
    const porcentajeMortalidad = pollosRegistrados > 0 ? (mortalidadTotal / pollosRegistrados) * 100 : 0;
    const tieneDatos = lote.quantityOriginal ? true : false;

    return {
      pollosRegistrados,
      pollosVivos,
      mortalidadTotal,
      porcentajeMortalidad,
      tieneDatos
    };
  }

  /**
   * Calcular días de vida de un lote
   */
  calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    const diffTime = hoy.getTime() - nacimiento.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
}
