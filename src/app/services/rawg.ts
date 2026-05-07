import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})

export class Rawg {
  private http = inject(HttpClient);
  private firebase = inject(FirebaseService);
  private cache = new Map<string, any[]>();


  private apiKey = 'cf7adb5ebad849b3b46d41b217e81c54';
  private apiUrl = 'https://api.rawg.io/api/games';

  // Normaliza un juego de RAWG al mismo "shape" que usamos en la app
  private normalizarRawg(juego: any) {
    return {
      ...juego,
      esCustom: false
    };
  }

  nuevosLanzamientos(fecha: Date): Observable<any[]> {
    const { fechaInicio, fechaFin } = this.rangoMes(fecha);
    const cacheKey = fechaInicio;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    return new Observable(observer => {
      const todosLosJuegos: any[] = [];

      const cargarPagina = (pagina: number) => {
        const url = `${this.apiUrl}?key=${this.apiKey}&dates=${fechaInicio},${fechaFin}&ordering=released&page_size=40&page=${pagina}`;

        this.http.get<any>(url).subscribe({
          next: (data) => {
            const juegos = (data.results || []).map((j: any) => this.normalizarRawg(j));
            todosLosJuegos.push(...juegos);

            if (data.next) {
              // hay más páginas, seguimos
              cargarPagina(pagina + 1);
            } else {
              // ya no hay más, guardamos en caché y emitimos
              this.cache.set(cacheKey, todosLosJuegos);
              observer.next(todosLosJuegos);
              observer.complete();
            }
          },
          error: (err) => observer.error(err)
        });
      };

      cargarPagina(1);
    });
  }

  // Busca en RAWG y en Firebase, fusiona resultados
  buscarJuegos(query: string, fecha: Date): Observable<any[]> {
    const { fechaInicio, fechaFin } = this.rangoMes(fecha);
    const url = `${this.apiUrl}?key=${this.apiKey}&search=${query}&dates=${fechaInicio},${fechaFin}&page_size=40`;

    const rawg$ = this.http.get<any>(url).pipe(
      map(data => (data.results || []).map((j: any) => this.normalizarRawg(j)))
    );

    const firebase$ = from(this.firebase.buscarPorNombre(query));

    return forkJoin([rawg$, firebase$]).pipe(
      map(([deRawg, deFirebase]) => [...deRawg, ...deFirebase])
    );
  }

  private rangoMes(fecha: Date) {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const ultimoDia = new Date(año, fecha.getMonth() + 1, 0).getDate();
    return {
      fechaInicio: `${año}-${mes}-01`,
      fechaFin: `${año}-${mes}-${ultimoDia}`
    };
  }

  obtenerDetalle(slug: string): Observable<any> {
    const url = `${this.apiUrl}/${slug}?key=${this.apiKey}`;
    return this.http.get<any>(url);
  }
}