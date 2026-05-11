import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  Auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from '@angular/fire/auth';
import { FirebaseService } from '../../../services/firebase.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private formBuilder = inject(FormBuilder);
  public router = inject(Router);
  private auth = inject(Auth);
  private firebaseService = inject(FirebaseService);

  errorMessage = '';
  cargandoGoogle = false;

  formularioLogin = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit() {
    if (this.formularioLogin.invalid) return;
    const { email, password } = this.formularioLogin.value;
    try {
      await signInWithEmailAndPassword(this.auth, email!, password!);
      localStorage.setItem('sessionExpiry', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
    }
  }

async loginConGoogle() {
  try {
    this.cargandoGoogle = true;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    
    await this.firebaseService.crearUsuarioEnFirestore(result.user);
    localStorage.setItem('sessionExpiry', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    this.router.navigate(['/dashboard']);
  } catch (error) {
    this.cargandoGoogle = false;
    const firebaseError = error as { code: string }; // ← tipado explícito
    this.errorMessage = this.getErrorMessage(firebaseError.code);
  }
}

  goHome() {
    this.router.navigate(['/']);
  }

  private getErrorMessage(code: string): string {
    const errors: Record<string, string> = {
      'auth/user-not-found': 'No existe una cuenta con este email.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-credential': 'Email o contraseña incorrectos.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
      'auth/popup-closed-by-user': 'Inicio con Google cancelado.',
    };
    return errors[code] ?? 'Ocurrió un error inesperado.';
  }
}