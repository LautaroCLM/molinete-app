# Molinete: gestión para gimnasios

App web multi-gimnasio (SaaS) para socios, cuotas, asistencias, caja, inventario y reportes.
Nombre provisorio: **Molinete**.

**Estado: Etapas 1, 2 y 3 completas.** Interfaz, base de datos (Supabase), login, alta de gimnasios por el administrador, invitaciones por email, reglas de negocio e ingreso de socios con QR.

## Cómo correrlo (desarrollo)

Requiere Node 20 o más nuevo y Docker Desktop abierto.

```bash
npm install
npm run db:start
npm run seed
npm run dev
```

**Para mostrar la demo (rápido):** `npm run dev` compila cada pantalla al abrirla y se siente lento (de 1 a 7 segundos por módulo). Para presentar usá el modo producción, que es el mismo que usa Vercel: primero detené `npm run dev`, después

```bash
npm run demo
```

(compila una vez, tarda ~1 minuto, y queda en http://localhost:3000 con cambios de módulo de ~0,1 a 0,5 s). Si cambiás código, volvé a correr `npm run demo`.

- `npm run db:start` levanta Supabase en tu PC. Usa los puertos **554xx** para no chocar con otros proyectos de Supabase.
- `npm run seed` carga el gimnasio de demostración "Fuerza Sur".
- Después abrí <http://localhost:3000>.

### Usuarios de prueba
La contraseña es la misma para todos: `Molinete2026`.

| Email | Rol | Situación |
|---|---|---|
| martin@fuerzasur.com.ar | Dueño | No tiene caja abierta |
| sofia@fuerzasur.com.ar | Recepción | Tiene la caja abierta |
| lucas@fuerzasur.com.ar | Recepción | Dejó la caja de ayer sin cerrar |
| admin@molinete.test | Administrador de la plataforma | Entra a `/admin` |

No hay registro público: **los gimnasios y sus usuarios los da de alta el administrador de la plataforma** desde `/admin` (ver abajo).

### Panel de administración (`/admin`)
Solo lo ve el administrador de la plataforma (vos). Desde ahí:
- **Nuevo gimnasio:** cargás los datos del gimnasio (nombre, dirección, localidad, teléfono, email), el dueño y los empleados, cada uno con su email y su contraseña (hay un botón para generar una). Al terminar muestra los datos de acceso listos para copiar y pasarle al cliente.
- **Lista de gimnasios:** socios, usuarios y último ingreso de cada uno.
- **Detalle de un gimnasio:** agregar usuarios (empleados u otro dueño), restablecer contraseñas y desactivar o reactivar usuarios.

No hay registro público y el dueño **no puede crear usuarios**: sus empleados los das de alta vos. El dueño sí puede ver su equipo y desactivar o reactivar usuarios.

**Cómo se hace administrador un usuario** (una sola vez, con tu propio email):
1. En Supabase → Authentication → Users → Add user: tu email y contraseña, con **Auto Confirm User**.
2. En el SQL Editor:

```sql
insert into plataforma_admins (user_id) select id from auth.users where email = 'tu@email.com';
```

Al ingresar con ese usuario vas directo a `/admin`. En local, el administrador de prueba es `admin@molinete.test`.

### Herramientas locales
- **Studio** (ver y editar tablas): <http://127.0.0.1:55423>
- **Mailpit** (bandeja donde llegan los emails de invitación y de recuperación): <http://127.0.0.1:55424>

### Scripts
| Script | Qué hace |
|---|---|
| `npm run db:start` / `db:stop` | Prende o apaga Supabase local |
| `npm run db:reset` | Borra la base, aplica las migraciones y vuelve a cargar la demo |
| `npm run seed` | Recarga el gimnasio de demostración |
| `npm run verificar` | Corre 32 chequeos de seguridad: permisos por rol, aislamiento entre gimnasios e ingreso con QR (también genera un QR nuevo para la demo) |
| `npm run db:tipos` | Regenera `src/types/database.ts` después de cambiar el esquema |

### Atajos de teclado
`Ctrl K` busca un socio · `F2` registra una llegada · `F3` cobra · `F4` vende productos.

## Ingreso con QR (Etapa 3)
- **Para el dueño:** en Configuración → Ingreso con QR está el código, el enlace, el botón "Imprimir cartel" (A4), la opción de pausar el ingreso con QR y la de generar un QR nuevo, que invalida el anterior.
- **Para el socio:** escanea el QR y abre `/q/<código>`, una página pública sin login.
  - La primera vez escribe su DNI. El celular guarda solo un código de dispositivo, nunca el DNI.
  - Las siguientes veces entra solo con escanear.
- **Qué ve el socio:** su nombre de pila y el estado de la cuota (días que le quedan, por vencer, vencida o paquete de clases). A quien paga por clase le aparece "Acordate de abonar en recepción".
- **Qué no hace:** no registra pagos. Tampoco cuenta dos veces si el socio vuelve a escanear dentro de las 3 horas.
- **Protección:**
  - Las funciones públicas devuelven solo esos datos.
  - Un celular vinculado a un gimnasio no sirve en otro.
  - Después de 20 DNIs inexistentes en 10 minutos, se frenan los intentos por un rato.
- **En la recepción:** las llegadas por QR aparecen en Asistencias con la etiqueta "QR".

## Cómo está armado

### Seguridad
- **Separación entre gimnasios:** cada tabla lleva `gym_id`, y Row Level Security hace que cada usuario vea solo los datos de su gimnasio, aunque llame a la API directamente.
- **Recepción:**
  - Solo ve sus propios movimientos y cajas.
  - No ve totales generales, reportes, configuración ni auditoría.
  - No puede anular movimientos ni cambiar a mano un vencimiento o el stock.
- **Dinero y stock:** cobrar, vender, abrir y cerrar caja, cargar gastos, anular movimientos y ajustar stock son funciones de Postgres que corren en una sola transacción. Cada una valida el rol, que haya una caja abierta y el gimnasio, y deja registro en la auditoría.
- **Movimientos:** nunca se borran; se anulan con motivo.
- **Auditoría:** se registra sola, con triggers, en altas y cambios de socios, planes, productos, usuarios y configuración.

### Estructura

```
supabase/
  migrations/              Esquema, RLS, funciones de negocio y auditoría
  templates/               Emails de invitación y recuperación (en español)
  config.toml              Configuración local (puertos 554xx)
scripts/
  seed.ts                  Carga la demo reutilizando el generador de src/mocks
  verificar-seguridad.ts   Chequeos de RLS y permisos
src/
  proxy.ts                 Refresca la sesión y manda al login a quien no la tenga
  app/(auth)/              Ingreso, recuperar contraseña, bienvenida (invitados)
  app/auth/                Enlaces de los emails y cierre de sesión
  app/(panel)/             Pantallas del panel
  lib/supabase/            Clientes: con sesión (server.ts) y administrador (admin.ts, solo servidor)
  lib/data/                Lecturas: las pantallas solo leen desde acá
  lib/actions/             Escrituras (acciones del servidor)
  lib/domain/cuota.ts      Estado de la cuota (igual que calcular_vencimiento en SQL)
  types/database.ts        Tipos generados desde la base
```

## Publicación
- **App:** https://molinete-pi.vercel.app (Vercel, región São Paulo). Se publica con `vercel deploy --prod`.
- **Base:** proyecto `molinete` en Supabase (São Paulo). Las migraciones se aplican con `npx supabase db push --remote`.
- **Variables en Vercel:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`. Se cargan con `scripts/cargar-env-vercel.ps1`.
- **Configuración de Auth en la nube:** está en la sección `[remotes.production]` de `supabase/config.toml` y se aplica con `npx supabase config push --remote`.
- **Zona horaria:** `src/instrumentation.ts` fija la de Argentina en el servidor.

## Pendiente
- **Emails:** hoy Supabase usa su servidor de prueba, que solo envía a miembros de tu cuenta y con límite de 2 por hora.
  - Para que lleguen a cualquier recepcionista hace falta configurar un servidor de correo propio (SMTP, por ejemplo Gmail con contraseña de aplicación) en Supabase → Authentication → Emails → SMTP Settings.
  - Después hay que descomentar las plantillas en español de `config.toml` y aplicarlas con `config push`.
  - **Hasta entonces las invitaciones de usuarios no funcionan.** El email de confirmación de cuenta y "olvidé mi contraseña" sí funcionan, pero con el texto por defecto en inglés.
- **Anular un cobro no revierte el vencimiento del socio, y anular una venta no devuelve el stock.** El dueño puede corregirlos a mano.
- **Subir el logo del gimnasio** (requiere Storage).
- **Dominio propio:** hoy es `molinete-pi.vercel.app`. Al cambiarlo hay que actualizar `site_url` en `config.toml` y volver a aplicarlo.
- **El freno de intentos del QR es por gimnasio**, no por IP. Alguien podría trabar por 10 minutos la primera vinculación de otros socios (los ya vinculados no se ven afectados).


## App de escritorio (Windows)

Carpeta `desktop/` (Tauri v2): una ventana de Windows que carga la web publicada (https://molinete-pi.vercel.app). No cambia la web.

- **Cambios en la web:** llegan solos a todas las apps instaladas. Si la pantalla está abierta, aparece "Hay una nueva actualización" con el botón **Actualizar**.
- **Cambios en la ventana** (poco frecuentes): se publica un instalador nuevo. Al abrir, la app lo detecta y ofrece **Instalar ahora**.
- **Sin conexión:** muestra una pantalla de "Reintentar".
- **Descargas** (Excel) van a la carpeta Descargas y se muestran en el Explorador. Los enlaces externos se abren en el navegador.
- Requiere Rust (toolchain MSVC), Visual Studio Build Tools y Node.

Publicar una versión del instalador (solo cuando cambia `desktop/`):

```powershell
# 1) subir "version" en desktop\src-tauri\tauri.conf.json y desktop\src-tauri\Cargo.toml
# 2) compilar y preparar los archivos
.\scripts\publicar-escritorio.ps1 -Notas "Qué cambió"
# 3) publicar la web para que las apps instaladas lo reciban
vercel deploy --prod
```

El instalador para clientes nuevos queda en `public\desktop\Molinete-Setup.exe` (y en https://molinete-pi.vercel.app/desktop/Molinete-Setup.exe). Windows muestra "Windows protegió tu PC" porque no está firmado con certificado: **Más información > Ejecutar de todas formas**.

La clave que firma las actualizaciones está en `%USERPROFILE%\.molinete\updater.key`. **Guardá una copia fuera de la PC**: si se pierde, las apps ya instaladas no podrán actualizarse y habría que reinstalarlas. No se sube al repositorio.


## App para el celular (Android)

La web es una PWA instalable: no hay APK ni tienda. En Chrome para Android, entrá a https://molinete-pi.vercel.app, abrí el menú de Chrome y tocá **Instalar app** (también aparece "Instalar la app" en el menú del usuario y en la pantalla de ingreso). Queda con su ícono, en pantalla completa, y se actualiza sola.

- `public/sw.js`: service worker. Las páginas siempre salen de la red; sin conexión muestra `public/offline.html`. Solo guarda archivos estáticos con hash.
- `src/app/manifest.ts`: nombre, colores e íconos (incluye `public/icon-maskable-512.png`).
- En iPhone se agrega desde Safari: Compartir > Agregar a pantalla de inicio.
