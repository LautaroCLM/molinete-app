# Molinete: estado del proyecto

Actualizar solo ante cambios significativos (no registrar comandos). Última actualización: 2026-11-12.

## Implementado
- **Panel** (dueño y recepción): inicio, socios, asistencias, caja, inventario, reportes (solo dueño) y configuración (solo dueño). Modo claro y oscuro, desktop-first, preparado para PWA (manifest e ícono).
- **Base de datos** (Supabase): esquema multi-gimnasio con RLS, reglas de dinero y stock en funciones SQL atómicas, auditoría automática. Migraciones en `supabase/migrations` (10, todas aplicadas en local y en la nube).
- **Autenticación**: login, recuperación de contraseña, invitación de usuarios por email. **Sin registro público**: el administrador de la plataforma crea gimnasios, dueños y empleados (con contraseña) desde el panel `/admin`; el dueño no crea usuarios, solo los ve y los desactiva.
- **Ingreso con QR**: página pública `/q/<token>`, celular recordado, solo nombre de pila y estado de cuota; configuración y cartel imprimible en Configuración → Ingreso con QR.
- **Seguridad verificada**: `npm run verificar` (permisos por rol, aislamiento entre gimnasios, QR, panel de administración, logo en Storage, anulaciones).
- **Anular cobros y ventas** (solo dueño) deshace sus efectos: el socio vuelve a su cuota anterior y la venta repone el stock (los cobros se anulan del último al primero).
- **Logo del gimnasio**: lo sube el dueño en Configuración (Storage, bucket `logos`); se ve en el menú y la barra. Sin logo, iniciales.
- **Avatares de socios**: objeto con ojos y color fijos según el id (`socio-avatar.tsx`; formas de Open Bot Avatar, MIT, ver `THIRD_PARTY_NOTICES.md`).
- **Exportar a Excel** (solo dueño): socios, caja, inventario y asistencias.
- **Diseño**: negro con verde, degradados, animaciones sutiles (respetan "reducir movimiento"), modo oscuro por defecto.
- **Aviso de nueva versión**: si se publica la web con la pantalla abierta, aparece "Hay una nueva actualización" → Actualizar (`/api/version`).
- **App para Android** (PWA instalable): service worker, pantalla sin conexión, íconos y botón "Instalar la app". Ver README.
- **App de escritorio para Windows** (`desktop/`, Tauri): ventana que carga la web publicada, con aviso de actualización del instalador. Ver README.

## Publicación
- App: https://molinete-pi.vercel.app (Vercel, cuenta lautaroclm, región gru1).
- Base: Supabase proyecto `molinete`, ref `qnlydppzwskamjytacfm` (sa-east-1). Arrancó vacía, sin datos demo.
- Config de Auth de producción: sección `[remotes.production]` de `supabase/config.toml`; SMTP de Gmail configurado (remitente molinete361@gmail.com) y plantillas en español aplicadas.
- Git: rama `main`, remoto `origin` = https://github.com/LautaroCLM/molinete-app.git (todo subido).

## Pendiente / problemas abiertos
- **Límite de emails de Auth**: Supabase respondió 429 `over_email_send_rate_limit` en producción. Afecta invitaciones y recuperación de contraseña; revisar/subir el límite en Supabase → Authentication → Rate Limits.
- Probar de punta a punta en producción: alta de un gimnasio, invitación de un usuario, recuperación de contraseña.
- Posible usuario de prueba sin confirmar en Auth (intentos de registro con konix2412@gmail.com): revisar y borrar en Authentication → Users.
- Tras las pruebas: borrar de la base en la nube el gimnasio y los usuarios de prueba.
- App de escritorio: sin probar de punta a punta el flujo de actualización del instalador (hacen falta dos versiones); instalador sin firma de Windows (aviso de SmartScreen). **Guardar copia de la clave `%USERPROFILE%\\.molinete\\updater.key`.**
- Cobros/ventas anteriores a la migración de anulación no se pueden revertir automáticamente (sin foto del estado previo).
- Ideas descartadas por ahora: correo propio para recuperar contraseñas, dominio propio.
- Dominio propio (hoy `molinete-pi.vercel.app`); al cambiarlo, actualizar `site_url` en `config.toml` y aplicarlo.
- El freno de intentos del QR es por gimnasio, no por IP.

## Decisiones técnicas relevantes
- Next.js 16 (App Router, `proxy.ts`), Tailwind 4 + shadcn/ui, Recharts, zod; `cacheComponents` desactivado (todo depende de la sesión).
- El servidor fija la zona horaria de Argentina en `src/instrumentation.ts`.
- Roles: dueño y recepcionista. Recepción no ve totales, reportes, configuración ni auditoría, y no anula movimientos.
- Gastos de administración (alquiler, sueldos, servicios) los carga el dueño sin caja de turno.
- Los movimientos no se borran: se anulan con motivo.
