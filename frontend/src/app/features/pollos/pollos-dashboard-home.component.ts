import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { PlanAlimentacionService, PlanDetalle } from '../plan-nutricional/services/plan-alimentacion.service';
import { RegistroDiarioService, RegistroDiarioCompleto } from '../../shared/services/registro-diario.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import * as d3 from 'd3';
import { VentasService } from '../../shared/services/ventas.service';
import { MortalidadService } from './services/mortalidad.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-pollos-dashboard-home',
  templateUrl: './pollos-dashboard-home.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosDashboardHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  user: User | null = null;
  @ViewChild('prodChart', { static: false }) prodChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('saludChart', { static: false }) saludChartRef!: ElementRef<HTMLDivElement>;
  private resizeObserver?: ResizeObserver;
  private labels: string[] = [];
  private huevosPorDia: number[] = [];
  private animalesPorDia: number[] = [];
  private muertesPorCausa: { causa: string; muertes: number }[] = [];
  periodoLabelProd: string = 'Este mes';
  private triedFallbackProd = false;
  
  // Variables para lotes de pollos
  lotesPollos: Lote[] = [];
  lotesActivos: Lote[] = [];
  loading = false;
  
  // Variables para etapas de alimentación
  etapasAlimentacion: PlanDetalle[] = [];
  selectedDate = new Date();
  
  // Variables para registro diario
  registrosDiarios: { [loteId: string]: RegistroDiario } = {};
  
  // ✅ NUEVAS VARIABLES PARA FORMULARIO DE REGISTRO DIARIO
  mostrarFormularioRegistro = false;
  loteSeleccionadoParaRegistro: Lote | null = null;
  registroDiarioActual: RegistroDiario = {
    fecha: new Date(),
    cantidadAplicada: 0,
    animalesVivos: 0,
    animalesMuertos: 0,
    animalesEnfermos: 0,
    cantidadAlimento: 0,
    tipoAlimento: '',
    porcentajeConsumido: 0,
    observaciones: '',
    procesandoRegistro: false
  };

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private planService: PlanAlimentacionService,
    private registroDiarioService: RegistroDiarioService,
    private ventasService: VentasService,
    private mortalidadService: MortalidadService,
    private router: Router
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  ngAfterViewInit(): void {
    this.initCharts();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  /**
   * Método trackBy para optimizar el renderizado de la lista de lotes
   */
  trackByLote(index: number, lote: Lote): any {
    return lote.id || index;
  }

  /**
   * Calcular el total de animales en lotes activos
   */
  getTotalAnimales(): number {
    return this.lotesActivos.reduce((total, lote) => total + lote.quantity, 0);
  }

  /**
   * Obtener la fecha seleccionada en formato string para el input date
   */
  getSelectedDateString(): string {
    return this.selectedDate.toISOString().split('T')[0];
  }

  /**
   * Validar que el registro tiene los datos mínimos necesarios
   */
  validarRegistro(lote: Lote): boolean {
    if (!lote.id) return false;
    
    const registro = this.getRegistroDiario(String(lote.id));
    return registro.cantidadAplicada > 0 && registro.animalesVivos > 0;
  }

  /**
   * Obtener rendimiento general (simulado)
   */
  getRendimientoGeneral(): number {
    if (this.lotesActivos.length === 0) return 0;
    
    // Simulación basada en promedio de días de vida y cantidad
    let rendimientoPromedio = 0;
    let totalLotes = 0;
    
    this.lotesActivos.forEach(lote => {
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      if (diasVida > 0) {
        // Simular rendimiento basado en días de vida (mejor rendimiento entre 21-42 días)
        const rendimiento = diasVida > 21 && diasVida < 42 ? 
          Math.min(95, 80 + (diasVida - 21) * 0.7) : 
          Math.max(75, 90 - Math.abs(diasVida - 35) * 0.5);
        rendimientoPromedio += rendimiento;
        totalLotes++;
      }
    });
    
    return totalLotes > 0 ? Math.round(rendimientoPromedio / totalLotes) : 85;
  }

  /**
   * Obtener eficiencia alimentaria (simulado)
   */
  getEficienciaAlimentaria(): number {
    if (this.lotesActivos.length === 0) return 0;
    
    // Simulación basada en el número de animales y etapas
    const totalAnimales = this.getTotalAnimales();
    const etapasDisponibles = this.etapasAlimentacion.length;
    
    // Más etapas y más animales = mejor eficiencia
    const eficienciaBase = 78;
    const bonusEtapas = Math.min(12, etapasDisponibles * 2);
    const bonusAnimales = Math.min(10, totalAnimales / 100);
    
    return Math.round(eficienciaBase + bonusEtapas + bonusAnimales);
  }

  /**
   * Obtener crecimiento promedio diario (simulado)
   */
  getCrecimientoPromedio(): number {
    if (this.lotesActivos.length === 0) return 0;
    
    // Simulación basada en días de vida promedio
    let diasVidaPromedio = 0;
    let totalLotes = 0;
    
    this.lotesActivos.forEach(lote => {
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      if (diasVida > 0) {
        diasVidaPromedio += diasVida;
        totalLotes++;
      }
    });
    
    if (totalLotes === 0) return 45;
    
    diasVidaPromedio = diasVidaPromedio / totalLotes;
    
    // Crecimiento típico: 45-55g por día dependiendo de la edad
    if (diasVidaPromedio < 14) return 25;
    if (diasVidaPromedio < 28) return 45;
    if (diasVidaPromedio < 42) return 55;
    return 48;
  }

  /**
   * Calcular días de vida de un lote
   */
  calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    const diffTime = Math.abs(hoy.getTime() - fechaNac.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtener etapa de alimentación actual para un lote
   */
  getEtapaActual(lote: Lote): PlanDetalle | null {
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    return this.etapasAlimentacion.find(etapa => 
      diasVida >= etapa.dayStart && diasVida <= etapa.dayEnd
    ) || null;
  }

  // Calcular cantidad total de alimento para un lote
  calcularCantidadTotal(lote: Lote, etapa: PlanDetalle): number {
    if (!etapa?.quantityPerAnimal || !lote.quantity) return 0;
    
    const cantidadTotalKg = (etapa.quantityPerAnimal * lote.quantity);
    return Math.round(cantidadTotalKg * 100) / 100; // Redondear a 2 decimales
  }

  // Inicializar registro diario para un lote
  inicializarRegistroDiario(lote: Lote): void {
    const loteId = String(lote.id || '');
    if (!loteId || this.registrosDiarios[loteId]) return;
    
    const etapa = this.getEtapaActual(lote);
    this.registrosDiarios[loteId] = {
      fecha: new Date(),
      cantidadAplicada: etapa ? this.calcularCantidadTotal(lote, etapa) : 0,
      animalesVivos: lote.quantity,
      animalesMuertos: 0,
      animalesEnfermos: 0,
      cantidadAlimento: etapa ? this.calcularCantidadTotal(lote, etapa) : 0,
      tipoAlimento: etapa?.product?.name || '',
      porcentajeConsumido: 100,
      observaciones: ''
    };
  }

  // Registrar alimentación diaria
  async registrarAlimentacionDiaria(lote: Lote): Promise<void> {
    const loteId = String(lote.id || '');
    if (!loteId) {
      console.error('❌ ID del lote no válido:', lote.codigo);
      return;
    }

    const registro = this.registrosDiarios[loteId];
    const etapa = this.getEtapaActual(lote);
    
    if (!registro || !etapa) {
      console.error('❌ No hay registro o etapa disponible para el lote:', lote.codigo);
      return;
    }

    try {
      console.log('📝 Registrando alimentación para lote:', lote.codigo);
      console.log('📊 Datos del registro:', registro);
      
      // TODO: Aquí integrar con el backend para:
      // 1. Guardar el registro de alimentación
      // 2. Actualizar stock del producto
      // 3. Actualizar cantidad de animales vivos del lote
      
      // Mock del proceso por ahora
      console.log('✅ Alimentación registrada exitosamente');
      console.log(`📉 Stock descontado: ${registro.cantidadAplicada} kg de ${etapa.product?.name || 'producto'}`);
      
      // Limpiar el registro después del éxito
      delete this.registrosDiarios[loteId];
      
    } catch (error) {
      console.error('❌ Error al registrar alimentación:', error);
    }
  }

  // Omitir alimentación del día
  omitirAlimentacion(lote: Lote): void {
    const loteId = String(lote.id || '');
    if (!loteId) return;
    
    console.log('⚠️ Alimentación omitida para lote:', lote.codigo);
    delete this.registrosDiarios[loteId];
  }

  // Formatear fecha
  formatearFecha(fecha: Date | null): string {
    if (!fecha) return '';
    
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Actualizar fecha seleccionada
   */
  updateSelectedDate(event: any): void {
    const fechaString = event.target.value;
    this.selectedDate = new Date(fechaString + 'T00:00:00');
    console.log('📅 Fecha actualizada:', this.formatearFecha(this.selectedDate));
  }

  /**
   * Manejar cambio de fecha
   */
  onDateChange(event: any): void {
    this.selectedDate = event.target.value;
  }

  /**
   * Obtener registro diario para un lote específico
   */
  getRegistroDiario(loteId: string | undefined): RegistroDiario {
    // Validar que loteId sea válido
    if (!loteId) {
      return this.getDefaultRegistroDiario();
    }

    // Si no existe el registro, crearlo
    if (!this.registrosDiarios[loteId]) {
      this.registrosDiarios[loteId] = this.getDefaultRegistroDiario();
    }
    
    return this.registrosDiarios[loteId];
  }

  /**
   * Obtener registro diario por defecto
   */
  private getDefaultRegistroDiario(): RegistroDiario {
    return {
      fecha: this.selectedDate,
      cantidadAplicada: 0,
      animalesVivos: 0,
      animalesMuertos: 0,
      animalesEnfermos: 0,
      cantidadAlimento: 0,
      tipoAlimento: '',
      porcentajeConsumido: 100,
      observaciones: ''
    };
  }

  /**
   * Actualizar registro diario
   */
  updateRegistroDiario(loteId: string | undefined, campo: string, event: any): void {
    // Validar que loteId sea válido
    if (!loteId) {
      console.warn('❌ ID del lote no válido para actualizar registro');
      return;
    }

    // Asegurar que el registro existe
    if (!this.registrosDiarios[loteId]) {
      this.registrosDiarios[loteId] = this.getDefaultRegistroDiario();
    }
    
    const valor = event.target.value;
    
    // Actualizar el campo específico
    if (campo === 'observaciones') {
      this.registrosDiarios[loteId][campo] = valor;
    } else {
      const numericValue = Number(valor);
      if (!isNaN(numericValue)) {
        (this.registrosDiarios[loteId] as any)[campo] = numericValue;
      }
    }
    
    console.log(`📝 Registro actualizado para lote ${loteId}:`, campo, valor);
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatosIniciales(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.cargarLotesPollos(),
        this.cargarEtapasAlimentacion()
      ]);
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cargar lotes de pollos
   */
  async cargarLotesPollos(): Promise<void> {
    try {
      this.loteService.getLotes().subscribe({
        next: (lotes) => {
          // Filtrar solo lotes de pollos (animal.id === 1 generalmente para pollos)
          this.lotesPollos = lotes.filter(lote => 
            lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
            lote.race?.animal?.id === 1
          );
          
          // Filtrar lotes activos (que tienen animales vivos)
          this.lotesActivos = this.lotesPollos.filter(lote => lote.quantity > 0);
          
          console.log('✅ Lotes de pollos cargados:', this.lotesPollos.length);
          console.log('✅ Lotes activos:', this.lotesActivos.length);
        },
        error: (error) => {
          console.error('❌ Error al cargar lotes:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error en cargarLotesPollos:', error);
    }
  }

  /**
   * Cargar etapas de alimentación
   */
  async cargarEtapasAlimentacion(): Promise<void> {
    try {
      this.planService.getVistaGeneralEtapas().subscribe({
        next: (etapas) => {
          // Filtrar etapas de pollos
          this.etapasAlimentacion = etapas.filter(etapa => 
            etapa.animal?.name?.toLowerCase().includes('pollo') ||
            etapa.animal?.id === 1
          );
          
          console.log('✅ Etapas de alimentación cargadas:', this.etapasAlimentacion.length);
        },
        error: (error) => {
          console.error('❌ Error al cargar etapas:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error en cargarEtapasAlimentacion:', error);
    }
  }

  // =====================
  // Gráficas (D3 + Datos reales)
  // =====================
  private initCharts(): void {
    const { start, end, totalDays } = this.getMonthRange(new Date());
    this.labels = Array.from({ length: totalDays }, (_, i) => (i + 1).toString().padStart(2, '0'));
    this.huevosPorDia = Array(totalDays).fill(0);
    this.animalesPorDia = Array(totalDays).fill(0);
    this.muertesPorCausa = [];
    this.setupResizeObserver();
    this.periodoLabelProd = 'Este mes';
    this.triedFallbackProd = false;
    this.loadAndDrawCharts(start, end, totalDays);
  }

  private setupResizeObserver(): void {
    if (!this.prodChartRef) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.drawProductionChart();
      this.drawHealthChart();
    });
    this.resizeObserver.observe(this.prodChartRef.nativeElement);
  }

  private loadAndDrawCharts(start: Date, end: Date, totalDays: number): void {
    const fmt = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    const from = fmt(start);
    const to = fmt(end);

    let completed = 0;
    const onCompleted = () => {
      completed++;
      if (completed >= 2) {
        this.drawProductionChart();
        const total = [...this.huevosPorDia, ...this.animalesPorDia].reduce((a,b)=>a+b,0);
        if (total === 0 && !this.triedFallbackProd) {
          this.triedFallbackProd = true;
          const end2 = new Date();
          const start2 = new Date(); start2.setDate(end2.getDate() - 29);
          const totalDays2 = Math.max(1, Math.floor((+end2 - +start2)/(1000*60*60*24)) + 1);
          this.labels = Array.from({ length: totalDays2 }, (_, i) => (i + 1).toString().padStart(2, '0'));
          this.huevosPorDia = Array(totalDays2).fill(0);
          this.animalesPorDia = Array(totalDays2).fill(0);
          this.periodoLabelProd = 'Últimos 30 días';
          this.loadAndDrawCharts(start2, end2, totalDays2);
        }
      }
    };

    this.ventasService.listarVentasHuevos(from, to).subscribe({
      next: huevos => {
        (huevos || []).forEach(v => {
          const fd = this.safeDate(v?.fecha);
          const idx = Math.floor((+fd - +new Date(start)) / (1000 * 60 * 60 * 24));
          if (idx >= 0 && idx < totalDays) this.huevosPorDia[idx] += Number(v?.cantidad) || 0;
        });
      },
      error: () => {},
      complete: onCompleted
    });

    this.ventasService.listarVentasAnimales(from, to).subscribe({
      next: animales => {
        (animales || []).forEach(v => {
          const fd = this.safeDate(v?.fecha);
          const idx = Math.floor((+fd - +new Date(start)) / (1000 * 60 * 60 * 24));
          if (idx >= 0 && idx < totalDays) this.animalesPorDia[idx] += Number(v?.cantidad) || 0;
        });
      },
      error: () => {},
      complete: onCompleted
    });

    this.mortalidadService.getEstadisticas(start, end).subscribe({
      next: (est) => {
        let data: { causa: string; muertes: number }[] = [];
        // Soportar distintas formas de respuesta del backend
        if (Array.isArray((est as any)?.muertesPorCausa)) {
          data = (est as any).muertesPorCausa as any[];
        } else if (Array.isArray((est as any)?.estadisticasPorCausa)) {
          // Backend devuelve List<Object[]> -> [causa, muertes]
          data = ((est as any).estadisticasPorCausa as any[]).map((row: any) => {
            if (Array.isArray(row)) {
              return { causa: String(row[0] ?? 'Desconocida'), muertes: Number(row[1] ?? 0) };
            }
            // Si ya viniese como objeto con claves
            return { causa: String(row?.causa ?? 'Desconocida'), muertes: Number(row?.muertes ?? 0) };
          });
        }
        this.muertesPorCausa = data;
        this.drawHealthChart();
      },
      error: () => {
        const filtros: any = { fechaInicio: from, fechaFin: to };
        this.mortalidadService.getRegistrosMortalidad(filtros).subscribe({
          next: (regs) => {
            const map: Record<string, number> = {};
            (regs || []).forEach(r => {
              const nombre = r?.causa?.nombre || 'Desconocida';
              map[nombre] = (map[nombre] || 0) + (Number(r?.cantidadMuertos) || 0);
            });
            this.muertesPorCausa = Object.entries(map).map(([causa, muertes]) => ({ causa, muertes }));
            this.drawHealthChart();
          },
          error: () => this.drawHealthChart()
        });
      }
    });
  }

  private getMonthRange(date: Date): { start: Date; end: Date; totalDays: number } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end, totalDays: end.getDate() };
  }

  private safeDate(f: any): Date {
    try {
      if (Array.isArray(f) && f.length >= 3) return new Date(Number(f[0]), Number(f[1]) - 1, Number(f[2]));
      const s = String(f);
      return new Date(s.split('T')[0]);
    } catch { return new Date('1970-01-01'); }
  }

  private toUtcMillis(d: Date): number {
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private clear(el: HTMLElement) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  private drawProductionChart(): void {
    if (!this.prodChartRef) return;
    const host = this.prodChartRef.nativeElement;
    this.clear(host);
    const width = host.clientWidth || 300;
    const height = host.clientHeight || 240;
    const margin = { top: 10, right: 16, bottom: 28, left: 36 };
    const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand<string>().domain(this.labels).range([0, innerW]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max([...this.huevosPorDia, ...this.animalesPorDia])! * 1.2 + 1]).nice().range([innerH, 0]);
    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).tickValues(this.labels.filter((_, i) => (i % Math.ceil(Math.max(1, this.labels.length / 10))) === 0)));
    g.append('g').call(d3.axisLeft(y));
    const groupW = x.bandwidth();
    const barW = groupW / 2;
    g.selectAll('.bar-h').data(this.huevosPorDia).enter().append('rect')
      .attr('x', (_, i) => (x(this.labels[i]) ?? 0))
      .attr('y', d => y(d))
      .attr('width', barW)
      .attr('height', d => innerH - y(d))
      .attr('fill', '#7A9BCB')
      .append('title').text(d => String(d));
    g.selectAll('.bar-a').data(this.animalesPorDia).enter().append('rect')
      .attr('x', (_, i) => (x(this.labels[i]) ?? 0) + barW)
      .attr('y', d => y(d))
      .attr('width', barW)
      .attr('height', d => innerH - y(d))
      .attr('fill', '#9DBDD1')
      .append('title').text(d => String(d));
    const total = [...this.huevosPorDia, ...this.animalesPorDia].reduce((a,b)=>a+b,0);
    if (total === 0) {
      g.append('text')
        .attr('x', innerW/2)
        .attr('y', innerH/2)
        .attr('text-anchor','middle')
        .attr('fill','#94a3b8')
        .style('font-size','12px')
        .text('Sin datos para el periodo');
    }
  }

  private drawHealthChart(): void {
    if (!this.saludChartRef) return;
    const host = this.saludChartRef.nativeElement;
    this.clear(host);
    const width = host.clientWidth || 300;
    const height = host.clientHeight || 240;
    const margin = { top: 10, right: 16, bottom: 28, left: 120 };
    const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const data = (this.muertesPorCausa || []).slice().sort((a, b) => (b.muertes || 0) - (a.muertes || 0)).slice(0, 6);
    const y = d3.scaleBand<string>().domain(data.map(d => d.causa)).range([0, innerH]).padding(0.2);
    const maxVal = (data.length ? (d3.max(data, d => d.muertes) || 0) : 0);
    const x = d3.scaleLinear().domain([0, maxVal * 1.2 + 1]).nice().range([0, innerW]);
    g.append('g').call(d3.axisLeft(y));
    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x));
    g.selectAll('.bar-health').data(data).enter().append('rect')
      .attr('x', 0)
      .attr('y', d => y(d.causa)!)
      .attr('width', d => x(d.muertes))
      .attr('height', y.bandwidth())
      .attr('fill', '#ef4444')
      .append('title').text(d => String(d.muertes));
    if (!data.length) {
      g.append('text')
        .attr('x', innerW/2)
        .attr('y', innerH/2)
        .attr('text-anchor','middle')
        .attr('fill','#94a3b8')
        .style('font-size','12px')
        .text('Sin datos para el periodo');
    }
  }

  // ✅ MÉTODOS PARA FORMULARIO DE REGISTRO DIARIO

  /**
   * Abrir formulario de registro diario para un lote
   */
  abrirFormularioRegistro(lote: Lote): void {
    this.loteSeleccionadoParaRegistro = lote;
    this.mostrarFormularioRegistro = true;
    
    // Inicializar con valores del lote actual
    this.registroDiarioActual = {
      fecha: new Date(),
      cantidadAplicada: 0,
      animalesVivos: lote.quantity,
      animalesMuertos: 0,
      animalesEnfermos: 0,
      cantidadAlimento: 0,
      tipoAlimento: '',
      porcentajeConsumido: 100,
      observaciones: '',
      procesandoRegistro: false
    };
  }

  /**
   * Cerrar formulario de registro diario
   */
  cerrarFormularioRegistro(): void {
    this.mostrarFormularioRegistro = false;
    this.loteSeleccionadoParaRegistro = null;
  }

  /**
   * Procesar registro diario - IMPLEMENTACIÓN REAL CON BACKEND
   */
  async procesarRegistroDiario(): Promise<void> {
    if (!this.loteSeleccionadoParaRegistro) return;
    
    console.log('🔄 Procesando registro diario REAL:', this.registroDiarioActual);
    
    this.registroDiarioActual.procesandoRegistro = true;
    
    try {
      // Crear objeto de registro completo
      const registroCompleto: RegistroDiarioCompleto = {
        loteId: this.loteSeleccionadoParaRegistro.id!,
        fecha: this.registroDiarioActual.fecha,
        animalesMuertos: this.registroDiarioActual.animalesMuertos,
        animalesEnfermos: this.registroDiarioActual.animalesEnfermos,
        tipoAlimento: this.registroDiarioActual.tipoAlimento,
        cantidadAlimento: this.registroDiarioActual.cantidadAlimento,
        observaciones: this.registroDiarioActual.observaciones,
        usuario: this.user?.username || 'Sistema'
      };

      // Procesar con el servicio integrado
      const resultado = await this.registroDiarioService.procesarRegistroDiarioCompleto(registroCompleto).toPromise();

      console.log('✅ Resultado del procesamiento:', resultado);

      if (resultado && resultado.success) {
        // Mostrar mensaje de éxito
        const mensajes = [];
        if (resultado.resultados.loteActualizado) mensajes.push('✅ Cantidad de animales actualizada');
        if (resultado.resultados.mortalidadRegistrada) mensajes.push('✅ Mortalidad registrada');
        if (resultado.resultados.morbilidadRegistrada) mensajes.push('✅ Morbilidad registrada');
        if (resultado.resultados.inventarioDescontado) mensajes.push('✅ Inventario actualizado');

        alert(`Registro diario procesado exitosamente:\n\n${mensajes.join('\n')}`);

        // REDIRECCIÓN AUTOMÁTICA
        await this.redirigirSegunRegistros();

      } else {
        // Mostrar errores específicos
        const errores = resultado?.errores || ['Error desconocido'];
        alert(`Errores en el procesamiento:\n\n${errores.join('\n')}`);
      }

      // Cerrar formulario y recargar datos
      this.cerrarFormularioRegistro();
      this.cargarDatosIniciales();
      
    } catch (error) {
      console.error('❌ Error crítico al procesar registro diario:', error);
      alert(`Error crítico: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      this.registroDiarioActual.procesandoRegistro = false;
    }
  }

  /**
   * Redirigir según registros - FUNCIONALIDAD CLAVE
   */
  private async redirigirSegunRegistros(): Promise<void> {
    const { animalesMuertos, animalesEnfermos } = this.registroDiarioActual;
    
    if (animalesMuertos > 0 && animalesEnfermos > 0) {
      // Ambos casos: primero morbilidad, luego mortalidad
      console.log('🔄 Redirigiendo a morbilidad y luego mortalidad...');
      
      // Preparar datos para morbilidad
      const datosMorbilidad = {
        loteId: this.loteSeleccionadoParaRegistro?.id,
        cantidadEnfermos: animalesEnfermos,
        fecha: this.registroDiarioActual.fecha,
        observaciones: this.registroDiarioActual.observaciones
      };
      
      // Ir a morbilidad con datos
      this.router.navigate(['/pollos/morbilidad'], { 
        queryParams: { 
          autoRegistro: 'true', 
          datos: JSON.stringify(datosMorbilidad) 
        } 
      });
      
    } else if (animalesMuertos > 0) {
      // Solo mortalidad
      console.log('🔄 Redirigiendo a mortalidad...');
      
      const datosMortalidad = {
        loteId: this.loteSeleccionadoParaRegistro?.id,
        cantidadMuertos: animalesMuertos,
        fecha: this.registroDiarioActual.fecha,
        observaciones: this.registroDiarioActual.observaciones
      };
      
      this.router.navigate(['/pollos/mortalidad'], { 
        queryParams: { 
          autoRegistro: 'true', 
          datos: JSON.stringify(datosMortalidad) 
        } 
      });
      
    } else if (animalesEnfermos > 0) {
      // Solo morbilidad
      console.log('🔄 Redirigiendo a morbilidad...');
      
      const datosMorbilidad = {
        loteId: this.loteSeleccionadoParaRegistro?.id,
        cantidadEnfermos: animalesEnfermos,
        fecha: this.registroDiarioActual.fecha,
        observaciones: this.registroDiarioActual.observaciones
      };
      
      this.router.navigate(['/pollos/morbilidad'], { 
        queryParams: { 
          autoRegistro: 'true', 
          datos: JSON.stringify(datosMorbilidad) 
        } 
      });
    }
  }

  /**
   * Validar formulario de registro diario
   */
  validarFormularioRegistro(): boolean {
    const { animalesVivos, animalesMuertos, animalesEnfermos } = this.registroDiarioActual;
    
    // Validar que el total no exceda los animales disponibles
    const totalRegistrado = animalesMuertos + animalesEnfermos;
    if (totalRegistrado > animalesVivos) {
      alert('El total de animales registrados no puede exceder la cantidad disponible en el lote.');
      return false;
    }
    
    // Al menos debe haber algún registro
    if (totalRegistrado === 0 && this.registroDiarioActual.cantidadAlimento === 0) {
      alert('Debe registrar al menos un evento (mortalidad, morbilidad o consumo de alimento).');
      return false;
    }
    
    return true;
  }
}

// Interfaz para el registro diario
interface RegistroDiario {
  fecha: Date;
  cantidadAplicada: number;
  animalesVivos: number;
  animalesMuertos: number;
  animalesEnfermos: number;
  cantidadAlimento: number;
  tipoAlimento: string;
  porcentajeConsumido: number;
  observaciones: string;
  procesandoRegistro?: boolean;
}