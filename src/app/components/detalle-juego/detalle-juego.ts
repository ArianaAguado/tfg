import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Rawg } from '../../services/rawg';
import { FirebaseService } from '../../services/firebase.service';
import { ChangeDetectorRef } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-detalle-juego',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-juego.html',
  styleUrl: './detalle-juego.css'
})
export class DetalleJuego implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rawg = inject(Rawg);
  private firebase = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);

  juego: any = null;
  cargando: boolean = true;
  esFavorito: boolean = false;
  cargandoFavorito: boolean = false;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) { this.router.navigate(['/dashboard']); return; }

    this.rawg.obtenerDetalle(slug).subscribe({
      next: async (juego) => {
        this.juego = juego;
        this.cargando = false;
        this.esFavorito = await this.firebase.esFavorito(juego);
      },
      error: () => {
        this.cargando = false;
        this.location.back();
      }
    });
  }

  volver(): void {
    this.location.back();
  }

  async toggleFavorito(): Promise<void> {
    if (!this.juego) return;
    this.cargandoFavorito = true;
    if (this.esFavorito) {
      await this.firebase.quitarFavorito(this.juego);
    } else {
      await this.firebase.añadirFavorito(this.juego);
    }
    this.esFavorito = !this.esFavorito;
    this.cargandoFavorito = false;
    this.cdr.detectChanges();
  }

  obtenerGeneros(): string {
    return this.juego?.genres?.map((g: any) => g.name).join(', ') || 'No disponible';
  }

  obtenerPlataformas(): string {
    return this.juego?.platforms?.map((p: any) => p.platform.name).join(', ') || 'No disponible';
  }
}