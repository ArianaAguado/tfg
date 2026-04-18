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

  private apiKey = 'cf7adb5ebad849b3b46d41b217e81c54';
  private apiUrl = 'https://api.rawg.io/api/games';

  // Normaliza un juego de RAWG al mismo "shape" que usamos en la app
  private normalizarRawg(juego: any) {
    return {
      ...juego,
      esCustom: false
    };
  }

  nuevosLanzamientos(): Observable<any[]> {
    const { fechaInicio, fechaFin } = this.rangoMesActual();
    const url = `${this.apiUrl}?key=${this.apiKey}&dates=${fechaInicio},${fechaFin}&ordering=released&page_size=40`;

    return this.http.get<any>(url).pipe(
      map(data => (data.results || []).map((j: any) => this.normalizarRawg(j)))
    );
  }

  // Busca en RAWG y en Firebase, fusiona resultados
  buscarJuegos(query: string): Observable<any[]> {
    const { fechaInicio, fechaFin } = this.rangoMesActual();
    const url = `${this.apiUrl}?key=${this.apiKey}&search=${query}&dates=${fechaInicio},${fechaFin}&page_size=40`;

    const rawg$ = this.http.get<any>(url).pipe(
      map(data => (data.results || []).map((j: any) => this.normalizarRawg(j)))
    );

    const firebase$ = from(this.firebase.buscarPorNombre(query));

    return forkJoin([rawg$, firebase$]).pipe(
      map(([deRawg, deFirebase]) => [...deRawg, ...deFirebase])
    );
  }

  private rangoMesActual() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const ultimoDia = new Date(año, hoy.getMonth() + 1, 0).getDate();
    return {
      fechaInicio: `${año}-${mes}-01`,
      fechaFin: `${año}-${mes}-${ultimoDia}`
    };
  }
}