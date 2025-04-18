import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  adminName: string = 'Alexandra';
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  navegarA(ruta: string): void {
    this.router.navigate([ruta], { relativeTo: this.route });
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  guardarCambios(): void {
    console.log('Guardando cambios...');
    // Implementar lógica para guardar cambios
  }

  cancelar(): void {
    console.log('Cancelando cambios...');
    // Implementar lógica para cancelar
  }

  crearBackup(): void {
    console.log('Creando backup...');
    // Implementar lógica de backup
  }

  restaurarBackup(): void {
    console.log('Restaurando backup...');
    // Implementar lógica de restauración
  }
}