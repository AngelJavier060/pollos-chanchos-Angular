import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductService } from '../../../../shared/services/product.service';

@Component({
  selector: 'app-nombre-producto-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './nombre-producto-form.component.html',
  styleUrls: ['./nombre-producto-form.component.scss']
})
export class NombreProductoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private productService = inject(ProductService);

  form!: FormGroup;
  saving = false;
  id: number | null = null;
  isEditing = false;

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      descripcion: ['', [Validators.maxLength(255)]]
    });

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      this.id = idParam ? Number(idParam) : null;
      this.isEditing = !!this.id;
      if (this.id) {
        this.productService.getNombreProductoById(this.id).subscribe({
          next: (np) => {
            if (np) this.form.patchValue({ nombre: np.nombre, descripcion: np.descripcion });
          },
          error: (e) => {
            const status = e?.status;
            if (status === 404) {
              this.snack.open('El registro no existe o fue eliminado', 'Cerrar', { duration: 3000 });
              this.router.navigate(['/admin/configuracion/productos']);
            } else {
              this.snack.open('No se pudo cargar el registro', 'Cerrar', { duration: 3000 });
            }
          }
        });
      } else {
        this.form.reset({ nombre: '', descripcion: '' });
      }
    });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const obs = this.id
      ? this.productService.updateNombreProducto(this.id, this.form.value)
      : this.productService.createNombreProducto(this.form.value);
    obs.subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Registro guardado', 'OK', { duration: 2500 });
        this.router.navigate(['/admin/configuracion/productos']);
      },
      error: (e) => {
        this.saving = false;
        const msg = e?.error?.message || e?.message || 'Error guardando';
        this.snack.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }

  cancelar() {
    this.router.navigate(['/admin/configuracion/productos']);
  }
}
