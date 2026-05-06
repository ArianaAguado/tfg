import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-proponer-juego',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './proponerjuego.html',
  styleUrl: './proponerjuego.css',
})
export class ProponerJuegoComponent {
  private firebase = inject(FirebaseService);
  private auth = getAuth();
  private fb = inject(FormBuilder);

  enviando = false;
  enviado = false;
  error = '';

  form = this.fb.group({
    nombre:           ['', [Validators.required, Validators.minLength(2)]],
    fechaLanzamiento: ['', Validators.required],
    generos:          ['', Validators.required],
    plataformas:      ['', Validators.required],
    imagen:           ['', Validators.required],
    descripcion:      ['', [Validators.required, Validators.minLength(20)]],
  });

  async enviar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const user = this.auth.currentUser;
    if (!user) return;

    this.enviando = true;
    this.error = '';

    try {
      const v = this.form.value;
      await this.firebase.enviarPeticion({
        nombre:           v.nombre!,
        fechaLanzamiento: v.fechaLanzamiento!,
        generos:          v.generos!.split(',').map((g: string) => g.trim()),
        plataformas:      v.plataformas!.split(',').map((p: string) => p.trim()),
        imagen:           v.imagen!,
        descripcion:      v.descripcion!,
        esCustom:         true,
        desarrolladorNombre: user.displayName ?? 'Sin nombre',
        desarrolladorEmail:  user.email ?? '',
        desarrolladorId:     user.uid,
        fechaPeticion:       Date.now(),
        estado:              'pendiente',
      });
      this.enviado = true;
      this.form.reset();
    } catch (e) {
      this.error = 'Error al enviar la propuesta. Inténtalo de nuevo.';
      console.error(e);
    } finally {
      this.enviando = false;
    }
  }

  get f() { return this.form.controls; }

  volverAEnviar() {
    this.enviado = false;
  }
}