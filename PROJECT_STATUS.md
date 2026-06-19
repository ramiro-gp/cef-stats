# Estado técnico de CEF Stats

## Qué funciona hoy

CEF Stats es un prototipo React + Vite + TypeScript + Tailwind, mobile first, con dark mode predeterminado. En modo cuenta usa Supabase Auth, perfiles, grupos, stats, partidos, participantes e invitados. El modo local conserva su store de `localStorage`.

Incluye perfil y handle editables, grupos locales, grupo activo, carga rápida, rankings, feed, banner, Mundial Personal, partidos, equipos, cupos, invitados, vinculación por código/link, score, votos MVP, comentarios cortos, stats de invitados y cancha visual.

Las cuentas autenticadas conservan un scope personal interno `personal:{userId}` para cargas sin grupo. El historial vive en Perfil; el selector principal muestra `TODOS` y grupos reales.

## Estado de producción / staging

- Build de producción: Vite genera `dist` mediante `pnpm build`.
- Deploy objetivo: Vercel, con configuración explícita en `vercel.json` y pasos en `DEPLOY.md`.
- Variables requeridas: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- React Router administra rutas protegidas, historial atrás/adelante, detalle de partido y 404. Vercel reescribe rutas SPA a `index.html`.
- Supabase remoto: Auth, profiles, grupos, membresías, stats, partidos, participantes, invitados, score, votos MVP y comentarios.
- `localStorage`: preferencias, compatibilidad histórica y todo el dominio del modo local interno.
- Los links de grupos y partidos usan el dominio actual y conservan la intención durante login.
- La UI muestra la versión de `package.json` en desktop y mobile para identificar cada deploy.

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
- `src/data/supabaseMatchRepository.ts` y `src/hooks/useSupabaseMatches.ts`: frontera remota y estado global de los partidos propios, independiente del grupo activo.
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
- El usuario autenticado aporta nombre, handle, avatar y posición. En modo cuenta, si no hay apodo remoto, la interfaz usa el nombre y no hereda datos del modo local.
- Las tablas remotas de grupos están conectadas a la UI solo en modo cuenta.
- Stats y partidos autenticados se leen y escriben en Supabase; feed/banner siguen como proyecciones frontend.
- Un usuario puede participar de un partido por código sin pertenecer al grupo anfitrión. Esa participación no crea una fila en `group_members` ni habilita acceso a otros partidos del grupo.
- Abrir una invitación crea la participación aun sin equipo. `team` queda nulo hasta elegir claro u oscuro y esa fila ya habilita detalle, comentarios y voto MVP.
- El scope personal usa su propio ID interno y se elige sólo como contexto de carga; no se administra ni aparece como grupo.
- `TODOS` usa el scope virtual `all:{userId}` y agrega únicamente grupos donde la cuenta es miembro. No habilita administración ni membresías nuevas.
- Perfil tiene un historial propio, independiente del selector, paginado desde Supabase de a 20 cargas y restringido al usuario autenticado.
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
- Sin variables Supabase, la pantalla de acceso explica la configuración. El modo local permanece en la arquitectura, pero ya no se ofrece como acción visible del gateway.
- Preferencia de grupo remoto activo: `cef-stats-active-supabase-group`.
- Las stats locales anteriores no se importan automáticamente a una cuenta.
- La pantalla inicial prioriza login/registro de cuenta real y ya no muestra el acceso al modo local.

## Próximo paso recomendado

Ejecutar `supabase/patches/007_allow_external_match_participants.sql` y luego `supabase/patches/008_allow_match_participants_without_team.sql` antes de desplegar esta versión. Después conviene automatizar pruebas de RLS/RPCs y diseñar una importación explícita de datos locales históricos.

Para corregir instalaciones existentes con el error de `gen_random_bytes`, ejecutar `supabase/patches/001_fix_invite_code_generation.sql` desde SQL Editor.
