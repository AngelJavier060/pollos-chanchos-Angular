import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '../../shared/models/user.model';
import { NotificacionesInventarioService, ResumenAlertas } from '../../shared/services/notificaciones-inventario.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {

  adminName: string = '';
  displayName: string = 'Usuario'; // Propiedad estable para el nombre
  isUserMenuOpen: boolean = false;
  currentUser: User | null = null;
  avatarUrl: string = 'assets/img/default-avatar.png';
  inventarioOpen: boolean = false;

  // Notificaciones de inventario
  totalAlertas: number = 0;
  sonidoHabilitado: boolean = true;
  mostrarToastAlertas: boolean = false;
  mensajeToast: string = '';
  private alertasSub: Subscription | null = null;
  private refreshSub: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notificacionesService: NotificacionesInventarioService
  ) { }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.adminName = currentUser.username;
      this.currentUser = currentUser;
      this.updateAvatarUrl();
    }
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      // Usar setTimeout para evitar el error de detección de cambios
      setTimeout(() => {
        this.updateAvatarUrl();
        this.cdr.detectChanges();
      });
    });

    // Inicializar sistema de notificaciones
    this.sonidoHabilitado = this.notificacionesService.isSonidoHabilitado();
    this.cargarAlertas();
    
    // Suscribirse a cambios en las alertas
    this.alertasSub = this.notificacionesService.resumenAlertas$.subscribe(resumen => {
      const anteriorTotal = this.totalAlertas;
      this.totalAlertas = resumen.total;
      
      // Mostrar toast si hay nuevas alertas al iniciar sesión
      if (this.notificacionesService.debeMostrarToast() && resumen.total > 0) {
        this.mensajeToast = this.notificacionesService.generarMensajeToast();
        if (this.mensajeToast) {
          this.mostrarToastAlertas = true;
          this.notificacionesService.marcarToastMostrado();
          if (this.sonidoHabilitado) {
            this.notificacionesService.reproducirSonido();
          }
          // Auto-cerrar después de 10 segundos
          setTimeout(() => this.cerrarToast(), 10000);
        }
      }
      
      this.cdr.detectChanges();
    });

    // Refrescar alertas cada 5 minutos
    this.refreshSub = interval(300000).subscribe(() => {
      this.cargarAlertas();
    });
  }

  ngOnDestroy(): void {
    this.alertasSub?.unsubscribe();
    this.refreshSub?.unsubscribe();
  }

  private cargarAlertas(): void {
    this.notificacionesService.cargarAlertas(15);
  }

  private updateAvatarUrl(): void {
    const newAvatarUrl = this.currentUser?.profilePicture || (this.currentUser as any)?.photoUrl || 'assets/img/default-avatar.png';
    if (this.avatarUrl !== newAvatarUrl) {
      this.avatarUrl = newAvatarUrl;
    }
    
    // Actualizar también el nombre de manera estable
    const newDisplayName = this.currentUser?.name || this.currentUser?.username || 'Usuario';
    if (this.displayName !== newDisplayName) {
      this.displayName = newDisplayName;
    }
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  navegarA(path: string): void {
    this.router.navigate([`/admin/${path}`]);
    this.closeUserMenu();
    this.inventarioOpen = false;
  }

  navegarAInventario(tab: 'productos' | 'inventario-automatico' | 'entradas' | 'alertas' | 'botiquin'): void {
    this.router.navigate(['/admin/inventario'], { queryParams: { tab } });
    this.closeUserMenu();
    this.inventarioOpen = false;
  }

  navegarAPerfil(): void {
    this.router.navigate(['/admin/profile']);
    this.closeUserMenu();
  }

  navegarAConfiguraciones(): void {
    this.router.navigate(['/admin/configuracion']);
    this.closeUserMenu();
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleInventario(): void {
    this.inventarioOpen = !this.inventarioOpen;
  }

  // Métodos de notificaciones
  toggleSonido(): void {
    this.sonidoHabilitado = this.notificacionesService.toggleSonido();
  }

  cerrarToast(): void {
    this.mostrarToastAlertas = false;
  }

  verAlertas(): void {
    this.cerrarToast();
    this.navegarAInventario('alertas');
  }
}