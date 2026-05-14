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
  hypeContador: number = 0;
  hypeActivo: boolean = false;
  private hypeSub?: Subscription;

  // ── Comentarios ──
  comentarios: Comentario[] = [];
  textoComentario = '';
  publicando = false;
  uidActual: string | null = null;
  esAdmin = false;
  private comentariosSub?: Subscription;
  private readonly LIMITE_COMENTARIO = 280;

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
      // DESPUÉS
      if (juegoCustom?.esCustom) {
        const nombreJuego = juegoCustom.nombre ?? juegoCustom.name ?? '';
        const slug = 'custom_' + nombreJuego.toLowerCase().trim().replace(/\s+/g, '_');
        this.firebase.incrementarVisita(slug);
      }
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
      this.suscribirHype();
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
        this.suscribirHype();
      },
      error: () => {
        this.cargando = false;
        this.location.back();
      }
    });
  }

  ngOnDestroy(): void {
    this.comentariosSub?.unsubscribe();
    this.hypeSub?.unsubscribe();
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

  private suscribirHype(): void {
    const slug = this.slugParaComentarios();
    this.hypeSub = this.firebase.obtenerHype(slug).subscribe({
      next: (hype) => {
        this.hypeContador = hype.contador;
        this.hypeActivo = !!this.uidActual && hype.usuarios.includes(this.uidActual);
        this.cdr.detectChanges();
      }
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

  async toggleHype(): Promise<void> {
    console.log('toggleHype llamado');
    console.log('uidActual:', this.uidActual);
    console.log('slug:', this.slugParaComentarios());
    console.log('hypeActivo:', this.hypeActivo);
    if (!this.uidActual) return;
    const slug = this.slugParaComentarios();
    if (this.hypeActivo) {
      await this.firebase.quitarHype(slug, this.uidActual);
    } else {
      await this.firebase.darHype(slug, this.uidActual);
    }
  }
}

