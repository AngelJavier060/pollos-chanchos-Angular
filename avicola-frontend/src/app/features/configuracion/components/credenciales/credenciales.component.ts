import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-credenciales',
  templateUrl: './credenciales.component.html',
  styleUrls: ['./credenciales.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class CredencialesComponent implements OnInit {
  credencialesForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.credencialesForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  onSubmit() {
    if (this.credencialesForm.valid) {
      console.log(this.credencialesForm.value);
    }
  }
}