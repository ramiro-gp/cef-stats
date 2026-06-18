# Estado técnico de CEF Stats

## Qué funciona hoy

CEF Stats es un prototipo React + Vite + TypeScript + Tailwind, mobile first, con dark mode predeterminado. En modo cuenta usa Supabase Auth, `profiles`, `groups`, `group_members` y `stat_entries`; partidos y sus entidades relacionadas continúan en `localStorage`.

Incluye perfil y handle editables, grupos locales, grupo activo, carga rápida, rankings, feed, banner, Mundial Personal, partidos, equipos, cupos, invitados, vinculación por código/link, score, MVP, stats de invitados y cancha visual.

Las cuentas autenticadas siempre disponen de **Mi historial**, un scope virtual `personal:{userId}` que existe solo en el frontend/localStorage y permite usar toda la experiencia individual sin pertenecer a grupos. Los grupos reales son opcionales y se reservan para comparar con amigos.

## Estado de producción / staging

- Build de producción: Vite genera `dist` mediante `pnpm build`.
- Deploy objetivo: Vercel, con configuración explícita en `vercel.json` y pasos en `DEPLOY.md`.
- Variables requeridas: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- La navegación actual vive en estado React sobre `/`; no hay rutas client-side que requieran rewrites.
- Supabase remoto: Auth, profiles, grupos, membresías y stats.
- `localStorage`: partidos, participantes, invitados, score, eventos, preferencias y todo el dominio del modo local.
- Próximo paso después de estabilizar producción: diseñar y migrar partidos con schema/RLS propios, sin mezclarlo con este deploy.

## Arquitectura actual

```text
pages/components
      ↓
App + hooks de auth/grupos/store/theme
      ↓                         ↓
authRepository +          appRepository
supabaseRepository              ↓
      ↓                   localStorageAdapter
Supabase Auth/API                ↓
                             localStorage
```

- `src/types`: contratos centrales del dominio y `AppState`.
- `src/store/useLocalStore.ts`: estado y mutaciones locales. Sigue siendo el archivo más grande; conviene dividirlo por dominio cuando exista un repositorio remoto real.
- `src/data/appRepository.ts`: contrato y repositorios locales de app/tema.
- `src/data/localStorageAdapter.ts`: único archivo que conoce la API `localStorage`.
- `src/data/authRepository.ts`: frontera de Auth y profiles, incluyendo recuperación de profiles faltantes.
- `src/data/supabaseRepository.ts`: grupos, membresías, RPCs y errores RLS.
- `src/hooks/useAuth.ts`: sincronización de sesión/profile.
- `src/hooks/useSupabaseGroups.ts`: estado remoto, miembros y grupo activo persistido localmente.
- `src/hooks/useSupabaseStats.ts`: lectura y mutaciones remotas de stats según el scope activo.
- `src/utils/scopes.ts`: scope `personal:{userId}` y detección de contexto personal.
- `src/lib/supabaseClient.ts`: cliente nullable; sin env vars no rompe el arranque.
- `src/utils/ids.ts`: IDs y códigos de invitación.
- `src/utils/identity.ts`: normalización/validación de handles.
- `src/utils/groups.ts`: códigos de grupo.
- `src/utils/selectors.ts`: grupo activo, membresías, participantes, cargas por grupo/partido y duplicados.
- `src/utils/stats.ts`, `matches.ts`, `activityFeed.ts`, `banner.ts`, `worldCup.ts`: reglas y proyecciones puras.

## Auditoría y deuda conocida

- Los accesos a persistencia quedaron centralizados; componentes y hooks ya no usan `localStorage` directamente.
- `useLocalStore` concentra muchas mutaciones. No se dividió en esta tanda para evitar una reescritura riesgosa.
- `MatchesPage` sigue siendo denso visualmente, aunque su lógica derivada reutiliza selectores/helpers.
- `MatchEvent` es la fuente local del feed de partidos; al migrar conviene convertirlo en eventos persistidos.
- Los rankings mock y contadores históricos no representan miembros reales completos.
- `GroupMember` ya existe y se migra para el usuario local, pero los miembros mock restantes no se inventan.
- El Mundial Personal continúa calculándose en frontend y no fue modificado.
- El usuario autenticado aporta nombre, handle y avatar; nickname y posición siguen locales. Sus stats usan Supabase y los partidos continúan locales.
- Las tablas remotas de grupos están conectadas a la UI solo en modo cuenta.
- Las stats autenticadas se leen y escriben en Supabase; partidos, invitados y eventos siguen locales.
- Mi historial usa su propio ID local y es el fallback personal-first cuando no hay grupos.
- Algunos componentes legacy de detalle de participante/invitado permanecen en el repo aunque el flujo actual usa popover. Pueden retirarse en una limpieza posterior con QA visual.

## Ejecutar

```bash
pnpm install
pnpm dev
```

Validar:

```bash
pnpm build
pnpm lint
```

## Persistencia y compatibilidad

- Estado principal: `cef-stats-local-v1`.
- Tema: `cef-theme`.
- Los datos existentes se normalizan al cargar.
- Si faltan `groupMembers`, se crean membresías locales iniciales sin descartar el resto del estado.
- Resetear datos elimina el estado principal y conserva el comportamiento anterior.
- Iniciar o cerrar sesión no elimina estadísticas ni partidos locales.
- Sin variables Supabase, la pantalla de acceso explica la configuración y mantiene disponible el modo local.
- Preferencia de grupo remoto activo: `cef-stats-active-supabase-group`.
- Las stats locales anteriores no se importan automáticamente a una cuenta.
- La pantalla inicial volvió a mostrar login y modo local; se corrigió el fallback booleano que dejaba solamente el logo.

## Próximo paso recomendado

Ejecutar y validar `supabase/patches/002_add_stat_entries.sql` con dos usuarios reales. El próximo paso recomendado es un importador explícito de stats locales; partidos y eventos deben permanecer locales hasta tener una migración separada e idempotente.

Para corregir instalaciones existentes con el error de `gen_random_bytes`, ejecutar `supabase/patches/001_fix_invite_code_generation.sql` desde SQL Editor.
