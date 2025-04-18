import { NgModule } from '@angular/core';
import { LoginComponent } from './login.component';

@NgModule({
  imports: [
    LoginComponent
  ],
  exports: [LoginComponent]
})
export class LoginModule { }