@AGENTS.md

# Molinete: reglas permanentes de trabajo

SaaS multi-gimnasio en español (Argentina, pesos). Next.js 16 + Supabase. Estado actual en `PROJECT_STATUS.md`; guía de uso y estructura en `README.md`. Consultar esos dos antes de explorar el código.

## Comunicación
- Respuestas breves, técnicas y directas. Sin narrar el proceso ni explicar cada comando.
- Al terminar una tarea informar solo: 1) qué se hizo, 2) archivos modificados, 3) verificaciones ejecutadas y su resultado, 4) problemas o pendientes importantes.
- Si algo requiere mi intervención, decirlo directamente.
- No afirmar que algo funciona sin haberlo comprobado.

## Consumo de contexto y tokens
- Leer solo los archivos y secciones relevantes (con offset/límite); no archivos completos si alcanza una función o componente.
- Sin búsquedas globales indiscriminadas. No re-investigar lo ya analizado mientras su contexto siga vigente.
- Agrupar en una sola llamada las operaciones independientes.
- No repetir auditorías completas tras cambios pequeños; verificar de forma proporcional al alcance (ver Verificación).
- No generar documentación redundante ni informes largos para tareas chicas.
- Subagentes solo para trabajo independiente y paralelizable, o si reducen el costo total. Nunca dos agentes sobre los mismos archivos.
- Usar `/compact` cuando el contexto empiece a perjudicar la eficiencia, conservando decisiones, archivos modificados, pendientes y próximos pasos. Usar `/clear` al empezar una tarea independiente.

## Selección de modelo
- Usar el modelo más económico que resuelva bien la tarea: cambios chicos y consultas puntuales con el económico; desarrollo y debugging habituales con el intermedio; arquitectura, seguridad (RLS, permisos, funciones de dinero) y lógica crítica con el de mayor capacidad.
- No usar el máximo para tareas rutinarias. No sacrificar calidad ni seguridad por ahorrar tokens.

## Desarrollo
- Entender el problema y los archivos involucrados antes de tocar código; diseñar una solución concreta y simple.
- Reutilizar componentes, funciones y patrones existentes. Sin sobreingeniería, abstracciones, dependencias ni archivos innecesarios.
- No modificar archivos ajenos a la tarea ni reescribir módulos funcionales sin justificación técnica. Una tarea pequeña no se convierte en refactor.
- Debugging: reproducir, hallar la causa raíz y recién entonces corregir.

## Verificación (proporcional al cambio)
- Siempre: `npm run typecheck` (y `npx eslint` sobre lo tocado).
- Cambios en base de datos, permisos, cobros, caja, stock o QR: `npm run verificar` (requiere Supabase local levantado).
- `npm run build` solo antes de publicar o si se tocó configuración/rutas.

## Seguridad y control de cambios
- No exponer secretos ni pedirlos en el chat: las claves las carga el usuario (`scripts/cargar-env-vercel.ps1`, `scripts/configurar-gmail.ps1`). No leer ni imprimir `.env*` ni la secret key.
- No modificar variables de entorno ni configuración remota sin autorización explícita.
- Sin operaciones destructivas sobre datos. Sin despliegues (`vercel deploy`), migraciones remotas (`supabase db push --remote`, `config push --remote`) ni cambios irreversibles sin autorización explícita.
- Sin commits ni pushes sin autorización explícita.
- Conservar arquitectura y funcionalidades existentes salvo pedido expreso.
- No tocar los otros proyectos de Supabase del usuario ni detenerlos sin preguntar.

## Convenciones del proyecto (no obvias desde el código)
- Las pantallas leen solo desde `src/lib/data`; las escrituras van por `src/lib/actions`. El dinero y el stock se mueven únicamente con funciones SQL (RPC) atómicas, nunca con escrituras directas.
- Toda tabla de negocio lleva `gym_id` y RLS. Permisos por rol en `src/lib/permissions.ts` y replicados en la base.
- Cambios de esquema: nueva migración en `supabase/migrations` + `npm run db:tipos`. En Supabase la función `gen_random_bytes` se llama como `extensions.gen_random_bytes`.
- Desarrollo local: Supabase en Docker con puertos 554xx (`npm run db:start`, `npm run seed`). Usuarios demo en el README.
- Texto de interfaz en español rioplatense (voseo); fechas y moneda con `src/lib/format.ts`.
- Entorno: PowerShell 5.1 trata la salida de error de comandos nativos (p. ej. el banner de `vercel`) como error; usar `$ErrorActionPreference = "Continue"` y verificar `$LASTEXITCODE`. Si la ventana de Claude está oculta, los screenshots fallan: usar `get_page_text` o `javascript_tool`.

## Diseño (equipo de skills; sin solapamientos)
Un rol por skill; usar solo las que correspondan a la tarea:
- Dirección artística y composición (nuevo o rediseño): `frontend-design`.
- Investigación de paletas, tipografías, patrones y UX: `ui-ux-pro-max` (consultar, no decide la identidad).
- Auditoría, jerarquía, pulido y consistencia de lo ya construido: `impeccable`.
- Animación, transiciones y microinteracciones: `emil-design-eng`.
- Revisión de calidad frontend (responsive, semántica, buenas prácticas): `web-design-guidelines`.
- Accesibilidad (nombres, teclado, foco, contraste, formularios): `fixing-accessibility`.
Orden típico: dirección (frontend-design, apoyada en ui-ux-pro-max) → implementar → impeccable → emil-design-eng → web-design-guidelines → fixing-accessibility.
Reglas: una sola dirección visual para toda la app, definida en tokens (`globals.css`/Tailwind) y componentes shadcn existentes; si dos skills discrepan manda la dirección artística acordada con el usuario. Respetar `prefers-reduced-motion`. No tocar lógica de negocio al rediseñar. Verificar con `typecheck` + `eslint` y revisión visual en desktop, tablet y móvil.
