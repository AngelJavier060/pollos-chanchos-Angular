import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { PlanEjecucionServiceFront, AlertaRapida } from '../../shared/services/plan-ejecucion.service';

@Component({
  selector: 'app-chanchos-dashboard-home',
  templateUrl: './chanchos-dashboard-home.component.html',
  styleUrls: ['./chanchos-dashboard.component.scss']
})
export class ChanchosDashboardHomeComponent implements OnInit {
  user: User | null = null;
  loading = false;

  // Métricas principales
  metricas = {
    totalLotes: 0,
    lotesActivos: 0,
    totalChanchos: 0,
    promedioEdad: 0
  };

  // Datos para gráficos (simulados)
  produccionMensual = [
    { mes: 'Enero', valor: 125 },
    { mes: 'Febrero', valor: 145 },
    { mes: 'Marzo', valor: 165 },
    { mes: 'Abril', valor: 155 },
    { mes: 'Mayo', valor: 175 },
    { mes: 'Junio', valor: 185 }
  ];

  estadoSalud = {
    excelente: 75,
    bueno: 20,
    regular: 5,
    critico: 0
  };

  // Resumen ejecutivo
  resumenEjecutivo = {
    tendenciaProduccion: 'Positiva',
    alertasActivas: 0,
    eficienciaGeneral: 88
  };

  // Alertas rápidas próximas
  alertas: AlertaRapida[] = [];

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private planEjecucionServiceFront: PlanEjecucionServiceFront
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  /**
   * Cargar datos del dashboard
   */
  async cargarDatos(): Promise<void> {
    this.loading = true;
    try {
      await this.cargarMetricas();
      await this.cargarAlertas();
    } catch (error) {
      console.error('❌ Error al cargar datos del dashboard:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cargar alertas próximas (por defecto 7 días)
   */
  async cargarAlertas(): Promise<void> {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      this.planEjecucionServiceFront.getAlertas(7, hoy).subscribe({
        next: (res) => {
          this.alertas = res || [];
          this.resumenEjecutivo.alertasActivas = this.alertas.length;
          console.log('🔔 Alertas próximas:', this.alertas);
        },
        error: (err) => {
          console.error('❌ Error cargando alertas:', err);
          this.alertas = [];
          this.resumenEjecutivo.alertasActivas = 0;
        }
      });
    } catch (e) {
      console.error('❌ Error inesperado cargando alertas:', e);
    }
  }

  /**
   * Cargar métricas principales
   */
  async cargarMetricas(): Promise<void> {
    try {
      const lotes = await this.loteService.getLotes().toPromise();
      
      // Filtrar solo lotes de chanchos
      const lotesChanchos = lotes.filter(lote => 
        lote.race?.animal?.name?.toLowerCase().includes('chancho') ||
        lote.race?.animal?.name?.toLowerCase().includes('cerdo') ||
        lote.race?.animal?.id === 2
      );

      this.metricas.totalLotes = lotesChanchos.length;
      this.metricas.lotesActivos = lotesChanchos.filter(lote => lote.quantity > 0).length;
      this.metricas.totalChanchos = lotesChanchos.reduce((total, lote) => total + lote.quantity, 0);

      // Calcular promedio de edad
      const lotesConFecha = lotesChanchos.filter(lote => lote.birthdate);
      if (lotesConFecha.length > 0) {
        const edadTotal = lotesConFecha.reduce((total, lote) => 
          total + this.calcularDiasDeVida(lote.birthdate), 0);
        this.metricas.promedioEdad = Math.round(edadTotal / lotesConFecha.length);
      }

      console.log('📊 Métricas de chanchos cargadas:', this.metricas);
    } catch (error) {
      console.error('❌ Error al cargar métricas:', error);
    }
  }

  /**
   * Calcular días de vida
   */
  private calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    const diffTime = Math.abs(hoy.getTime() - fechaNac.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtener el máximo valor de producción para el gráfico
   */
  getMaxProduccion(): number {
    return Math.max(...this.produccionMensual.map(item => item.valor));
  }

  /**
   * Obtener porcentaje para barra de gráfico
   */
  getBarHeight(valor: number): number {
    const max = this.getMaxProduccion();
    return (valor / max) * 100;
  }

  /**
   * Obtener color de la tendencia
   */
  getTendenciaColor(): string {
    switch (this.resumenEjecutivo.tendenciaProduccion) {
      case 'Positiva': return 'text-green-600';
      case 'Negativa': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  }

  /**
   * Obtener icono de la tendencia
   */
  getTendenciaIcon(): string {
    switch (this.resumenEjecutivo.tendenciaProduccion) {
      case 'Positiva': return 'fas fa-arrow-up';
      case 'Negativa': return 'fas fa-arrow-down';
      default: return 'fas fa-minus';
    }
  }
} 