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
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const ultimoDia = new Date(año, hoy.getMonth() + 1, 0).getDate();
  
  const fechaInicio = `${año}-${mes}-01`;
  const fechaFin = `${año}-${mes}-${ultimoDia}`;
  const fechas = `${fechaInicio},${fechaFin}`;
  
  const url = `${this.apiUrl}?key=${this.apiKey}&dates=${fechas}&ordering=released&page_size=40`;
  return this.http.get(url);
}
}