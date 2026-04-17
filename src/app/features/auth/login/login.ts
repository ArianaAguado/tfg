import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';

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
        // Aquí puedes agregar la lógica para autenticar al usuario con Firebase
        // Por ejemplo, usando AngularFireAuth:
        // await this.afAuth.signInWithEmailAndPassword(email, password);
        
        // Si el login es exitoso, redirige al calendario
        this.router.navigate(['/calendario']);
      } catch (error) {
        console.error('Error de autenticación:', error);
        alert('Email o contraseña incorrectos: ' + error.message);
      }
    }
  }

// Método para iniciar sesión con Google
  async loginConGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
    this.router.navigate(['/dashboard']);
  } catch (error: any) {
    alert('Error con Google: ' + error.message);
  }
}
}