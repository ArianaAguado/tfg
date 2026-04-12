import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private formBuilder = inject(FormBuilder);
  public router = inject(Router);
  private auth = inject(Auth);

  formularioLogin = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit() {
    if (this.formularioLogin.valid) {
      const { email, password } = this.formularioLogin.value;
      try {
        await signInWithEmailAndPassword(this.auth, email!, password!);
        this.router.navigate(['/']); //calendario
      } catch (error: any) {
        console.error('Error de autenticación:', error);
        alert('Email o contraseña incorrectos: ' + error.message);
      }
    }
  }
}