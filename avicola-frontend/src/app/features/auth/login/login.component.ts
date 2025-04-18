import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  userType: string = 'admin';
  pageTitle: string = 'Panel de Administrador';

  constructor(
    private formBuilder: FormBuilder, 
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['Alexandra1', Validators.required],
      email: ['javierangelmsn@gmail.com', [Validators.required, Validators.email]],
      password: ['123456', Validators.required]
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['type']) {
        this.userType = params['type'];
        this.updatePageTitle();
      }
    });
  }

  updatePageTitle() {
    switch (this.userType) {
      case 'admin':
        this.pageTitle = 'Panel de Administrador';
        break;
      case 'pollos':
        this.pageTitle = 'Panel de Gestión Avícola';
        break;
      case 'chanchos':
        this.pageTitle = 'Panel de Gestión Porcina';
        break;
      default:
        this.pageTitle = 'Panel de Administrador';
    }
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const username = this.loginForm.get('username')?.value;
      const password = this.loginForm.get('password')?.value;

      this.authService.login(username, password).subscribe({
        next: () => {
          this.router.navigate(['/admin']);
        },
        error: (error) => {
          console.error('Error en el inicio de sesión:', error);
        }
      });
    }
  }
}