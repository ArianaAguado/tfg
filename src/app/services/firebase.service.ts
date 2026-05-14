import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Auth, onAuthStateChanged, signOut, User, browserLocalPersistence, setPersistence, updateProfile } from '@angular/fire/auth';
import {
  Firestore, collection, collectionGroup, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs,
  getDoc, setDoc, query, orderBy, where
} from '@angular/fire/firestore';
import { Timestamp } from '@angular/fire/firestore';


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

export interface Comentario {
  id?: string;
  slug: string;
  uid: string;
  nombreUsuario: string;
  fotoUsuario: string;
  rolUsuario: string;
  texto: string;
  fecha: number;
}

export interface UsuarioPublico {
  uid: string;
  nombre: string;
  email?: string;
  rol: string;
  avatarUrl?: string;
  bio?: string;
  generosFav?: string[];
  plataformasFav?: string[];
  redesSociales?: { twitter?: string; instagram?: string; youtube?: string; twitch?: string; steam?: string };
  fechaRegistro?: string;
}

export interface SolicitudAmistad {
  id?: string;
  deUid: string;
  deNombre: string;
  deFoto: string;
  paraUid: string;
  fecha: number;
}

export type EstadoAmistad =
  | 'ninguna'
  | 'pendiente_enviada'
  | 'pendiente_recibida'
  | 'amigos'
  | 'mismo_usuario';

export interface TicketSoporte {
  id?: string;
  asunto: string;
  descripcion: string;
  capturas: string[];
  estado: 'abierto' | 'respondido' | 'cerrado';
  autorId: string;
  autorNombre: string;
  autorEmail: string;
  autorRol: string;
  fechaCreacion: number;
  respuesta?: string;
  fechaRespuesta?: number;
}

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
  redesSociales?: { steam?: string;[key: string]: string | undefined };
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {

  private auth = inject(Auth);
  private db = inject(Firestore);
  private zone = inject(NgZone);

  private usuarioSubject = new BehaviorSubject<User | null | undefined>(undefined);
  usuario$ = this.usuarioSubject.asObservable();

  private rolSubject = new BehaviorSubject<string | null>(null);
  rol$ = this.rolSubject.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(this.db, 'usuarios', user.uid));
        const data = docSnap.exists() ? docSnap.data() : null;

        if (data?.['baneado'] === true) {
          await signOut(this.auth);
          this.zone.run(() => {
            this.usuarioSubject.next(null);
            this.rolSubject.next(null);
          });
          return;
        }

        this.zone.run(() => this.usuarioSubject.next(user));
        const rol = data?.['rol'] ?? 'usuario';
        this.zone.run(() => this.rolSubject.next(rol));
      } else {
        this.zone.run(() => {
          this.usuarioSubject.next(null);
          this.rolSubject.next(null);
        });
      }
    });

    setPersistence(this.auth, browserLocalPersistence)
      .catch(err => console.error('Error setPersistence:', err));
  }

  

  // ── SECCIÓN: ROLES Y USUARIOS ──

  async obtenerRolUsuario(uid: string): Promise<string> {
    const docRef = doc(this.db, 'usuarios', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data()['rol'] ?? 'usuario';
    }
    return 'usuario';
  }

  async crearUsuarioEnFirestore(user: User): Promise<void> {
    const docRef = doc(this.db, 'usuarios', user.uid);
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

  get usuarioActual(): User | null {
    return this.auth.currentUser;
  }

  async cerrarSesion(): Promise<void> {
    localStorage.removeItem('sessionExpiry');
    await signOut(this.auth);
  }

  // ── JUEGOS OFICIALES ──

  obtenerJuegos(): Observable<JuegoCustom[]> {
    return new Observable(observer => {
      const colRef = collection(this.db, 'juegos');
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
    await addDoc(collection(this.db, 'juegos'), juego);
  }

  async editarJuego(id: string, cambios: Partial<JuegoCustom>): Promise<void> {
    await updateDoc(doc(this.db, 'juegos', id), cambios);
  }

  async eliminarJuego(juego: JuegoCustom): Promise<void> {
    await deleteDoc(doc(this.db, 'juegos', juego.id!));
  }

  // ── PETICIONES ──

  obtenerPeticiones(): Observable<PeticionJuego[]> {
    return new Observable(observer => {
      const colRef = collection(this.db, 'peticiones_juegos');
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

  async enviarPeticion(peticion: Omit<PeticionJuego, 'id'>): Promise<void> {
    await addDoc(collection(this.db, 'peticiones_juegos'), peticion);
  }

  async eliminarPeticion(id: string): Promise<void> {
    const docRef = doc(this.db, 'peticiones_juegos', id);
    await deleteDoc(docRef);
  }

  async buscarPorNombre(nombre: string): Promise<JuegoCustom[]> {
    const colRef = collection(this.db, 'juegos');
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
    return;
  }

  async archivarPeticion(peticion: PeticionJuego, resultado: 'aprobado' | 'rechazado'): Promise<void> {
    await addDoc(collection(this.db, 'historial_peticiones'), {
      ...peticion,
      estado: resultado,
      fechaResolucion: Date.now(),
    });
    await this.eliminarPeticion(peticion.id!);
  }

  obtenerHistorial(): Observable<PeticionJuego[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.db, 'historial_peticiones'),
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
        collection(this.db, 'historial_peticiones'),
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

  // ── FAVORITOS ──

  async añadirFavorito(juego: JuegoFavorito): Promise<void> {
  const uid = this.auth.currentUser?.uid;
  if (!uid) { console.error('No hay usuario'); return; }
  const id = juego.released + '' + juego.name.replace(/\s/g, '');
  await setDoc(doc(this.db, 'favoritos', uid, 'juegos', id), juego);

  // Si es juego custom, incrementar likes
  if (!juego.slug || juego.slug.startsWith('custom_')) {
    const slug = 'custom_' + juego.name.toLowerCase().trim().replace(/\s+/g, '_');
    const ref = doc(this.db, 'likes_juegos', slug);
    const snap = await getDoc(ref);
    await setDoc(ref, { contador: (snap.exists() ? snap.data()['contador'] : 0) + 1 });
  }
}

async quitarFavorito(juego: JuegoFavorito): Promise<void> {
  const uid = this.auth.currentUser?.uid;
  if (!uid) { console.error('No hay usuario'); return; }
  const id = juego.released + '' + juego.name.replace(/\s/g, '');
  await deleteDoc(doc(this.db, 'favoritos', uid, 'juegos', id));

  // Si es juego custom, decrementar likes
  if (!juego.slug || juego.slug.startsWith('custom_')) {
    const slug = 'custom_' + juego.name.toLowerCase().trim().replace(/\s+/g, '_');
    const ref = doc(this.db, 'likes_juegos', slug);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await setDoc(ref, { contador: Math.max(0, snap.data()['contador'] - 1) });
    }
  }
}

  async esFavorito(juego: JuegoFavorito): Promise<boolean> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return false;
    const id = juego.released + '' + juego.name.replace(/\s/g, '');
    const snap = await getDoc(doc(this.db, 'favoritos', uid, 'juegos', id));
    return snap.exists();
  }

  obtenerFavoritos(): Observable<JuegoFavorito[]> {
    return new Observable(observer => {
      let unsubFirestore: (() => void) | null = null;

      const unsubAuth = onAuthStateChanged(this.auth, (user) => {
        if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
        if (!user) { observer.next([]); return; }

        const colRef = collection(this.db, 'favoritos', user.uid, 'juegos');
        unsubFirestore = onSnapshot(colRef,
          snapshot => {
            const juegos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JuegoFavorito));
            observer.next(juegos);
          },
          err => observer.error(err)
        );
      });

      return () => {
        unsubAuth();
        if (unsubFirestore) unsubFirestore();
      };
    });
  }

  async obtenerFavoritosDeUsuario(uid: string): Promise<JuegoFavorito[]> {
    const colRef = collection(this.db, 'favoritos', uid, 'juegos');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JuegoFavorito));
  }

  // ── AVATAR ──

  async actualizarAvatar(url: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(this.db, 'usuarios', uid), { avatarUrl: url });
  }

  obtenerAvatarUsuario(): Observable<string | null> {
    return new Observable(observer => {
      let unsubFirestore: (() => void) | null = null;

      const unsubAuth = onAuthStateChanged(this.auth, (user) => {
        if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
        if (!user) { observer.next(null); return; }

        const docRef = doc(this.db, 'usuarios', user.uid);
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
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(this.db, 'usuarios', uid), { ...datos });
  }

  obtenerPerfil(): Observable<{
    bio: string;
    generosFav: string[];
    plataformasFav: string[];
    redesSociales: { twitter?: string; instagram?: string; youtube?: string; twitch?: string; steam?: string };
  } | null> {
    return new Observable(observer => {
      let unsubFirestore: (() => void) | null = null;
      const unsubAuth = onAuthStateChanged(this.auth, (user) => {
        if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
        if (!user) { observer.next(null); return; }
        const docRef = doc(this.db, 'usuarios', user.uid);
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

  // ── COMENTARIOS ──

  obtenerComentariosDeJuego(slug: string): Observable<Comentario[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.db, 'comentarios'),
        where('slug', '==', slug)
      );
      const unsub = onSnapshot(q,
        snapshot => {
          const comentarios = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as Comentario))
            .sort((a, b) => b.fecha - a.fecha);
          this.zone.run(() => observer.next(comentarios));
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  async publicarComentario(slug: string, texto: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) { console.error('No hay usuario'); return; }
    if (!texto.trim()) return;
    if (texto.length > 280) texto = texto.substring(0, 280);

    const userDocRef = doc(this.db, 'usuarios', uid);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    const authUser = this.auth.currentUser;
    const nombreUsuario = userData['nombre'] ?? authUser?.displayName ?? 'Usuario';
    const fotoUsuario = userData['avatarUrl'] ?? '';
    const rolUsuario = userData['rol'] ?? 'usuario';

    const comentario: Omit<Comentario, 'id'> = {
      slug, uid, nombreUsuario, fotoUsuario, rolUsuario,
      texto: texto.trim(),
      fecha: Date.now()
    };

    await addDoc(collection(this.db, 'comentarios'), comentario);
  }

  async borrarComentario(comentario: Comentario): Promise<boolean> {
    const uid = this.auth.currentUser?.uid;
    if (!uid || !comentario.id) return false;
    const esAutor = comentario.uid === uid;
    const esAdmin = this.rolActual === 'admin';
    if (!esAutor && !esAdmin) return false;
    await deleteDoc(doc(this.db, 'comentarios', comentario.id));
    return true;
  }

  // ── USUARIO PÚBLICO ──

  async obtenerUsuarioPublico(uid: string): Promise<UsuarioPublico | null> {
    const snap = await getDoc(doc(this.db, 'usuarios', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uid,
      nombre: d['nombre'] ?? '',
      email: d['email'],
      rol: d['rol'] ?? 'usuario',
      avatarUrl: d['avatarUrl'] ?? '',
      bio: d['bio'] ?? '',
      generosFav: d['generosFav'] ?? [],
      plataformasFav: d['plataformasFav'] ?? [],
      redesSociales: d['redesSociales'] ?? {},
      fechaRegistro: d['fechaRegistro']
    };
  }

  // ── AMISTADES ──

  private idAmistad(uidA: string, uidB: string): string {
    return [uidA, uidB].sort().join('_');
  }

  async obtenerEstadoAmistad(otroUid: string): Promise<EstadoAmistad> {
    const miUid = this.auth.currentUser?.uid;
    if (!miUid) return 'ninguna';
    if (miUid === otroUid) return 'mismo_usuario';

    const amistadId = this.idAmistad(miUid, otroUid);
    const amistadSnap = await getDoc(doc(this.db, 'amistades', amistadId));
    if (amistadSnap.exists()) return 'amigos';

    const colRef = collection(this.db, 'solicitudes_amistad');
    const enviadasQ = query(colRef, where('deUid', '==', miUid), where('paraUid', '==', otroUid));
    const enviadasSnap = await getDocs(enviadasQ);
    if (!enviadasSnap.empty) return 'pendiente_enviada';

    const recibidasQ = query(colRef, where('deUid', '==', otroUid), where('paraUid', '==', miUid));
    const recibidasSnap = await getDocs(recibidasQ);
    if (!recibidasSnap.empty) return 'pendiente_recibida';

    return 'ninguna';
  }

  async enviarSolicitudAmistad(otroUid: string): Promise<void> {
    const miUid = this.auth.currentUser?.uid;
    if (!miUid || miUid === otroUid) return;

    const miDoc = await getDoc(doc(this.db, 'usuarios', miUid));
    const miData = miDoc.exists() ? miDoc.data() : {};
    const authUser = this.auth.currentUser;

    const solicitud: Omit<SolicitudAmistad, 'id'> = {
      deUid: miUid,
      deNombre: miData['nombre'] ?? authUser?.displayName ?? 'Usuario',
      deFoto: miData['avatarUrl'] ?? '',
      paraUid: otroUid,
      fecha: Date.now()
    };

    await addDoc(collection(this.db, 'solicitudes_amistad'), solicitud);
  }

  async cancelarSolicitudAmistad(otroUid: string): Promise<void> {
    const miUid = this.auth.currentUser?.uid;
    if (!miUid) return;

    const q = query(
      collection(this.db, 'solicitudes_amistad'),
      where('deUid', '==', miUid),
      where('paraUid', '==', otroUid)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(doc(this.db, 'solicitudes_amistad', d.id));
    }
  }


  async aceptarSolicitudAmistad(solicitud: SolicitudAmistad): Promise<void> {
    const miUid = this.auth.currentUser?.uid;
    if (!miUid || !solicitud.id) return;

    const id = this.idAmistad(miUid, solicitud.deUid);
    await setDoc(doc(this.db, 'amistades', id), {
      uids: [miUid, solicitud.deUid].sort(),
      fecha: Timestamp.now() // ← en vez de Date.now()
    });

    await deleteDoc(doc(this.db, 'solicitudes_amistad', solicitud.id));
  }

  async rechazarSolicitudAmistad(solicitud: SolicitudAmistad): Promise<void> {
    if (!solicitud.id) return;
    await deleteDoc(doc(this.db, 'solicitudes_amistad', solicitud.id));
  }

  async eliminarAmistad(otroUid: string): Promise<void> {
    const miUid = this.auth.currentUser?.uid;
    if (!miUid) return;
    const id = this.idAmistad(miUid, otroUid);
    await deleteDoc(doc(this.db, 'amistades', id));
  }

  obtenerAmigos(): Observable<UsuarioPublico[]> {
    return new Observable(observer => {
      let unsubFirestore: (() => void) | null = null;

      const unsubAuth = onAuthStateChanged(this.auth, (user) => {
        if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
        if (!user) { observer.next([]); return; }

        const q = query(
          collection(this.db, 'amistades'),
          where('uids', 'array-contains', user.uid)
        );

        unsubFirestore = onSnapshot(q, async snapshot => {
          const uidsAmigos: string[] = [];
          for (const d of snapshot.docs) {
            const data = d.data();
            const [a, b] = data['uids'] as string[];
            uidsAmigos.push(a === user.uid ? b : a);
          }

          const amigos: UsuarioPublico[] = [];
          for (const uid of uidsAmigos) {
            const perfil = await this.obtenerUsuarioPublico(uid);
            if (perfil) amigos.push(perfil);
          }

          this.zone.run(() => observer.next(amigos));
        });
      });

      return () => {
        unsubAuth();
        if (unsubFirestore) unsubFirestore();
      };
    });
  }

  obtenerSolicitudesRecibidas(): Observable<SolicitudAmistad[]> {
    return new Observable(observer => {
      let unsubFirestore: (() => void) | null = null;

      const unsubAuth = onAuthStateChanged(this.auth, (user) => {
        if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
        if (!user) { observer.next([]); return; }

        const q = query(
          collection(this.db, 'solicitudes_amistad'),
          where('paraUid', '==', user.uid)
        );

        unsubFirestore = onSnapshot(q, snapshot => {
          const solicitudes = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as SolicitudAmistad))
            .sort((a, b) => b.fecha - a.fecha);
          this.zone.run(() => observer.next(solicitudes));
        });
      });

      return () => {
        unsubAuth();
        if (unsubFirestore) unsubFirestore();
      };
    });
  }

  async darHype(slug: string, uid: string): Promise<void> {
    const ref = doc(this.db, 'hype', slug);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data['usuarios']?.includes(uid)) return; // ya dio hype
      await updateDoc(ref, {
        contador: data['contador'] + 1,
        usuarios: [...data['usuarios'], uid]
      });
    } else {
      await setDoc(ref, { contador: 1, usuarios: [uid] });
    }
  }

  async quitarHype(slug: string, uid: string): Promise<void> {
    const ref = doc(this.db, 'hype', slug);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    await updateDoc(ref, {
      contador: Math.max(0, data['contador'] - 1),
      usuarios: data['usuarios'].filter((u: string) => u !== uid)
    });
  }

  obtenerHype(slug: string): Observable<{ contador: number, usuarios: string[] }> {
    return new Observable(observer => {
      const ref = doc(this.db, 'hype', slug);
      const unsub = onSnapshot(ref, snap => {
        if (snap.exists()) {
          observer.next(snap.data() as { contador: number, usuarios: string[] });
        } else {
          observer.next({ contador: 0, usuarios: [] });
        }
      });
      return () => unsub();
    });
  }


  async actualizarNombre(nombre: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado');
    await updateProfile(user, { displayName: nombre });
  }

  // ── RANKINGS ──
  obtenerRankingMasAnadidos(limite: number = 5): Observable<{ name: string; background_image: string; slug?: string; released?: string; esCustom?: boolean; total: number }[]> {
    return new Observable(observer => {
      const colRef = collectionGroup(this.db, 'juegos');
      const unsub = onSnapshot(colRef,
        snapshot => {
          // Agrupar por nombre (mismo juego, varios usuarios)
          const mapa = new Map<string, { name: string; background_image: string; slug?: string; released?: string; total: number }>();

          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as any;
            const key = (data.name ?? '').toLowerCase().trim();
            if (!key) continue;

            if (mapa.has(key)) {
              mapa.get(key)!.total++;
            } else {
              mapa.set(key, {
                name: data.name,
                background_image: data.background_image,
                slug: data.slug,
                released: data.released,
                total: 1
              });
            }
          }

          const ranking = Array.from(mapa.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, limite);

          this.zone.run(() => observer.next(ranking));
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  obtenerRankingMasHype(limite: number = 5): Observable<{ slug: string; contador: number }[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.db, 'hype'),
        orderBy('contador', 'desc')
      );
      const unsub = onSnapshot(q,
        snapshot => {
          const ranking = snapshot.docs
            .map(d => ({ slug: d.id, contador: (d.data() as any).contador ?? 0 }))
            .filter(r => r.contador > 0)
            .slice(0, limite);
          this.zone.run(() => observer.next(ranking));
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  // ── NOTIFICACIONES ──
  obtenerNotificacionesLeidas(): Observable<Set<string>> {
    return new Observable(observer => {
      let unsubFirestore: (() => void) | null = null;

      const unsubAuth = onAuthStateChanged(this.auth, (user) => {
        if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
        if (!user) { observer.next(new Set()); return; }

        const colRef = collection(this.db, 'notificaciones_leidas', user.uid, 'items');
        unsubFirestore = onSnapshot(colRef,
          snapshot => {
            const ids = new Set(snapshot.docs.map(d => d.id));
            this.zone.run(() => observer.next(ids));
          },
          err => observer.error(err)
        );
      });

      return () => {
        unsubAuth();
        if (unsubFirestore) unsubFirestore();
      };
    });
  }

  async marcarNotificacionLeida(notificacionId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    await setDoc(doc(this.db, 'notificaciones_leidas', uid, 'items', notificacionId), {
      fecha: Date.now()
    });
  }

  async marcarTodasLeidas(ids: string[]): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    await Promise.all(
      ids.map(id => setDoc(doc(this.db, 'notificaciones_leidas', uid, 'items', id), {
        fecha: Date.now()
      }))
    );
  }

  // ── TICKETS DE SOPORTE ──

  async enviarTicket(ticket: Omit<TicketSoporte, 'id'>): Promise<void> {
    await addDoc(collection(this.db, 'tickets_soporte'), ticket);
  }

  obtenerMisTickets(uid: string): Observable<TicketSoporte[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.db, 'tickets_soporte'),
        where('autorId', '==', uid),
        orderBy('fechaCreacion', 'desc')
      );
      const unsub = onSnapshot(q,
        snapshot => {
          const tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TicketSoporte));
          this.zone.run(() => observer.next(tickets));
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  obtenerTicketsAdmin(): Observable<TicketSoporte[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.db, 'tickets_soporte'),
        orderBy('fechaCreacion', 'desc')
      );
      const unsub = onSnapshot(q,
        snapshot => {
          const tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TicketSoporte));
          this.zone.run(() => observer.next(tickets));
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  async responderTicket(id: string, respuesta: string): Promise<void> {
    await updateDoc(doc(this.db, 'tickets_soporte', id), {
      respuesta,
      estado: 'respondido',
      fechaRespuesta: Date.now()
    });
  }

  async cerrarTicket(id: string): Promise<void> {
    await updateDoc(doc(this.db, 'tickets_soporte', id), { estado: 'cerrado' });
  }

  async subirCaptura(archivo: File): Promise<string> {
    const { url } = await this.subirImagen(archivo);
    return url;
  }

  // ── ADMIN PANEL: GESTIÓN GLOBAL DE USUARIOS ──

  /**
   * Cuenta cuántos documentos hay en una colección.
   * Lo usa el panel de admin para mostrar KPIs (total usuarios, juegos, propuestas).
   */
  async contarColeccion(nombreColeccion: string): Promise<number> {
    const snap = await getDocs(collection(this.db, nombreColeccion));
    return snap.size;
  }

  /**
   * Lista TODOS los usuarios registrados.
   * Solo debería poder llamarlo un admin (lo controlan las reglas de Firestore).
   */
  getTodosUsuarios(): Observable<UsuarioAdmin[]> {
    return new Observable(observer => {
      const colRef = collection(this.db, 'usuarios');
      const unsub = onSnapshot(colRef,
        snapshot => {
          const usuarios = snapshot.docs.map(d => {
            const data = d.data() as any;
            return {
              uid: d.id,
              nombre: data.nombre ?? '',
              email: data.email ?? '',
              avatarUrl: data.avatarUrl ?? '',
              rol: data.rol ?? 'usuario',
              baneado: data.baneado ?? false,
              fechaRegistro: data.fechaRegistro,
              bio: data.bio ?? '',
              generosFav: data.generosFav ?? [],
              plataformasFav: data.plataformasFav ?? [],
              redesSociales: data.redesSociales ?? {}
            } as UsuarioAdmin;
          });
          this.zone.run(() => observer.next(usuarios));
        },
        err => observer.error(err)
      );
      return () => unsub();
    });
  }

  /** Cambia el rol de un usuario. */
  async actualizarRolUsuario(uid: string, nuevoRol: string): Promise<void> {
    await updateDoc(doc(this.db, 'usuarios', uid), { rol: nuevoRol });
  }

  /** Actualiza cualquier campo del documento de un usuario (banear, etc.). */
  async actualizarUsuario(uid: string, cambios: Partial<UsuarioAdmin>): Promise<void> {
    await updateDoc(doc(this.db, 'usuarios', uid), cambios as any);
  }

  // ── ESTADÍSTICAS DEL DESARROLLADOR ──

  getMisPropuestas(uid: string): Observable<any[]> {
    return new Observable(observer => {
      const qActivas = query(
        collection(this.db, 'peticiones_juegos'),
        where('desarrolladorId', '==', uid)
      );
      const qHistorial = query(
        collection(this.db, 'historial_peticiones'),
        where('desarrolladorId', '==', uid)
      );

      let activas: any[] = [];
      let historial: any[] = [];

      const emitir = async () => {
  if (!this.auth.currentUser) return;
  const todas = [...activas, ...historial];

        const enriquecidas = await Promise.all(todas.map(async p => {
          const slug = 'custom_' + (p.nombre ?? '').toLowerCase().trim().replace(/\s+/g, '_');

          const statsSnap = await getDoc(doc(this.db, 'stats_juegos', slug));
          const visitas = statsSnap.exists() ? (statsSnap.data()['visitas'] ?? 0) : 0;

          const hypeSnap = await getDoc(doc(this.db, 'hype', slug));
          const interesados = hypeSnap.exists() ? (hypeSnap.data()['contador'] ?? 0) : 0;

          const likesSnap = await getDoc(doc(this.db, 'likes_juegos', slug));
          const likes = likesSnap.exists() ? (likesSnap.data()['contador'] ?? 0) : 0;

          return {
            id: p.id,
            nombre: p.nombre,
            imagen: p.imagen,
            plataformas: p.plataformas ?? [],
            descripcion: p.descripcion ?? '',
            estado: p.estado ?? 'pendiente',
            visitas,
            interesados,
            likes,
          };
        }));

        this.zone.run(() => observer.next(enriquecidas));
      };

      const unsubActivas = onSnapshot(qActivas,
        snap => { activas = snap.docs.map(d => ({ id: d.id, ...d.data() })); emitir(); },
        err => observer.error(err)
      );
      const unsubHistorial = onSnapshot(qHistorial,
        snap => { historial = snap.docs.map(d => ({ id: d.id, ...d.data() })); emitir(); },
        err => observer.error(err)
      );

      return () => { unsubActivas(); unsubHistorial(); };
    });
  }

  async incrementarVisita(slug: string): Promise<void> {
  const ref = doc(this.db, 'stats_juegos', slug);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { visitas: snap.data()['visitas'] + 1 });
  } else {
    await setDoc(ref, { visitas: 1 });
  }
}



async getDocUsuario(uid: string): Promise<Record<string, any> | null> {
  const snap = await getDoc(doc(this.db, 'usuarios', uid));
  return snap.exists() ? snap.data() : null;
}

}