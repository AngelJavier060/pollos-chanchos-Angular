import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { PlanAlimentacionService } from '../plan-nutricional/services/plan-alimentacion.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-chanchos-dashboard',
  templateUrl: './chanchos-dashboard.component.html',
  styleUrls: ['./chanchos-dashboard.component.scss']
})
export class ChanchosDashboardComponent implements OnInit, OnDestroy {
  user: User | null = null;
  isUserMenuOpen = false;
  isSidebarCollapsed = false;
  isDarkMode = false; // Tema claro/oscuro

  // Estadísticas en tiempo real
  sidebarStats = {
    lotesActivos: 0,
    totalChanchos: 0,
    lotesEnProduccion: 0,
    rendimientoPromedio: 0
  };

  // Métricas de alimentación
  alimentacionProgress = 75; // Porcentaje de alimentación completada
  saludGeneral = 'Excelente';
  tareasPendientes = 2;

  // Suscripciones para limpieza
  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private planService: PlanAlimentacionService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
    this.cargarEstadisticasIniciales();
    this.iniciarActualizacionEnTiempoReal();
    
    // Listener para cerrar el menú al hacer clic fuera
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const userMenu = document.querySelector('.user-menu-container');
      if (userMenu && !userMenu.contains(target)) {
        this.isUserMenuOpen = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Obtener estadísticas del sidebar
   */
  getSidebarStats() {
    return this.sidebarStats;
  }

  /**
   * Obtener progreso de alimentación
   */
  getAlimentacionProgress(): number {
    return this.alimentacionProgress;
  }

  /**
   * Obtener salud general
   */
  getSaludGeneral(): string {
    return this.saludGeneral;
  }

  /**
   * Obtener tareas pendientes
   */
  getTareasPendientes(): number {
    return this.tareasPendientes;
  }

  /**
   * Toggle del colapso del sidebar
   */
  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  /**
   * Toggle del tema claro/oscuro
   */
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  /**
   * Verificar si el usuario es ADMIN (para mostrar opciones como Inventario)
   */
  isAdmin(): boolean {
    const roles = this.user?.roles || [];
    return roles.includes('ROLE_ADMIN') || roles.includes('ADMIN');
  }

  /**
   * Cargar estadísticas iniciales
   */
  private cargarEstadisticasIniciales(): void {
    const lotesSub = this.loteService.getLotes().subscribe({
      next: (lotes) => {
        // Filtrar solo lotes de chanchos
        const lotesChanchos = lotes.filter(lote => 
          lote.race?.animal?.name?.toLowerCase().includes('chancho') ||
          lote.race?.animal?.name?.toLowerCase().includes('cerdo') ||
          lote.race?.animal?.id === 2
        );
        
        // Calcular estadísticas
        this.sidebarStats.lotesActivos = lotesChanchos.filter(lote => lote.quantity > 0).length;
        this.sidebarStats.totalChanchos = lotesChanchos.reduce((total, lote) => total + lote.quantity, 0);
        this.sidebarStats.lotesEnProduccion = lotesChanchos.filter(lote => 
          lote.quantity > 0 && this.calcularDiasDeVida(lote.birthdate) > 0
        ).length;
        
        this.calcularRendimientoPromedio(lotesChanchos);
        this.actualizarProgresoAlimentacion();
      },
      error: (error) => {
        console.error('❌ Error al cargar estadísticas de lotes:', error);
      }
    });

    this.subscriptions.add(lotesSub);
  }

  /**
   * Iniciar actualización en tiempo real
   */
  private iniciarActualizacionEnTiempoReal(): void {
    const timerSub = interval(30000).subscribe(() => {
      this.cargarEstadisticasIniciales();
      this.simularCambiosEnTiempoReal();
    });

    this.subscriptions.add(timerSub);
  }

  /**
   * Simular cambios en tiempo real
   */
  private simularCambiosEnTiempoReal(): void {
    const variacion = Math.random() * 10 - 5;
    this.alimentacionProgress = Math.max(0, Math.min(100, this.alimentacionProgress + variacion));
    
    if (Math.random() < 0.3) {
      this.tareasPendientes = Math.max(0, this.tareasPendientes + (Math.random() > 0.5 ? 1 : -1));
    }

    this.actualizarSaludGeneral();
  }

  /**
   * Calcular días de vida de un lote
   */
  private calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    const diffTime = Math.abs(hoy.getTime() - fechaNac.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcular rendimiento promedio
   */
  private calcularRendimientoPromedio(lotes: any[]): void {
    if (lotes.length === 0) {
      this.sidebarStats.rendimientoPromedio = 0;
      return;
    }

    let rendimientoTotal = 0;
    let lotesConRendimiento = 0;

    lotes.forEach(lote => {
      if (lote.quantity > 0) {
        const diasVida = this.calcularDiasDeVida(lote.birthdate);
        if (diasVida > 7) {
          const rendimiento = Math.max(70, Math.min(95, 85 + (Math.random() * 10 - 5)));
          rendimientoTotal += rendimiento;
          lotesConRendimiento++;
        }
      }
    });

    this.sidebarStats.rendimientoPromedio = lotesConRendimiento > 0 
      ? Math.round(rendimientoTotal / lotesConRendimiento) 
      : 0;
  }

  /**
   * Actualizar progreso de alimentación
   */
  private actualizarProgresoAlimentacion(): void {
    const ahora = new Date();
    const hora = ahora.getHours();
    
    if (hora < 6) {
      this.alimentacionProgress = 10;
    } else if (hora < 12) {
      this.alimentacionProgress = 45;
    } else if (hora < 18) {
      this.alimentacionProgress = 75;
    } else {
      this.alimentacionProgress = 90;
    }
  }

  /**
   * Actualizar estado de salud general
   */
  private actualizarSaludGeneral(): void {
    if (this.alimentacionProgress > 80 && this.tareasPendientes < 3) {
      this.saludGeneral = 'Excelente';
    } else if (this.alimentacionProgress > 60 && this.tareasPendientes < 5) {
      this.saludGeneral = 'Bueno';
    } else if (this.alimentacionProgress > 40) {
      this.saludGeneral = 'Regular';
    } else {
      this.saludGeneral = 'Requiere Atención';
    }
  }

  /**
   * Obtener color del indicador de salud
   */
  getSaludColor(): string {
    switch (this.saludGeneral) {
      case 'Excelente': return 'text-green-600';
      case 'Bueno': return 'text-blue-600';
      case 'Regular': return 'text-yellow-600';
      case 'Requiere Atención': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  /**
   * Obtener icono del indicador de salud
   */
  getSaludIcon(): string {
    switch (this.saludGeneral) {
      case 'Excelente': return 'fas fa-heart';
      case 'Bueno': return 'fas fa-thumbs-up';
      case 'Regular': return 'fas fa-exclamation-triangle';
      case 'Requiere Atención': return 'fas fa-exclamation-circle';
      default: return 'fas fa-question-circle';
    }
  }

  /**
   * Obtener estadísticas adicionales
   */
  getEstadisticasDetalladas() {
    return {
      ...this.sidebarStats,
      alimentacionCompletada: this.alimentacionProgress,
      saludGeneral: this.saludGeneral,
      tareasPendientes: this.tareasPendientes,
      ultimaActualizacion: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      this.authService.logout();
    }
  }
} 