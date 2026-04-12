import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Rawg {
  private http = inject(HttpClient);
  private apiKey = 'cf7adb5ebad849b3b46d41b217e81c54';
  private apiUrl = 'https://api.rawg.io/api/games';

  nuevosLanzamientos(): Observable<any> {
    // Pedimos juegos de todo el año 2026 para asegurar que el array no venga vacío
    const fechas = '2026-01-01,2026-12-31'; 
    const url = `${this.apiUrl}?key=${this.apiKey}&dates=${fechas}&ordering=-released&page_size=40`;
    
    return this.http.get(url);
  }
}