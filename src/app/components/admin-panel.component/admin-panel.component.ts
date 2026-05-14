import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';

export interface UsuarioAdmin {
  uid: string;
  nombre: string;
  email: string;
  avatarUrl?: string;
  rol: 'usuario' | 'desarrollador' | 'admin';
  baneado?: boolean;
  fechaRegistro?: string;
  bio?: string;
  generosFav?: string[];
  plataformasFav?: string[];
  redesSociales?: { steam?: string; [key: string]: string | undefined };
  // actividad calculada
  actividadJuegos?: number;
  actividadAmigos?: number;
  actividadValoraciones?: number;
  actividadPropuestas?: number;
  // estado UI
  guardandoRol?: boolean;
  guardandoBan?: boolean;
}

interface MetricaDia {
  fecha: string;
  count: number;
}

interface RolDist {
  label: string;
  count: number;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css',
})
export class AdminPanelComponent implements OnInit {
  private firebase = inject(FirebaseService);
  private cdr      = inject(ChangeDetectorRef);

  // ── Estado general ───────────────────────────────────────────────
  tabActivo       = 'usuarios';
  cargandoStats   = true;
  cargandoUsuarios= true;

  // ── KPIs ─────────────────────────────────────────────────────────
  totalUsuarios   = 0;
  totalJuegos     = 0;
  totalPropuestas = 0;
  totalBaneados   = 0;

  // ── Usuarios ─────────────────────────────────────────────────────
  usuarios:          UsuarioAdmin[] = [];
  usuariosFiltrados: UsuarioAdmin[] = [];
  busquedaUsuario = '';
  filtroRol       = '';
  usuarioActividad: UsuarioAdmin | null = null;

  // ── Paginación usuarios ───────────────────────────────────────────
  paginaUsuarios  = 1;
  readonly porPagina = 10;

  get totalPaginasUsuarios(): number {
    return Math.ceil(this.usuariosFiltrados.length / this.porPagina);
  }
  get paginasUsuarios(): number[] {
    return Array.from({ length: this.totalPaginasUsuarios }, (_, i) => i + 1);
  }

  // ── Métricas ──────────────────────────────────────────────────────
  registrosPorDia: MetricaDia[] = [];
  rolDistribucion: RolDist[]    = [];
  get maxRegistros(): number {
    return Math.max(1, ...this.registrosPorDia.map(r => r.count));
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarStats();
    this.cargarUsuarios();
  }

  setTab(tab: string): void {
    this.tabActivo = tab;
  }

  // ── Carga KPIs globales ───────────────────────────────────────────
  private cargarStats(): void {
    this.cargandoStats = true;
    // Ajusta a tus métodos reales de FirebaseService
    Promise.all([
      this.firebase.contarColeccion('usuarios'),
      this.firebase.contarColeccion('juegos'),
      this.firebase.contarColeccion('peticiones_juegos'),
    ]).then(([u, j, p]) => {
      this.totalUsuarios   = u;
      this.totalJuegos     = j;
      this.totalPropuestas = p;
      this.cargandoStats   = false;
      this.cdr.detectChanges();
    }).catch(err => {
      console.error('Error stats:', err);
      this.cargandoStats = false;
      this.cdr.detectChanges();
    });
  }

  // ── Carga usuarios ────────────────────────────────────────────────
  private cargarUsuarios(): void {
    this.cargandoUsuarios = true;
    // Ajusta a tu método real de FirebaseService que devuelva todos los usuarios
    this.firebase.getTodosUsuarios().subscribe({
      next: (data: UsuarioAdmin[]) => {
        this.usuarios          = data;
        this.totalBaneados     = data.filter(u => u.baneado).length;
        this.calcularMetricas(data);
        this.filtrarUsuarios();
        this.cargandoUsuarios  = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Error usuarios:', err);
        this.cargandoUsuarios = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Filtrado ──────────────────────────────────────────────────────
  filtrarUsuarios(): void {
    const q = this.busquedaUsuario.toLowerCase().trim();
    this.usuariosFiltrados = this.usuarios.filter(u => {
      const matchBusqueda =
        !q ||
        u.nombre?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);
      const matchRol = !this.filtroRol || u.rol === this.filtroRol;
      return matchBusqueda && matchRol;
    });
    this.paginaUsuarios = 1;
    this.cdr.detectChanges();
  }

  cambiarPaginaUsuarios(p: number): void {
    if (p < 1 || p > this.totalPaginasUsuarios) return;
    this.paginaUsuarios = p;
    this.cdr.detectChanges();
  }

  // ── Acciones usuario ──────────────────────────────────────────────
  async cambiarRol(u: UsuarioAdmin, nuevoRol: string): Promise<void> {
    if (nuevoRol === u.rol) return;
    u.guardandoRol = true;
    this.cdr.detectChanges();
    try {
      // Ajusta al método real de FirebaseService
      await this.firebase.actualizarRolUsuario(u.uid, nuevoRol);
      u.rol = nuevoRol as UsuarioAdmin['rol'];
      this.calcularMetricas(this.usuarios);
    } catch (err) {
      console.error('Error cambiando rol:', err);
    } finally {
      u.guardandoRol = false;
      this.cdr.detectChanges();
    }
  }

  async toggleBan(u: UsuarioAdmin): Promise<void> {
    u.guardandoBan = true;
    this.cdr.detectChanges();
    try {
      const nuevoBan = !u.baneado;
      // Ajusta al método real de FirebaseService
      await this.firebase.actualizarUsuario(u.uid, { baneado: nuevoBan });
      u.baneado          = nuevoBan;
      this.totalBaneados = this.usuarios.filter(x => x.baneado).length;
    } catch (err) {
      console.error('Error ban:', err);
    } finally {
      u.guardandoBan = false;
      this.cdr.detectChanges();
    }
  }

  toggleActividad(u: UsuarioAdmin): void {
    this.usuarioActividad = this.usuarioActividad?.uid === u.uid ? null : u;
    // Si no tienes los datos de actividad ya cargados, aquí puedes hacer una
    // llamada extra: this.firebase.getActividadUsuario(u.uid).then(...)
    this.cdr.detectChanges();
  }

  // ── Métricas internas ─────────────────────────────────────────────
  private calcularMetricas(usuarios: UsuarioAdmin[]): void {
    // Distribución de roles
    this.rolDistribucion = [
      { label: 'Usuario',      count: usuarios.filter(u => u.rol === 'usuario').length },
      { label: 'Desarrollador',count: usuarios.filter(u => u.rol === 'desarrollador').length },
      { label: 'Admin',        count: usuarios.filter(u => u.rol === 'admin').length },
    ];

    // Registros por día (últimos 7 días)
    const hoy   = new Date();
    const dias: MetricaDia[] = [];
    for (let i = 6; i >= 0; i--) {
      const d    = new Date(hoy);
      d.setDate(d.getDate() - i);
      const key  = d.toISOString().slice(0, 10);
      const label= d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
      const count= usuarios.filter(u => u.fechaRegistro?.startsWith(key)).length;
      dias.push({ fecha: label, count });
    }
    this.registrosPorDia = dias;
  }

  barPct(val: number, max: number): number {
    if (!max) return 0;
    return Math.round((val / max) * 100);
  }

  // ── Helpers ───────────────────────────────────────────────────────
  rolLabel(rol: string): string {
    return { usuario: 'Usuario', desarrollador: 'Dev', admin: 'Admin' }[rol] ?? rol;
  }
}