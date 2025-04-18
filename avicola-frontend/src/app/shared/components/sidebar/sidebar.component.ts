import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Inicialización del componente
  }

  logout(): void {
    // Lógica para cerrar sesión
    // AuthService.logout()
    this.router.navigate(['/login']);
  }
} 