import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { InventarioEntradasService, InventarioEntrada } from './inventario-entradas.service';

export interface AlertaInventario {
  tipo: 'agotado' | 'critico' | 'por_vencer' | 'vencido';
  producto: string;
  productId?: number;
  mensaje: string;
  fechaVencimiento?: string;
  stockActual?: number;
  stockMinimo?: number;
  prioridad: 'alta' | 'media' | 'baja';
}

export interface ResumenAlertas {
  agotados: number;
  criticos: number;
  porVencer: number;
  vencidos: number;
  total: number;
  alertas: AlertaInventario[];
}

@Injectable({ providedIn: 'root' })
export class NotificacionesInventarioService {
  
  private resumenAlertasSubject = new BehaviorSubject<ResumenAlertas>({
    agotados: 0,
    criticos: 0,
    porVencer: 0,
    vencidos: 0,
    total: 0,
    alertas: []
  });
  
  public resumenAlertas$ = this.resumenAlertasSubject.asObservable();
  
  private sonidoHabilitado = true;
  private audioNotificacion: HTMLAudioElement | null = null;
  
  // Almacenar alertas mostradas para no repetir
  private alertasMostradas = new Set<string>();
  
  constructor(private entradasService: InventarioEntradasService) {
    this.inicializarAudio();
  }

  /**
   * Inicializar el audio de notificación
   */
  private inicializarAudio(): void {
    try {
      this.audioNotificacion = new Audio();
      // Sonido simple de notificación (beep)
      this.audioNotificacion.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQo7m+PbrHkdEEiT4OyqjzgtRZfn8bSaQCo+oe/0wqBJKUWo8/m/n1AoPafz+MCgUSg9qPP4v6BRJ0Cp8/e/oFEoQKjz97+gUShAqPP3v6BRKD+o8/e/n1EoP6jz97+fUSg/qPP3v59RKD+o8/e/n1EoPqjz97+fUig+qPP3v59SKD6o8/e/n1IoPqjz97+fUig+qPP3v59SKD6o8/e/nlIoPajz97+eUig9qPP3v55SKD2o8/e/nlIoPajz97+eUig9qPP3v55RKD2o8/e/nlEoPKjz97+eUSg8qPP3v55RKDyo8/e/nlEoPKjz97+dUSg8p/P3v51RKDyn8/e/nVEoO6fz97+dUSg7p/P3v51RKDun8/e/nVEoO6fz97+dUSg7p/P3v51RKDqn8/e/nFEoOqfz97+cUSg6p/P3v5xRKDqn8/e/nFEoOqfz97+cUSg6p/P3v5xRKDqn8/e/nFAoOafz97+cUCg5p/P3v5xQKDmn8/e/nFAoOafz97+cUCg5p/P3v5xQKDmn8/e/m1AoOKfz97+bUCg4p/P3v5tQKDin8/e/m1AoOKfz97+bUCg4p/P3v5tQKDin8/e/m1AoOKfz97+bUCg4pvP3v5pQKDem8/e/mlAoN6bz97+aUCg3pvP3v5pQKDem8/e/mlAoN6bz97+aUCg3pvP3v5pQKDam8/e/mlAoNqbz97+ZUCg2pvP3v5lQKDam8/e/mVAoNqbz97+ZUCg2pvP3v5lQKDam8/e/mVAoNqbz97+ZUCg1pvP3v5lQKDWm8/e/mVAoNabz97+ZUCg1pvP3v5hQKDSm8/e/mFAoNKbz97+YUCg0pvP3v5hQKDSm8/e/mFAoNKbz97+YUCg0pvP3v5hQKDSm8/e/mFAoNKXz97+YUCgzpfP3v5hQKDOl8/e/l1AoM6Xz97+XUCgzpfP3v5dQKDOl8/e/l1AoM6Xz97+XUCgzpfP3v5dQKDOl8/e/l1AoM6Xz97+XUCgypfP3v5dQKDKl8/e/l1AoMqXz97+XUCgypfP3v5ZQKDGl8/e/llAoMaXz97+WUCgxpfP3v5ZQKDGl8/e/llAoMaXz97+WUCgxpfP3v5ZQKDGl8/e/llAoMaTz97+WUCgwpPP3v5ZQKDCk8/e/llAoMKTz97+VUCgwpPP3v5VQKDCk8/e/lVAoMKTz97+VUCgwpPP3v5VQKDCk8/e/lVAoMKTz97+VUCgvpPP3v5VQKw==';
      this.audioNotificacion.volume = 0.5;
    } catch (e) {
      console.warn('No se pudo inicializar el audio de notificación');
    }
  }

  /**
   * Cargar y actualizar el resumen de alertas
   */
  cargarAlertas(diasAlerta: number = 15): void {
    const resumen: ResumenAlertas = {
      agotados: 0,
      criticos: 0,
      porVencer: 0,
      vencidos: 0,
      total: 0,
      alertas: []
    };

    // Cargar vencidos
    this.entradasService.vencidas().subscribe({
      next: (vencidas) => {
        resumen.vencidos = vencidas?.length || 0;
        vencidas?.forEach(e => {
          resumen.alertas.push({
            tipo: 'vencido',
            producto: e.product?.name || 'Producto',
            productId: e.product?.id,
            mensaje: `${e.product?.name} tiene stock vencido`,
            fechaVencimiento: e.fechaVencimiento,
            prioridad: 'alta'
          });
        });
        this.actualizarTotal(resumen);
      }
    });

    // Cargar por vencer
    this.entradasService.porVencer(undefined, diasAlerta).subscribe({
      next: (porVencer) => {
        resumen.porVencer = porVencer?.length || 0;
        porVencer?.forEach(e => {
          resumen.alertas.push({
            tipo: 'por_vencer',
            producto: e.product?.name || 'Producto',
            productId: e.product?.id,
            mensaje: `${e.product?.name} vence pronto`,
            fechaVencimiento: e.fechaVencimiento,
            prioridad: 'media'
          });
        });
        this.actualizarTotal(resumen);
      }
    });
  }

  private actualizarTotal(resumen: ResumenAlertas): void {
    resumen.total = resumen.agotados + resumen.criticos + resumen.porVencer + resumen.vencidos;
    this.resumenAlertasSubject.next({ ...resumen });
  }

  /**
   * Actualizar contadores de agotados y críticos (llamar desde componente de inventario)
   */
  actualizarContadoresStock(agotados: number, criticos: number, alertas: AlertaInventario[] = []): void {
    const resumenActual = this.resumenAlertasSubject.getValue();
    resumenActual.agotados = agotados;
    resumenActual.criticos = criticos;
    
    // Agregar alertas de stock
    const alertasStock = alertas.filter(a => a.tipo === 'agotado' || a.tipo === 'critico');
    const alertasSinStock = resumenActual.alertas.filter(a => a.tipo !== 'agotado' && a.tipo !== 'critico');
    resumenActual.alertas = [...alertasSinStock, ...alertasStock];
    
    this.actualizarTotal(resumenActual);
  }

  /**
   * Obtener resumen actual
   */
  getResumenActual(): ResumenAlertas {
    return this.resumenAlertasSubject.getValue();
  }

  /**
   * Reproducir sonido de notificación
   */
  reproducirSonido(): void {
    if (this.sonidoHabilitado && this.audioNotificacion) {
      try {
        this.audioNotificacion.currentTime = 0;
        this.audioNotificacion.play().catch(() => {});
      } catch (e) {}
    }
  }

  /**
   * Habilitar/deshabilitar sonido
   */
  toggleSonido(): boolean {
    this.sonidoHabilitado = !this.sonidoHabilitado;
    localStorage.setItem('notif_sonido', this.sonidoHabilitado ? '1' : '0');
    return this.sonidoHabilitado;
  }

  /**
   * Obtener estado del sonido
   */
  isSonidoHabilitado(): boolean {
    const stored = localStorage.getItem('notif_sonido');
    if (stored !== null) {
      this.sonidoHabilitado = stored === '1';
    }
    return this.sonidoHabilitado;
  }

  /**
   * Verificar si debe mostrar toast (solo una vez por sesión)
   */
  debeMostrarToast(): boolean {
    const mostrado = sessionStorage.getItem('toast_alertas_mostrado');
    return mostrado !== '1';
  }

  /**
   * Marcar toast como mostrado
   */
  marcarToastMostrado(): void {
    sessionStorage.setItem('toast_alertas_mostrado', '1');
  }

  /**
   * Generar mensaje para toast
   */
  generarMensajeToast(): string {
    const resumen = this.getResumenActual();
    const partes: string[] = [];
    
    if (resumen.agotados > 0) {
      partes.push(`${resumen.agotados} agotado${resumen.agotados > 1 ? 's' : ''}`);
    }
    if (resumen.criticos > 0) {
      partes.push(`${resumen.criticos} crítico${resumen.criticos > 1 ? 's' : ''}`);
    }
    if (resumen.porVencer > 0) {
      partes.push(`${resumen.porVencer} por vencer`);
    }
    if (resumen.vencidos > 0) {
      partes.push(`${resumen.vencidos} vencido${resumen.vencidos > 1 ? 's' : ''}`);
    }
    
    if (partes.length === 0) {
      return '';
    }
    
    return `⚠️ Alertas de inventario: ${partes.join(', ')}`;
  }
}
