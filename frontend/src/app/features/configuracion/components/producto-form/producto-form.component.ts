import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Product, Provider, TypeFood, UnitMeasurement, Animal, Stage, NombreProducto } from '../../../../shared/models/product.model';
import { ProductService } from '../../../../shared/services/product.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './producto-form.component.html',
  styleUrls: ['./producto-form.component.scss']
})
export class ProductoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private productService = inject(ProductService);

  form!: FormGroup;
  id: number | null = null;
  loading = false;
  loadingOptions = false;

  providers: Provider[] = [];
  typeFoods: TypeFood[] = [];
  unitMeasurements: UnitMeasurement[] = [];
  animals: Animal[] = [];
  stages: Stage[] = [];
  nombreProductos: NombreProducto[] = [];

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      nombreProductoId: [null],
      quantity: [0, [Validators.required, Validators.min(0)]],
      price_unit: [0, [Validators.required, Validators.min(0)]],
      number_facture: [0, [Validators.required, Validators.min(0)]],
      level_min: [0, [Validators.min(0)]],
      level_max: [0, [Validators.min(0)]],
      date_compra: [new Date(), []],
      provider_id: [null, [Validators.required]],
      typeFood_id: [null, [Validators.required]],
      unitMeasurement_id: [null, [Validators.required]],
      animal_id: [null, [Validators.required]],
      stage_id: [null, [Validators.required]]
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    this.id = idParam ? Number(idParam) : null;
    this.loadOptions(() => {
      if (this.id) {
        this.load();
      }
    });
  }

  load() {
    if (!this.id) return;
    this.loading = true;
    this.productService.getProductById(this.id).subscribe({
      next: (prod) => {
        this.loading = false;
        if (prod) {
          this.form.patchValue({
            ...prod,
            provider_id: prod.provider_id ?? prod.provider?.id ?? null,
            typeFood_id: prod.typeFood_id ?? prod.typeFood?.id ?? null,
            unitMeasurement_id: prod.unitMeasurement_id ?? prod.unitMeasurement?.id ?? null,
            animal_id: prod.animal_id ?? prod.animal?.id ?? null,
            stage_id: prod.stage_id ?? prod.stage?.id ?? null
          });
        }
      },
      error: (e) => {
        this.loading = false;
        this.snack.open('No se pudo cargar el producto', 'Cerrar', { duration: 3000 });
      }
    });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const formValue = this.form.value;
    const payload: Product = {
      id: this.id || 0,
      name: formValue.name,
      quantity: formValue.quantity,
      price_unit: formValue.price_unit,
      number_facture: formValue.number_facture,
      level_min: formValue.level_min,
      level_max: formValue.level_max,
      date_compra: formValue.date_compra,
      provider_id: formValue.provider_id,
      typeFood_id: formValue.typeFood_id,
      unitMeasurement_id: formValue.unitMeasurement_id,
      animal_id: formValue.animal_id,
      stage_id: formValue.stage_id
    } as Product;
    this.loading = true;
    const obs = this.id ? this.productService.updateProduct(payload) : this.productService.createProduct(payload);
    obs.subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Producto guardado', 'OK', { duration: 2500 });
        this.router.navigate(['../'], { relativeTo: this.route });
      },
      error: (e) => {
        this.loading = false;
        this.snack.open('Error al guardar: ' + (e?.error || e?.message || ''), 'Cerrar', { duration: 4000 });
      }
    });
  }

  cancelar() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private loadOptions(after?: () => void) {
    this.loadingOptions = true;
    forkJoin({
      providers: this.productService.getProviders(),
      typeFoods: this.productService.getTypeFoods(),
      unitMeasurements: this.productService.getUnitMeasurements(),
      animals: this.productService.getAnimals(),
      stages: this.productService.getStages(),
      nombres: this.productService.getNombreProductos()
    }).subscribe({
      next: (res) => {
        this.providers = res.providers || [];
        this.typeFoods = res.typeFoods || [];
        this.unitMeasurements = res.unitMeasurements || [];
        this.animals = res.animals || [];
        this.stages = res.stages || [];
        this.nombreProductos = res.nombres || [];
        this.loadingOptions = false;
        after && after();
      },
      error: () => {
        this.loadingOptions = false;
        this.snack.open('No se pudieron cargar opciones', 'Cerrar', { duration: 3500 });
        after && after();
      }
    });
  }

  setNameFromCatalog(nombreProductoId: number | null) {
    if (!nombreProductoId) return;
    const found = this.nombreProductos.find(n => n.id === Number(nombreProductoId));
    if (found?.nombre) {
      this.form.get('name')?.setValue(found.nombre);
    }
  }
}
