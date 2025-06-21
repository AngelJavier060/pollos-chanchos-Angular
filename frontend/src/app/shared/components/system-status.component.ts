import { Component, OnInit, OnDestroy } from '@angular/core';
import { DiagnosticsService } from '../../shared/services/diagnostics.service';
import { CommonModule } from '@angular/common';
import { SystemHealth } from '../../shared/models/diagnostics.model';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-system-status',
  template: `
    <div class="system-status-widget" [class.minimized]="!isExpanded">
      <div class="status-header" (click)="toggleContent()">
        <div class="status-indicator" [class.online]="overallStatus" [class.offline]="!overallStatus"></div>
        <span class="header-text">Estado del Sistema</span>
        <i class="toggle-icon" [class.expanded]="isExpanded">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </i>
      </div>
      <div class="status-content" [class.expanded]="isExpanded">
        <div class="status-items">
          <div class="status-item" [class.error]="!diagnostics?.api">
            <span class="item-label">API</span>
            <span class="item-value">
              {{ diagnostics?.api ? 'Conectado' : 'Desconectado' }}
            </span>
          </div>
          <div class="status-item" [class.error]="!diagnostics?.auth">
            <span class="item-label">Auth</span>
            <span class="item-value">
              {{ diagnostics?.auth ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <div class="status-item" [class.error]="!diagnostics?.storage">
            <span class="item-label">Storage</span>
            <span class="item-value">
              {{ diagnostics?.storage ? 'OK' : 'Error' }}
            </span>
          </div>
        </div>
        <div *ngIf="hasErrors()" class="error-log">
          <div *ngFor="let error of getErrors()" class="error-item">
            {{ error.message }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .system-status-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 280px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      font-size: 13px;
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .system-status-widget.minimized {
      width: 200px;
    }

    .status-header {
      padding: 12px 16px;
      background: #f8f9fa;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      user-select: none;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transition: background-color 0.3s ease;
    }

    .status-indicator.online {
      background-color: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .status-indicator.offline {
      background-color: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    }

    .header-text {
      flex-grow: 1;
      font-weight: 600;
      color: #374151;
    }

    .toggle-icon {
      transition: transform 0.3s ease;
    }

    .toggle-icon.expanded {
      transform: rotate(180deg);
    }

    .status-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }

    .status-content.expanded {
      max-height: 300px;
    }

    .status-items {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      color: #374151;
    }

    .item-label {
      font-weight: 500;
    }

    .item-value {
      font-weight: 600;
      color: #10b981;
    }

    .status-item.error .item-value {
      color: #ef4444;
    }

    .error-log {
      padding: 12px 16px;
      background: #fef2f2;
      border-top: 1px solid #fee2e2;
    }

    .error-item {
      color: #991b1b;
      font-size: 12px;
      line-height: 1.4;
      padding: 4px 0;
    }

    @media (max-width: 640px) {
      .system-status-widget {
        width: 240px;
        bottom: 16px;
        right: 16px;
      }

      .system-status-widget.minimized {
        width: 180px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class SystemStatusComponent implements OnInit, OnDestroy {
  diagnostics: SystemHealth | null = null;
  loading = false;
  isExpanded = false;
  overallStatus = false;
  private refreshInterval: Subscription | null = null;

  constructor(private diagnosticsService: DiagnosticsService) {}

  ngOnInit() {
    this.refreshStatus();
    // Actualizar el estado cada 30 segundos
    this.refreshInterval = interval(30000).subscribe(() => {
      this.refreshStatus();
    });
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  refreshStatus(): void {
    this.loading = true;
    this.diagnosticsService.checkSystemHealth().subscribe({
      next: (result: SystemHealth) => {
        this.diagnostics = result;
        this.overallStatus = result.api && result.auth && result.storage;
        this.loading = false;
      },
      error: (error: Error) => {
        console.error('Error al obtener el estado del sistema:', error);
        this.loading = false;
        this.overallStatus = false;
      }
    });
  }

  hasErrors(): boolean {
    return !!this.diagnostics?.details?.errors?.length;
  }

  getErrors(): Array<{ message: string }> {
    return this.diagnostics?.details?.errors || [];
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }
}
