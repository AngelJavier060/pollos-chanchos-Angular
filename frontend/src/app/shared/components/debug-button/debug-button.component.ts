import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-debug-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="debug-fab" [class.expanded]="expanded">
      <button (click)="expanded = !expanded" class="main-button">
        🔧
      </button>
      
      <div class="fab-menu" *ngIf="expanded">
        <button (click)="navigate('/diagnostico')" class="menu-button">
          📊 Diagnóstico Completo
        </button>
        <button (click)="navigate('/debug-auth')" class="menu-button">
          🔑 Depurar Auth
        </button>
        <button (click)="navigate('/admin/usuarios-directo')" class="menu-button">
          👤 Usuarios Directo
        </button>
      </div>
    </div>
  `,
  styles: [`
    .debug-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
    }
    
    .main-button {
      width: 50px;
      height: 50px;
      border-radius: 25px;
      background: #3b82f6;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 24px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    }
    
    .main-button:hover {
      transform: scale(1.05);
      background: #2563eb;
    }
    
    .fab-menu {
      position: absolute;
      bottom: 60px;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
    }
    
    .menu-button {
      padding: 8px 16px;
      border-radius: 4px;
      background: #1e40af;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 14px;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    }
    
    .menu-button:hover {
      background: #1e3a8a;
      transform: translateX(-5px);
    }
  `]
})
export class DebugButtonComponent implements OnInit {
  expanded = false;
  
  constructor(private router: Router) {}
  
  ngOnInit(): void {
    // Si estamos en producción, no mostrar este componente
    // Se maneja por CSS, pero podríamos agregar lógica adicional aquí
  }
  
  navigate(route: string): void {
    this.router.navigateByUrl(route);
    this.expanded = false;
  }
}
