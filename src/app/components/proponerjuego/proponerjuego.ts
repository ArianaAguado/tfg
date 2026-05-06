import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FirebaseService, PeticionJuego } from '../../services/firebase.service';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-proponer-juego',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './proponerjuego.html',
  styleUrl: './proponerjuego.css',
})
export class ProponerJuegoComponent implements OnInit {
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);
  private auth = getAuth();
  private fb = inject(FormBuilder);

  enviando = false;
  enviado = false;
  error = '';
  verHistorial = false;
  historial: PeticionJuego[] = [];
  peticionesPendientes: PeticionJuego[] = [];

  form = this.fb.group({
    nombre:           ['', [Validators.required, Validators.minLength(2)]],
    fechaLanzamiento: ['', Validators.required],
    generos:          ['', Validators.required],
    plataformas:      ['', Validators.required],
    imagen:           ['', Validators.required],
    descripcion:      ['', [Validators.required, Validators.minLength(20)]],
    urlSteam:         ['', Validators.required],
    precio:           [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (!user) return;

    // Historial resuelto (aprobado/rechazado)
    this.firebase.obtenerHistorialPorDesarrollador(user.uid).subscribe({
      next: (res) => { this.historial = res; this.cdr.detectChanges(); },
      error: (err) => console.error('Error al cargar historial:', err),
    });

    // Peticiones pendientes del desarrollador
    this.firebase.obtenerPeticiones().subscribe({
      next: (res) => {
        this.peticionesPendientes = res.filter(p => p.desarrolladorId === user.uid);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar pendientes:', err),
    });
  }

  async enviar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const user = this.auth.currentUser;
    if (!user) return;

    this.enviando = true;
    this.error = '';

    try {
      const v = this.form.value;
      await this.firebase.enviarPeticion({
        nombre:              v.nombre!,
        fechaLanzamiento:    v.fechaLanzamiento!,
        generos:             v.generos!.split(',').map((g: string) => g.trim()),
        plataformas:         v.plataformas!.split(',').map((p: string) => p.trim()),
        imagen:              v.imagen!,
        urlSteam:            v.urlSteam || '',
        precio:              Number(v.precio) ?? 0,
        descripcion:         v.descripcion!,
        esCustom:            true,
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

  toggleHistorial(): void {
    this.verHistorial = !this.verHistorial;
    this.cdr.detectChanges();
  }
}