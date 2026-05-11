import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Rawg } from '../../services/rawg';
import { FirebaseService, Comentario } from '../../services/firebase.service';
import { ChangeDetectorRef } from '@angular/core';
import { Location } from '@angular/common';
import { filter, take } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-detalle-juego',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './detalle-juego.html',
  styleUrl: './detalle-juego.css'
})
export class DetalleJuego implements OnInit, OnDestroy {
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

  // ── Comentarios ──
  comentarios: Comentario[] = [];
  textoComentario = '';
  publicando = false;
  uidActual: string | null = null;
  esAdmin = false;
  private comentariosSub?: Subscription;
  private readonly LIMITE_COMENTARIO = 280;

  // Referencia directa al textarea, para limpiarlo a mano si el ngModel
  // se resiste a actualizar tras el await (típica desincronización entre
  // el modelo y el DOM cuando Firebase devuelve fuera de la zona de Angular).
  @ViewChild('textareaComentario') textareaComentario?: ElementRef<HTMLTextAreaElement>;

  private readonly avataresPorRol: Record<string, string> = {
    admin: 'assets/admin.png',
    desarrollador: 'assets/Dev.png',
    usuario: 'assets/user.png',
  };

  ngOnInit(): void {
    this.uidActual = this.firebase.usuarioActual?.uid ?? null;
    this.esAdmin = this.firebase.rolActual === 'admin';

    const nav = this.router.getCurrentNavigation();
    const juegoCustom = nav?.extras?.state?.['juego']
      ?? history.state?.juego;

    if (juegoCustom) {
      this.juego = juegoCustom;
      this.cargando = false;
      this.cdr.detectChanges();

      this.firebase.usuario$.pipe(
        filter(user => user !== undefined),
        take(1)
      ).subscribe(async (user) => {
        if (user) {
          this.esFavorito = await this.firebase.esFavorito(juegoCustom);
          this.cdr.detectChanges();
        }
      });

      this.suscribirComentarios();
      return;
    }

    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) { this.router.navigate(['/calendario']); return; }

    this.rawg.obtenerDetalle(slug).subscribe({
      next: (juego) => {
        this.juego = juego;
        this.cargando = false;
        this.cdr.detectChanges();

        this.firebase.usuario$.pipe(
          filter(user => user !== undefined),
          take(1)
        ).subscribe(async (user) => {
          if (user) {
            this.esFavorito = await this.firebase.esFavorito(juego);
            this.cdr.detectChanges();
          }
        });

        this.suscribirComentarios();
      },
      error: () => {
        this.cargando = false;
        this.location.back();
      }
    });
  }

  ngOnDestroy(): void {
    this.comentariosSub?.unsubscribe();
  }

  private slugParaComentarios(): string {
    if (this.juego?.slug) return this.juego.slug;
    const nombre = this.juego?.name ?? this.juego?.nombre ?? '';
    return 'custom_' + nombre.toLowerCase().trim().replace(/\s+/g, '_');
  }

  private suscribirComentarios(): void {
    const slug = this.slugParaComentarios();
    this.comentariosSub = this.firebase.obtenerComentariosDeJuego(slug).subscribe({
      next: (comentarios) => {
        this.comentarios = comentarios;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando comentarios:', err)
    });
  }

  get caracteresRestantes(): number {
    return this.LIMITE_COMENTARIO - this.textoComentario.length;
  }

  get puedePublicar(): boolean {
    const texto = this.textoComentario.trim();
    return !!texto && texto.length <= this.LIMITE_COMENTARIO && !this.publicando;
  }

  async publicarComentario(): Promise<void> {
    if (!this.puedePublicar) return;
    this.publicando = true;
    this.cdr.detectChanges();
    try {
      await this.firebase.publicarComentario(
        this.slugParaComentarios(),
        this.textoComentario
      );

      // Limpiamos el modelo (TS) y también el DOM (input nativo) porque
      // el binding bidireccional de ngModel a veces no refresca el DOM
      // cuando el cambio del modelo ocurre justo tras un await que vino
      // fuera de la zona de Angular. Tocar las dos partes garantiza que
      // el cajón se vacía visualmente sí o sí.
      this.textoComentario = '';
      if (this.textareaComentario) {
        this.textareaComentario.nativeElement.value = '';
      }
    } catch (err) {
      console.error('Error publicando comentario:', err);
    } finally {
      this.publicando = false;
      this.cdr.detectChanges();
    }
  }

  async borrarComentario(comentario: Comentario): Promise<void> {
    if (!confirm('¿Seguro que quieres borrar este comentario?')) return;
    await this.firebase.borrarComentario(comentario);
  }

  puedeBorrar(comentario: Comentario): boolean {
    if (!this.uidActual) return false;
    return comentario.uid === this.uidActual || this.esAdmin;
  }

  avatarComentario(comentario: Comentario): string {
    const foto = comentario.fotoUsuario;
    if (foto && foto !== 'null' && foto.trim() !== '') return foto;
    return this.avataresPorRol[comentario.rolUsuario] ?? this.avataresPorRol['usuario'];
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