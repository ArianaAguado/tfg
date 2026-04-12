import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink], 
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  // Objeto para capturar los datos del HTML
  userData = {
    nombre: '',
    email: '',
    password: ''
  };

  async registrarUsuario() {
    try {
      // 1. Creamos el usuario en Firebase Authentication
      const credenciales = await createUserWithEmailAndPassword(
        this.auth, 
        this.userData.email, 
        this.userData.password
      );

      const userId = credenciales.user.uid;

      // 2. Guardamos sus datos adicionales en Firestore
      await setDoc(doc(this.firestore, 'usuarios', userId), {
        nombre: this.userData.nombre,
        email: this.userData.email,
        rol: 'usuario',
        fechaRegistro: new Date()
      });

      alert('¡Cuenta creada con éxito!');
      this.router.navigate(['/']);

    } catch (error: any) {
      console.error(error);
      alert('Error al registrar: ' + error.message);
    }
  }
}