import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NombreProducto } from '../../../../shared/models/product.model';
import { ProductService } from '../../../../shared/services/product.service';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './productos-list.component.html',
  styleUrls: ['./productos-list.component.scss']
})
export class ProductosListComponent implements OnInit {
  private productService = inject(ProductService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  displayedColumns = ['nombre', 'descripcion', 'actions'];
  data: NombreProducto[] = [];
  loading = false;
  search = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.productService.getNombreProductos(this.search?.trim() || undefined).subscribe({
      next: (res) => {
        this.data = res || [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snack.open('Error cargando productos: ' + (err?.message || ''), 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ya no hay activos/inactivos en catálogo, se elimina el toggle

  onSearchChange(value: string) {
    this.search = value;
    // Pequeño debounce manual opcional podría agregarse; por ahora recargamos directo
    this.load();
  }

  crear() {
    // Navegar a 'productos/nuevo' relativo a la ruta actual 'productos'
    this.router.navigate(['nuevo'], { relativeTo: this.route });
  }

  editar(p: NombreProducto) {
    this.router.navigate(['editar', p.id], { relativeTo: this.route });
  }

  eliminar(p: NombreProducto) {
    if (!p?.id) return;
    const ok = confirm(`¿Eliminar el producto "${p.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    this.loading = true;
    this.productService.deleteNombreProducto(p.id).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Producto eliminado', 'OK', { duration: 2500 });
        this.load();
      },
      error: (e) => {
        this.loading = false;
        this.snack.open('No se pudo eliminar: ' + (e?.message || ''), 'Cerrar', { duration: 3500 });
      }
    });
  }
}
