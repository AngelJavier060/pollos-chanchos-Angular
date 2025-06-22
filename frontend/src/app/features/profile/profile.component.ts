import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  securityForm: FormGroup;
  credentialForm: FormGroup;
  loading = false;  activeTab = 'profile'; // 'profile' | 'security' | 'credentials'
  userId = '#ADM-2024-001';
  currentDate = new Date();
  expirationDate = new Date('2026-06-16');
  photoUrl = 'assets/alexandra.png';
  showSecretKey = false;
  currentUserId: number | null = null;

  constructor(private fb: FormBuilder, private authService: AuthDirectService, private http: HttpClient, private snackBar: MatSnackBar) {
    this.profileForm = this.fb.group({
      nombre: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.pattern(/^[+]?\d{9,12}$/)]],
      cargo: ['', [Validators.required]]
    });

    this.securityForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });

    this.credentialForm = this.fb.group({
      accessKey: ['AK12345678', [Validators.required]],
      secretKey: ['SK87654321', [Validators.required]],
      apiEndpoint: ['https://api.granjaelvita.com', [Validators.required]],
      credentialType: ['admin', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Obtener el usuario autenticado actual para todos los paneles
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUserId = user.id || null;
      this.profileForm.patchValue({
        nombre: user.name || user.username,
        email: user.email,
        telefono: user.phone || '',
        cargo: user.roles?.[0] || '',
      });
      this.photoUrl = user.profilePicture || 'assets/img/default-avatar.png';
    }

    this.http.get<any>(`${environment.apiUrl}/api/users/me`).subscribe({
      next: (user) => {
        this.currentUserId = user.id || null;
        this.profileForm.patchValue({
          nombre: user.name || user.username || '',
          email: user.email || '',
          telefono: user.phone || '',
          cargo: user.roles?.includes('ROLE_ADMIN') ? 'Administrador' : 'Usuario'
        });
        this.photoUrl = user.profilePicture || 'assets/img/default-avatar.png';
      },
      error: (err) => {
        console.error('Error al cargar el perfil:', err);
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  changeTab(tab: string) {
    this.activeTab = tab;
  }

  downloadCredential() {
    // Aquí implementarías la lógica para descargar la credencial
    console.log('Descargando credencial...');
  }

  regenerateCredential() {
    // Aquí implementarías la lógica para regenerar la credencial
    console.log('Regenerando credencial...');
    // Por ejemplo, podrías generar un nuevo ID y actualizar la fecha de expiración
    this.userId = `ADM-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    this.expirationDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
  }

  showPassword(field: string) {
    const input = document.getElementById(field) as HTMLInputElement;
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }

  onSubmitProfile() {
    if (this.profileForm.valid && this.currentUserId) {
      this.loading = true;
      const updateData = {
        name: this.profileForm.get('nombre')?.value,
        email: this.profileForm.get('email')?.value,
        phone: this.profileForm.get('telefono')?.value,
        // Puedes agregar más campos si es necesario
      };
      this.http.put(`${environment.apiUrl}/api/users/${this.currentUserId}`, updateData).subscribe({
        next: (res) => {
          this.loading = false;
          const user = this.authService.currentUserValue;
          if (user) {
            user.name = updateData.name;
            user.email = updateData.email;
            user.phone = updateData.phone;
            localStorage.setItem('currentUser', JSON.stringify(user));
          }
          this.snackBar.open('Perfil actualizado correctamente', 'Cerrar', { duration: 3000, panelClass: 'snackbar-success' });
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open('Error al actualizar el perfil', 'Cerrar', { duration: 3000, panelClass: 'snackbar-error' });
        }
      });
    }
  }

  onSubmitSecurity() {
    if (this.securityForm.valid) {
      this.loading = true;
      // Aquí implementarías la lógica para actualizar la contraseña
      setTimeout(() => {
        this.loading = false;
        console.log('Contraseña actualizada');
        this.securityForm.reset();
      }, 1000);
    }
  }

  onSubmitCredentials(): void {
    if (this.credentialForm.valid) {
      this.loading = true;
      console.log('Credentials update:', this.credentialForm.value);
      setTimeout(() => {
        this.loading = false;
      }, 1000);
    }
  }

  toggleSecretKey() {
    this.showSecretKey = !this.showSecretKey;
  }

  printCredential() {
    // Guardamos el contenido actual del body
    const originalContent = document.body.innerHTML;
    
    // Obtenemos solo la credencial
    const credentialCard = document.querySelector('.digital-id-card');
    if (credentialCard) {
      // Preparamos el estilo para impresión
      const printStyles = `
        <style>
          @media print {
            body * {
              visibility: hidden;
            }
            .digital-id-card, .digital-id-card * {
              visibility: visible;
            }
            .digital-id-card {
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
              width: 450px !important;
              height: 280px !important;
            }
          }
        </style>
      `;
      
      // Agregamos los estilos de impresión
      document.head.insertAdjacentHTML('beforeend', printStyles);
      
      // Imprimimos
      window.print();
      
      // Removemos los estilos de impresión
      const styleElement = document.head.querySelector('style:last-child');
      if (styleElement) {
        styleElement.remove();
      }
    }
  }

  regenerateCredentials() {
    this.loading = true;
    // Aquí iría la lógica para regenerar las credenciales de API
    // Por ejemplo, una llamada a un servicio
    setTimeout(() => {
      this.credentialForm.patchValue({
        accessKey: 'AK' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        secretKey: 'SK' + Math.random().toString(36).substring(2, 15).toUpperCase(),
      });
      this.loading = false;
    }, 1000);
  }
}
