# Plan de migración a Supabase

Este documento describe el modelo objetivo. Auth, profiles, grupos, membresías y stats ya usan Supabase en modo cuenta. Partidos, participantes, invitados y eventos siguen funcionando con `localStorage`.

## Estado de implementación

- Implementado: cliente opcional, email/password, sesión, registro, logout, trigger de profile, edición de profile y fallback local.
- Implementado: `groups` y `group_members` reales en modo cuenta, miembros con profiles, creación transaccional, edición, unión por código y selector persistido.
- Implementado: scope personal virtual `personal:{userId}`; los grupos compartidos son opcionales.
- Implementado: `stat_entries` remotas por scope, CRUD, RLS por propietario/membresía y cálculos frontend de Perfil, rankings y Mundial Personal.
- Modo local: conserva sus grupos y membresías mock sin depender de Supabase.
- Todavía local en ambos modos: partidos, participantes, invitados y eventos.
- Siguiente paso: probar RLS de stats con dos usuarios y preparar un importador local explícito sin tocar partidos.

### Compatibilidad SQL

Supabase suele instalar `pgcrypto` en el schema `extensions`. La RPC de creación referencia explícitamente `extensions.gen_random_bytes`. Bases existentes deben ejecutar el patch idempotente `supabase/patches/001_fix_invite_code_generation.sql`; no hace falta recrear tablas ni borrar datos.

## Modelo actual

- `User`: perfil local único.
- `Group`: espacio que separa cargas, partidos, rankings, feed y banner.
- `GroupMember`: vínculo explícito entre usuario y grupo; hoy solo se persiste la membresía local conocida.
- `StatEntry`: resultado, goles y asistencias de un usuario dentro de un grupo, opcionalmente ligado a un partido y equipo.
- `Match`: partido, formato, fecha, creador, código, estado, score y MVP.
- `MatchParticipant`: usuario registrado o invitado anotado en un equipo.
- `GuestMatchStats`: goles y asistencias de un invitado en un partido.
- `MatchEvent`: eventos que alimentan el feed local.
- `ActivityFeedItem`, rankings, banner y Mundial Personal: proyecciones calculadas a partir de las entidades anteriores y datos mock.

## Tablas sugeridas

### `profiles`

- `id uuid primary key references auth.users(id)`
- `handle text unique not null`
- `name text not null`
- `nickname text`
- `avatar_url text` o `avatar_text text`
- `position text`
- `created_at timestamptz`
- `updated_at timestamptz`

Cada usuario puede leer perfiles necesarios para sus grupos. Solo el dueño puede modificar su perfil.

### `groups`

- `id uuid primary key`
- `name text not null`
- `code text unique not null`
- `emoji text`
- `created_by uuid references profiles(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

`member_count`, `games_count`, rankings y flags derivados no necesitan ser fuente de verdad; se pueden calcular o materializar más adelante.

### `group_members`

- `id uuid primary key`
- `group_id uuid references groups(id) on delete cascade`
- `user_id uuid references profiles(id) on delete cascade`
- `role text check (role in ('owner','admin','member'))`
- `joined_at timestamptz`
- `unique(group_id, user_id)`

Esta tabla define acceso. Un usuario solo debería consultar datos de grupos a los que pertenece.

### `stat_entries` (implementada con patch 002)

- `id uuid primary key`
- `scope_type text check (scope_type in ('personal','group'))`
- `group_id uuid null references groups(id)`
- `user_id uuid references profiles(id)`
- `local_match_id text null` (referencia transitoria, sin FK, mientras partidos sean locales)
- `team text null check (team in ('light','dark'))`
- `result text check (result in ('win','draw','loss'))`
- `goals integer not null check (goals >= 0)`
- `assists integer not null check (assists >= 0)`
- `created_at timestamptz`
- `updated_at timestamptz`

Personal exige `group_id null`; grupo exige `group_id` presente. RLS permite leer stats grupales solo a miembros y mutar únicamente las propias.

### `matches`

- `id uuid primary key`
- `group_id uuid references groups(id) on delete cascade`
- `created_by uuid references profiles(id)`
- `title text not null`
- `format text check (format in ('F5','F6','F7','F8','F11'))`
- `scheduled_at timestamptz`
- `invite_code text unique not null`
- `status text check (status in ('open','played','closed'))`
- `score_light integer null check (score_light >= 0)`
- `score_dark integer null check (score_dark >= 0)`
- `mvp_participant_id uuid null`
- `created_at timestamptz`
- `updated_at timestamptz`

El MVP referencia a `match_participants`; esa foreign key puede agregarse después de crear ambas tablas.

### `match_participants`

- `id uuid primary key`
- `match_id uuid references matches(id) on delete cascade`
- `user_id uuid null references profiles(id)`
- `participant_type text check (participant_type in ('registered_user','guest'))`
- `guest_name text null`
- `guest_handle text null`
- `guest_avatar text null`
- `team text check (team in ('light','dark'))`
- `created_at timestamptz`

Para registrados: `user_id` obligatorio y único por partido. Para invitados: `guest_name` obligatorio y `user_id` nulo. Estas reglas pueden expresarse con checks.

### `match_guest_stats`

- `participant_id uuid primary key references match_participants(id) on delete cascade`
- `goals integer not null default 0 check (goals >= 0)`
- `assists integer not null default 0 check (assists >= 0)`
- `updated_at timestamptz`

Separarla evita mezclar stats de invitados con `stat_entries`, que alimentan rankings, perfil y Mundial Personal.

### `activity_feed`

- `id uuid primary key`
- `group_id uuid references groups(id) on delete cascade`
- `match_id uuid null references matches(id) on delete cascade`
- `actor_user_id uuid null references profiles(id)`
- `participant_id uuid null references match_participants(id)`
- `event_type text not null`
- `payload jsonb not null default '{}'`
- `created_at timestamptz`

Guardar eventos relevantes (partido creado, equipo, salida, score, MVP, invitado y stats vinculadas) conserva historial y permite construir el feed. Las frases de banner y easter eggs no deberían persistirse.

## Relaciones y ownership

- Un perfil pertenece a un usuario autenticado.
- Un grupo tiene muchos miembros, partidos, cargas y eventos.
- Un partido pertenece a un grupo y tiene participantes, score, MVP, stats de invitados y eventos.
- Una carga pertenece al usuario y al grupo; opcionalmente a un partido.
- Un invitado existe únicamente dentro de un partido.

RLS debería partir de `group_members`: lectura para miembros del grupo; escritura según actor y rol. El usuario modifica sus propias cargas. El creador/administrador del partido administra score, MVP e invitados. Nunca confiar solamente en filtros del frontend.

## Datos calculables en frontend

- Totales, promedios, rachas y rankings.
- Resultado Gané/Empaté/Perdí cuando existen score y equipo.
- Cupos por formato.
- Totales de goles/asistencias por partido.
- Advertencias de inconsistencia con el score.
- Estado y progreso del Mundial Personal.
- Mensajes del banner y easter eggs.
- Contadores de miembros/partidos, mientras el volumen sea pequeño.

## Migración futura desde `localStorage`

No existe migración automática. Las stats anteriores quedan disponibles en modo local. Un futuro botón **Importar mis stats locales** deberá:

1. Vincular el `User` local con el usuario de Supabase Auth y crear `profiles`.
2. Insertar grupos y mapear IDs locales a UUID.
3. Insertar `groupMembers`; completar membresías mock solo si existe una fuente confiable.
4. Insertar partidos sin sus arrays anidados.
5. Aplanar `participants` hacia `match_participants`.
6. Aplanar `guestStats` hacia `match_guest_stats`.
7. Insertar `stat_entries`, conservando `groupId`, `matchId` y timestamps.
8. Convertir `matchEvents` a `activity_feed`.
9. Mantener `cef-theme` como preferencia local o moverla después a un campo de perfil, sin bloquear la primera migración.

Antes de importar hay que validar IDs, referencias, códigos duplicados, una carga por usuario/partido y participantes repetidos. La importación debería ser idempotente.

## Secuencia recomendada

1. Validar Auth, trigger, RLS y RPCs de grupos con dos usuarios reales.
2. Validar `stat_entries` remotas y sus policies con dos usuarios.
3. Crear importador local explícito, con preview y confirmación.
4. Migrar partidos y participantes en una etapa separada.
5. Retirar mocks y `localStorage` solo cuando la paridad esté validada.
