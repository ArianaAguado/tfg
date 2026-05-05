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
  setDoc
} from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
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

export interface UsuarioApp {
  uid: string;
  email: string;
  nombre: string;
  rol: 'usuario' | 'admin' | 'desarrollador';
  fechaRegistro: string;
}

const app = getApps().length ? getApps()[0] : initializeApp(environment.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

@Injectable({ providedIn: 'root' })
export class FirebaseService {

  private usuarioSubject = new BehaviorSubject<User | null>(null);
  usuario$ = this.usuarioSubject.asObservable();

  private rolSubject = new BehaviorSubject<string | null>(null);
  rol$ = this.rolSubject.asObservable();

  constructor() {
    onAuthStateChanged(auth, async (user) => {
      this.usuarioSubject.next(user);
      if (user) {
        const rol = await this.obtenerRolUsuario(user.uid);
        this.rolSubject.next(rol);
      } else {
        this.rolSubject.next(null);
      }
    });
  }

  // ── ROLES ──

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

  // ── AUTH ──

  get usuarioActual(): User | null {
    return auth.currentUser;
  }

  async cerrarSesion(): Promise<void> {
    await signOut(auth);
  }

  // ── JUEGOS ──

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