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
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

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
  private firestore = inject(Firestore); // ← necesario para Google

  errorMessage = '';

  formularioLogin = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit() {
    if (this.formularioLogin.invalid) return;

    const { email, password } = this.formularioLogin.value;
    try {
      await signInWithEmailAndPassword(this.auth, email!, password!);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
    }
  }

  async loginConGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const credenciales = await signInWithPopup(this.auth, provider);
      const user = credenciales.user;
      const docRef = doc(this.firestore, 'usuarios', user.uid);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          nombre: user.displayName ?? '',
          email: user.email,
          rol: 'usuario',
          fechaRegistro: new Date().toISOString()
        });
      }

      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
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