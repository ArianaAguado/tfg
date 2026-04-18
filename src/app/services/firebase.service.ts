import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs
} from 'firebase/firestore';
import { environment } from '../../environments/environments';

export interface JuegoCustom {
  id?: string;
  nombre: string;
  descripcion?: string;
  imagen?: string;
  imagenPath?: string;
  fechaLanzamiento?: string;
  generos?: string[];
  plataformas?: string[];
  esCustom: boolean;
}

const app = getApps().length ? getApps()[0] : initializeApp(environment.firebaseConfig);
const db = getFirestore(app);

@Injectable({ providedIn: 'root' })
export class FirebaseService {

  obtenerJuegos(): Observable<JuegoCustom[]> {
    return new Observable(observer => {
      const colRef = collection(db, 'juegos');
      const unsub = onSnapshot(colRef,
        snapshot => {
          const juegos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JuegoCustom));
          observer.next(juegos);
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  async buscarPorNombre(nombre: string): Promise<JuegoCustom[]> {
    const colRef = collection(db, 'juegos');
    const snapshot = await getDocs(colRef);
    const todos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JuegoCustom));
    return todos.filter(j => j.nombre.toLowerCase().includes(nombre.toLowerCase()));
  }

  subirImagen(archivo: File): Promise<{ url: string; path: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, path: '' });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(archivo);
    });
  }

  async borrarImagen(imagenPath: string): Promise<void> {
    return;
  }

  async agregarJuego(juego: Omit<JuegoCustom, 'id'>): Promise<void> {
    await addDoc(collection(db, 'juegos'), juego);
  }

  async editarJuego(id: string, cambios: Partial<JuegoCustom>): Promise<void> {
    await updateDoc(doc(db, 'juegos', id), cambios);
  }

  async eliminarJuego(juego: JuegoCustom): Promise<void> {
    await deleteDoc(doc(db, 'juegos', juego.id!));
  }
}