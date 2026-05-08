import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, User, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { environment } from '../../environments/environments';


// ── INTERFACES ──

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
  urlSteam?: string;
  precio?: number;
}

export interface PeticionJuego extends JuegoCustom {
  desarrolladorNombre: string;
  desarrolladorEmail: string;
  desarrolladorId: string;
  fechaPeticion: number;
  fechaResolucion?: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
}

export interface UsuarioApp {
  uid: string;
  email: string;
  nombre: string;
  rol: 'usuario' | 'admin' | 'desarrollador';
  fechaRegistro: string;
}

export interface JuegoFavorito {
  id?: string;
  name: string;
  background_image: string;
  released: string;
  rating?: number;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
  slug?: string;
}

// Inicialización de Firebase
const app = getApps().length ? getApps()[0] : initializeApp(environment.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

@Injectable({ providedIn: 'root' })
export class FirebaseService {

  private usuarioSubject = new BehaviorSubject<User | null | undefined>(undefined);
  usuario$ = this.usuarioSubject.asObservable();

  private rolSubject = new BehaviorSubject<string | null>(null);
  rol$ = this.rolSubject.asObservable();

  constructor() {
    setPersistence(auth, browserLocalPersistence).then(() => {
      onAuthStateChanged(auth, async (user) => {
        this.usuarioSubject.next(user);
        if (user) {
          const rol = await this.obtenerRolUsuario(user.uid);
          this.rolSubject.next(rol);
        } else {
          this.rolSubject.next(null);
        }
      });
    });
  }

  // ── SECCIÓN: ROLES Y USUARIOS ──

  async obtenerRolUsuario(uid: string): Promise<string> {
    const docRef = doc(db, 'usuarios', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data()['rol'] ?? 'usuario';
    }
    return 'usuario';
  }

  async crearUsuarioEnFirestore(user: User): Promise<void> {
    const docRef = doc(db, 'usuarios', user.uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        uid: user.uid,
        email: user.email,
        nombre: user.displayName ?? '',
        rol: 'usuario',
        fechaRegistro: new Date().toISOString()
      });
    }
  }

  get rolActual(): string | null {
    return this.rolSubject.getValue();
  }

  // ── SECCIÓN: AUTH ──

  get usuarioActual(): User | null {
    return auth.currentUser;
  }

  async cerrarSesion(): Promise<void> {
    localStorage.removeItem('sessionExpiry');
    await signOut(auth);
  }


  // ── SECCIÓN: JUEGOS OFICIALES ──

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

  async agregarJuego(juego: Omit<JuegoCustom, 'id'>): Promise<void> {
    await addDoc(collection(db, 'juegos'), juego);
  }

  async editarJuego(id: string, cambios: Partial<JuegoCustom>): Promise<void> {
    await updateDoc(doc(db, 'juegos', id), cambios);
  }

  async eliminarJuego(juego: JuegoCustom): Promise<void> {
    await deleteDoc(doc(db, 'juegos', juego.id!));
  }

  // ── SECCIÓN: PETICIONES DE DESARROLLADORES ──

  /**
   * Los Admins usan esto para ver las solicitudes en tiempo real
   */
  obtenerPeticiones(): Observable<PeticionJuego[]> {
    return new Observable(observer => {
      const colRef = collection(db, 'peticiones_juegos');
      // Opcional: const q = query(colRef, orderBy('fechaPeticion', 'desc'));
      const unsub = onSnapshot(colRef,
        snapshot => {
          const peticiones = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PeticionJuego));
          observer.next(peticiones);
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  /**
   * Los Desarrolladores usan esto para enviar su propuesta
   */
  async enviarPeticion(peticion: Omit<PeticionJuego, 'id'>): Promise<void> {
    await addDoc(collection(db, 'peticiones_juegos'), peticion);
  }

  /**
   * El Admin usa esto para borrar la petición tras aprobarla o rechazarla
   */
  async eliminarPeticion(id: string): Promise<void> {
    const docRef = doc(db, 'peticiones_juegos', id);
    await deleteDoc(docRef);
  }

  // ── SECCIÓN: UTILIDADES ──

  async buscarPorNombre(nombre: string): Promise<JuegoCustom[]> {
    const colRef = collection(db, 'juegos');
    const snapshot = await getDocs(colRef);
    const todos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JuegoCustom));
    return todos.filter(j => j.nombre.toLowerCase().includes(nombre.toLowerCase()));
  }

  subirImagen(archivo: File): Promise<{ url: string; path: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, path: 'uploads/' + Date.now() + '_' + archivo.name });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(archivo);
    });
  }

  async borrarImagen(imagenPath: string): Promise<void> {
    // Implementar si usas Firebase Storage en el futuro
    return;
  }

  async archivarPeticion(peticion: PeticionJuego, resultado: 'aprobado' | 'rechazado'): Promise<void> {
    await addDoc(collection(db, 'historial_peticiones'), {
      ...peticion,
      estado: resultado,
      fechaResolucion: Date.now(),
    });
    await this.eliminarPeticion(peticion.id!);
  }

  obtenerHistorial(): Observable<PeticionJuego[]> {
    return new Observable(observer => {
      const q = query(
        collection(db, 'historial_peticiones'),
        orderBy('fechaResolucion', 'desc')
      );
      const unsub = onSnapshot(q,
        snapshot => {
          const historial = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PeticionJuego));
          observer.next(historial);
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  obtenerHistorialPorDesarrollador(uid: string): Observable<PeticionJuego[]> {
    return new Observable(observer => {
      const q = query(
        collection(db, 'historial_peticiones'),
        orderBy('fechaResolucion', 'desc')
      );
      const unsub = onSnapshot(q,
        snapshot => {
          const historial = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as PeticionJuego))
            .filter(p => p.desarrolladorId === uid);
          observer.next(historial);
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  // ── SECCIÓN: FAVORITOS ──
  async añadirFavorito(juego: JuegoFavorito): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) { console.error('No hay usuario'); return; }
    const id = juego.released + '_' + juego.name.replace(/\s/g, '_');
    await setDoc(doc(db, 'favoritos', uid, 'juegos', id), juego);
  }

  async quitarFavorito(juego: JuegoFavorito): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) { console.error('No hay usuario'); return; }
    const id = juego.released + '_' + juego.name.replace(/\s/g, '_');
    await deleteDoc(doc(db, 'favoritos', uid, 'juegos', id));
  }

  async esFavorito(juego: JuegoFavorito): Promise<boolean> {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    const id = juego.released + '_' + juego.name.replace(/\s/g, '_');
    const snap = await getDoc(doc(db, 'favoritos', uid, 'juegos', id));
    return snap.exists();
  }

  obtenerFavoritos(): Observable<JuegoFavorito[]> {
    return new Observable(observer => {
      let unsubFirestore: (() => void) | null = null;

      const unsubAuth = onAuthStateChanged(auth, (user) => {
        // Cancelamos el listener anterior de Firestore si existía
        if (unsubFirestore) {
          unsubFirestore();
          unsubFirestore = null;
        }

        if (!user) {
          observer.next([]);
          return;
        }

        const colRef = collection(db, 'favoritos', user.uid, 'juegos');
        unsubFirestore = onSnapshot(colRef,
          snapshot => {
            const juegos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JuegoFavorito));
            observer.next(juegos);
          },
          err => observer.error(err)
        );
      });

      // Al hacer unsubscribe, limpiamos ambos listeners
      return () => {
        unsubAuth();
        if (unsubFirestore) unsubFirestore();
      };
    });
  }

  // ── SECCIÓN: AVATAR ──

  async actualizarAvatar(url: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(db, 'usuarios', uid), { avatarUrl: url });
  }

  obtenerAvatarUsuario(): Observable<string | null> {
    return new Observable(observer => {
      let unsubFirestore: (() => void) | null = null;

      const unsubAuth = onAuthStateChanged(auth, (user) => {
        if (unsubFirestore) {
          unsubFirestore();
          unsubFirestore = null;
        }

        if (!user) {
          observer.next(null);
          return;
        }

        const docRef = doc(db, 'usuarios', user.uid);
        unsubFirestore = onSnapshot(docRef, snap => {
          const data = snap.data();
          const url = data?.['avatarUrl'];
          observer.next((url && url !== 'null' && url.trim() !== '') ? url : null);
        });
      });

      return () => {
        unsubAuth();
        if (unsubFirestore) unsubFirestore();
      };
    });
  }


  async actualizarPerfil(datos: {
    bio?: string;
    generosFav?: string[];
    plataformasFav?: string[];
    redesSociales?: { twitter?: string; instagram?: string; youtube?: string; twitch?: string; steam?: string };
  }): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(db, 'usuarios', uid), { ...datos });
  }

  obtenerPerfil(): Observable<{
    bio: string;
    generosFav: string[];
    plataformasFav: string[];
    redesSociales: { twitter?: string; instagram?: string; youtube?: string; twitch?: string; steam?: string };
  } | null> {
    return new Observable(observer => {
      let unsubFirestore: (() => void) | null = null;
      const unsubAuth = onAuthStateChanged(auth, (user) => {
        if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
        if (!user) { observer.next(null); return; }
        const docRef = doc(db, 'usuarios', user.uid);
        unsubFirestore = onSnapshot(docRef, snap => {
          const data = snap.data();
          observer.next({
            bio: data?.['bio'] ?? '',
            generosFav: data?.['generosFav'] ?? [],
            plataformasFav: data?.['plataformasFav'] ?? [],
            redesSociales: data?.['redesSociales'] ?? {}
          });
        });
      });
      return () => { unsubAuth(); if (unsubFirestore) unsubFirestore(); };
    });
  }

}