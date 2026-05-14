# Para descargar todas las depencias necesarias para el proyecto tras descargarlo del GitHub
npm install --legacy-peer-deps

# Web desplegada:
https://tfg-calendario-b73f0.web.app/

# Know Your Game

**Know Your Game** es una aplicación web de calendario de lanzamientos de videojuegos desarrollada como Trabajo de Fin de Grado. La plataforma permite consultar próximos lanzamientos, gestionar una biblioteca personal de juegos favoritos, interactuar socialmente con otros usuarios mediante comentarios y reacciones, y proponer nuevos títulos para su inclusión en el catálogo.

---

## Tabla de contenidos

1. [Características principales](#características-principales)
2. [Stack tecnológico](#stack-tecnológico)
3. [Roles de usuario](#roles-de-usuario)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Rutas de la aplicación](#rutas-de-la-aplicación)
6. [Instalación y puesta en marcha](#instalación-y-puesta-en-marcha)
7. [Configuración necesaria](#configuración-necesaria)
8. [Modelo de datos](#modelo-de-datos)
9. [Scripts disponibles](#scripts-disponibles)
10. [Testing](#testing)
11. [Patrones técnicos destacados](#patrones-técnicos-destacados)
12. [Autoría](#autoría)

---

## Características principales

- **Calendario mensual de lanzamientos** con datos en directo de la API de RAWG, navegación entre meses con caché en memoria y paginación automática de resultados.
- **Buscador integrado** que combina resultados de RAWG con los juegos personalizados (custom) almacenados en Firestore.
- **Biblioteca personal** de juegos favoritos por usuario, con sincronización en tiempo real.
- **Sistema de hype** (reacción pública agregada) y ranking "Más Hype" en el calendario.
- **Comentarios** por juego con avatares por rol, contador de caracteres y moderación.
- **Visitas contabilizadas** por juego, usadas como métrica para desarrolladores y administradores.
- **Propuestas de nuevos juegos** por parte de usuarios con rol de desarrollador, con flujo de aprobación o rechazo por administradores.
- **Sistema de soporte** con creación de tickets por usuarios y bandeja de gestión para administradores.
- **Sistema de amigos** con solicitudes, contador en tiempo real y perfiles públicos.
- **Notificaciones** en tiempo real para eventos sociales y administrativos.
- **Panel de administración** con gestión de usuarios, roles, baneos y métricas de la plataforma.
- **Panel de estadísticas** para desarrolladores con visitas, valoraciones y rendimiento de sus propuestas.
- **Autenticación** mediante email y contraseña o cuenta de Google.

---

## Stack tecnológico

### Frontend
- **Angular 21** (componentes standalone, sin NgModules).
- **TypeScript 5.9**.
- **RxJS** para manejo reactivo de datos.
- **CSS puro** con tema oscuro y acentos neón (`#00ccff` cian, `#ff00ff` magenta, `#ff00aa` rosa).
- **Font Awesome** y **Material Icons** para iconografía.

### Backend (Backend-as-a-Service)
- **Firebase Authentication** para gestión de usuarios y sesiones, incluyendo OAuth con Google.
- **Cloud Firestore** como base de datos NoSQL en tiempo real.
- **AngularFire** (`@angular/fire`) como integración oficial entre Angular y Firebase.

### API externa
- **RAWG Video Games Database API** como fuente de datos del catálogo de videojuegos.

### Herramientas de desarrollo
- **Angular CLI 21**.
- **Vitest** para tests unitarios.
- **Prettier** para formato de código.

---

## Roles de usuario

La aplicación soporta tres roles, cada uno con acceso a funcionalidades distintas:

| Rol | Capacidades |
|---|---|
| **Usuario** | Consultar calendario, gestionar biblioteca de favoritos, dar hype, comentar, añadir amigos, abrir tickets de soporte. |
| **Desarrollador** | Todas las del usuario, más proponer nuevos juegos para el catálogo y consultar estadísticas sobre sus propuestas. |
| **Administrador** | Todas las anteriores, más crear y editar juegos del catálogo, revisar y aprobar/rechazar propuestas, gestionar usuarios y roles, y atender tickets de soporte. |

El rol se almacena en Firestore en el documento del usuario (`usuarios/{uid}.rol`).

---

## Estructura del proyecto

```
src/
├── app/
│   ├── components/
│   │   ├── admin-panel.component/   # Panel de administración
│   │   ├── admin-soporte/           # Bandeja de soporte para admins
│   │   ├── amigos/                  # Gestión de amistades
│   │   ├── biblioteca/              # Favoritos del usuario
│   │   ├── calendario/              # Calendario de lanzamientos
│   │   ├── cerrar-sesion/           # Botón de logout
│   │   ├── crearjuegos/             # Creación de juegos custom (admin)
│   │   ├── dashboard/               # Layout principal con sidebar
│   │   ├── detalle-juego/           # Página de detalle por juego
│   │   ├── estadisticas.component/  # Estadísticas para desarrolladores
│   │   ├── notificaciones/          # Campana de notificaciones
│   │   ├── perfil/                  # Perfil del usuario
│   │   ├── perfil-publico/          # Perfil público de otros usuarios
│   │   ├── peticionesjuegos/        # Revisión de propuestas (admin)
│   │   ├── proponerjuego/           # Envío de propuestas (dev)
│   │   └── soporte/                 # Tickets de soporte (usuario)
│   ├── features/
│   │   └── auth/
│   │       ├── login/               # Inicio de sesión
│   │       └── register/            # Registro
│   ├── guards/
│   │   └── auth.guard.ts            # Protección de rutas privadas
│   ├── inicio/                      # Landing pública
│   └── services/
│       ├── firebase.service.ts      # Capa de acceso a Firestore y Auth
│       └── rawg.ts                  # Cliente de la API de RAWG
├── environments/
│   └── environments.ts              # Credenciales de Firebase
└── styles.css                       # Estilos globales
```

---

## Rutas de la aplicación

| Ruta | Componente | Protección | Descripción |
|---|---|---|---|
| `/` | Inicio | Pública | Landing de la aplicación. |
| `/login` | Login | Pública | Inicio de sesión. |
| `/register` | Register | Pública | Registro de nuevos usuarios. |
| `/dashboard` | Dashboard | `authGuard` | Layout principal con sidebar y rutas hijas. |
| `/dashboard/calendario` | Calendario | `authGuard` | Calendario mensual con rankings. |
| `/dashboard/biblioteca` | Biblioteca | `authGuard` | Favoritos del usuario. |
| `/dashboard/perfil` | Perfil | `authGuard` | Perfil propio editable. |
| `/dashboard/amigos` | Amigos | `authGuard` | Gestión de amistades. |
| `/dashboard/usuario/:uid` | PerfilPublico | `authGuard` | Perfil público de otro usuario. |
| `/dashboard/juego/:slug` | DetalleJuego | `authGuard` | Detalle de un juego de RAWG. |
| `/dashboard/juego-custom` | DetalleJuego | `authGuard` | Detalle de un juego custom. |
| `/dashboard/proponer-juego` | ProponerJuego | `authGuard` | Envío de propuestas (rol desarrollador). |
| `/dashboard/estadisticas` | Estadisticas | `authGuard` | Estadísticas de propuestas (rol desarrollador). |
| `/dashboard/crear-juegos` | CrearJuegos | `authGuard` | Gestión de juegos custom (rol admin). |
| `/dashboard/peticiones` | PeticionesJuegos | `authGuard` | Revisión de propuestas (rol admin). |
| `/dashboard/admin-panel` | AdminPanel | `authGuard` | Gestión de usuarios (rol admin). |
| `/dashboard/soporte` | Soporte | `authGuard` | Tickets de soporte (cualquier usuario). |
| `/dashboard/admin-soporte` | AdminSoporte | `authGuard` | Bandeja de tickets (rol admin). |

> **Nota:** el `authGuard` solo verifica que exista un usuario autenticado. La diferenciación por rol (mostrar u ocultar opciones de admin/desarrollador) se realiza en el cliente para la UI, mientras que la autorización real reside en las reglas de seguridad de Firestore.

---

## Instalación y puesta en marcha

### Requisitos previos

- **Node.js 20** o superior.
- **npm 10** o superior.
- Un proyecto de **Firebase** con Authentication y Firestore habilitados.
- Una **clave de API de RAWG** (gratuita en [rawg.io/apidocs](https://rawg.io/apidocs)).

### Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/ArianaAguado/tfg.git
   cd tfg
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar las credenciales (ver sección [Configuración necesaria](#configuración-necesaria)).

4. Arrancar el servidor de desarrollo:
   ```bash
   ng serve -o
   ```

   La aplicación se abrirá automáticamente en `http://localhost:4200`.

---

## Configuración necesaria

### Firebase

Las credenciales del proyecto Firebase se encuentran en `src/environments/environments.ts`. Para usar tu propio proyecto, reemplaza el objeto `firebaseConfig` con tu propia configuración:

```ts
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  }
};
```

Necesitas tener habilitados:
- **Authentication** con los proveedores Email/Password y Google.
- **Cloud Firestore** en modo de producción o de pruebas (las reglas se aplican aparte).

### RAWG API

Nuestra clave de RAWG está hardcodeada en `src/app/services/rawg.ts` para agilizar el proceso de desarrollo. Para usar tu propia clave, sustituye el valor de `apiKey` por la tuya. La cuota gratuita permite hasta 20.000 peticiones al mes.

---

## Modelo de datos

La aplicación utiliza las siguientes colecciones de Firestore:

| Colección | Descripción |
|---|---|
| `usuarios/{uid}` | Perfil de cada usuario: nombre, email, rol, avatar, géneros y plataformas favoritas, redes sociales, estado de baneo. |
| `juegos` | Juegos personalizados (custom) creados por administradores. |
| `favoritos/{uid}/juegos/{id}` | Subcolección por usuario con sus juegos favoritos. El ID sigue el formato `fecha_nombre`. |
| `peticiones_juegos` | Propuestas pendientes de revisión enviadas por desarrolladores. |
| `historial_peticiones` | Propuestas ya procesadas (aprobadas o rechazadas). |
| `hype/{slug}` | Contador de hype por juego. Contiene `contador` (número) y `usuarios` (array de UIDs). |
| `comentarios` | Comentarios públicos asociados a un juego, identificado por su slug. |
| `stats_juegos` | Contador de visitas a la página de detalle de cada juego. |
| `likes_juegos` | Contador de favoritos por juego custom, utilizado para rankings. |
| `tickets_soporte` | Tickets de soporte abiertos por usuarios. |
| `amistades` y `solicitudes_amistad` | Gestión de relaciones entre usuarios. |
| `notificaciones_leidas/{uid}` | Estado de lectura de notificaciones por usuario. |

### Estrategia de identificación de juegos

Los juegos provenientes de RAWG se identifican mediante el `slug` que devuelve su API. Los juegos custom no tienen slug nativo, por lo que se les asigna un identificador artificial con el patrón `custom_<nombre_normalizado>` (minúsculas, espacios sustituidos por guiones bajos). Esta unificación permite que los sistemas de hype, comentarios y visitas traten ambos orígenes de manera homogénea.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm start` o `ng serve` | Arranca el servidor de desarrollo en `localhost:4200`. |
| `npm run build` | Compila la aplicación para producción en `dist/`. |
| `npm run watch` | Compila en modo desarrollo con recompilación automática. |
| `npm test` o `ng test` | Ejecuta los tests unitarios con Vitest. |

---

## Testing

El proyecto utiliza **Vitest** como framework de tests unitarios (configurado por defecto en Angular 21). La estrategia priorizada es la verificación de lógica de negocio pura sobre los tests de instanciación de componentes. Actualmente se cubren:

- **`rawg.spec.ts`**: tests del servicio de RAWG (normalización de juegos y cálculo de rangos de fechas, incluyendo años bisiestos).
- **`calendario.spec.ts`**: tests del componente principal (sistema de filtros por género y plataforma, generación de la rejilla mensual, detección del día actual y formato de cadenas).

Total: 20 tests pasando en menos de 5 segundos.

---

## Patrones técnicos destacados

A lo largo del desarrollo se han aplicado varios patrones y soluciones técnicas relevantes:

- **Capa de servicio** (`FirebaseService`) que abstrae toda la comunicación con Firebase, desacoplando los componentes del proveedor de backend.
- **Suscripciones reactivas** con `onSnapshot` para que los datos (favoritos, comentarios, hype, notificaciones, contadores de admin) se actualicen en tiempo real sin recargar la página.
- **Cancelación de suscripciones** en `ngOnDestroy` para evitar fugas de memoria.
- **`ChangeDetectorRef.detectChanges()`** tras recibir datos de Firebase, ya que el SDK opera fuera de la zona de cambio de Angular (NgZone) y no dispara la detección automática.
- **`BehaviorSubject` con valor inicial `undefined`** en el estado de usuario, para distinguir entre "Firebase aún no respondió" y "no hay usuario", evitando redirecciones prematuras del `authGuard`.
- **Caché de RAWG** mediante `Map<string, any[]>` indexado por mes, para evitar peticiones repetidas al navegar entre meses ya visitados.
- **Operaciones atómicas de Firestore** (`arrayUnion`, `arrayRemove`, `increment`) para garantizar consistencia en contadores compartidos como el hype.
- **Reglas de seguridad declarativas en Firestore** que aplican la autorización real en el servidor, independientemente de las comprobaciones del cliente.

---

## Autoría

Proyecto desarrollado como Trabajo de Fin de Grado por **Ariana Aguado** y **Javier Herrera**.

Repositorio: [github.com/ArianaAguado/tfg](https://github.com/ArianaAguado/tfg)

---

## Licencia

Este proyecto es de uso académico. Los datos de juegos provienen de [RAWG.io](https://rawg.io) bajo sus términos de uso para desarrolladores.