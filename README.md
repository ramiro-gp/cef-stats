# CEF Stats

Prototipo funcional mobile-first para cargar estadísticas post partido, comparar rankings y jugar un Mundial Personal. En modo cuenta, Auth, perfiles, grupos, stats y partidos viven en Supabase. El modo local conserva su implementación en `localStorage` por compatibilidad.

La versión publicada se toma de `package.json` y se muestra de forma discreta en el sidebar de escritorio y al pie del contenido en mobile.

Documentación técnica: [`PROJECT_STATUS.md`](./PROJECT_STATUS.md). Deploy: [`DEPLOY.md`](./DEPLOY.md). Plan de migración: [`SUPABASE_PLAN.md`](./SUPABASE_PLAN.md). QA manual de scopes y RLS: [`QA_CHECKLIST.md`](./QA_CHECKLIST.md).

## Estado de producción / staging

El proyecto está preparado para deploy en Vercel mediante `vercel.json`. En modo cuenta, Supabase almacena Auth, `profiles`, `groups`, `group_members`, `stat_entries`, `matches`, `match_participants` y `match_guests`. El modo local conserva todo su dominio en `localStorage`.

Antes del primer deploy hay que ejecutar el schema/patches, configurar las dos variables `VITE_SUPABASE_*` en Vercel y registrar la URL pública en Supabase Auth. La guía exacta y el smoke test están en `DEPLOY.md`. Después de validar producción con dos usuarios, el próximo paso recomendado es migrar partidos por separado.

## Ejecutar

```bash
pnpm install
pnpm dev
```

Validación de producción:

```bash
pnpm build
pnpm lint
```

## Supabase opcional: Auth, profiles y grupos

Para probar cuentas reales:

1. Crear un proyecto en Supabase.
2. Para una base nueva, abrir **SQL Editor**, copiar `supabase/schema.sql` y ejecutarlo.
3. Copiar `.env.example` como `.env.local`.
4. Completar las credenciales públicas del proyecto:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

5. Reiniciar `pnpm dev` después de cambiar variables.
6. En la pantalla inicial elegir **Entrar con cuenta** para registrarse o iniciar sesión.

Si la confirmación de email está activa, el registro muestra que hay que confirmar el correo antes de entrar. El trigger del schema crea el profile desde la metadata del alta. Nunca guardar la service-role key en variables `VITE_*`.

Para probar logout: Perfil → **Cerrar sesión**. La entrada visible prioriza siempre una cuenta real.

### Patch requerido en bases existentes

Si la base ya estaba creada y al crear un grupo aparece `function gen_random_bytes(integer) does not exist`, ejecutar únicamente:

```text
supabase/patches/001_fix_invite_code_generation.sql
```

El patch es idempotente: no borra tablas ni datos. Reemplaza `create_group_with_membership` para usar `extensions.gen_random_bytes(...)`, que es donde Supabase instala `pgcrypto` normalmente.

Para habilitar stats remotas, ejecutar también en **SQL Editor**:

```text
supabase/patches/002_add_stat_entries.sql
```

Este patch idempotente crea `stat_entries`, índices, constraints, trigger de `updated_at` y policies RLS para stats personales y grupales.

Para habilitar partidos online, ejecutar también:

```text
supabase/patches/003_add_matches.sql
```

El patch 003 crea partidos, participantes e invitados, agrega `stat_entries.match_id` y configura RLS/RPCs para crear, buscar y unirse mediante código.

## Mi historial

Toda cuenta autenticada tiene un scope virtual `personal:{userId}` llamado **Mi historial**. No crea una fila en `groups` y no requiere membresía. Es el scope inicial cuando no hay una selección remota válida.

- Permite usar Home, carga rápida, Perfil, rankings personales y Mundial Personal sin crear grupo.
- En modo cuenta sus stats se guardan en Supabase. Los partidos online pertenecen a grupos reales.
- El selector siempre muestra Mi historial primero y luego los grupos compartidos.
- Los grupos son opcionales y sirven para comparar números y organizar partidos con amigos.

## Probar el flujo

1. Entrar al demo y abrir **Cargar**.
2. Comprobar que no se puede guardar sin elegir resultado.
3. Elegir resultado, sumar goles/asistencias y guardar.
4. Revisar los nuevos valores en Home, Rankings y Perfil.
5. Recargar el navegador: la carga debe seguir en el historial.
6. Para probar el Mundial Personal, completar siempre tres partidos de grupos. Se clasifica con 5 puntos o más.
7. En Perfil → Ajustes, usar **Resetear datos locales/mock** y confirmar el borrado.

## Perfil, cargas y ajustes

- **Editar perfil:** Perfil → Editar perfil. Cambiar nombre, apodo o avatar y guardar. El cambio se refleja en Home, Rankings, feed y banner.
- **Editar @usuario:** en el mismo editor, escribir el handle sin espacios. Se guarda en minúsculas, siempre se muestra con `@` y acepta letras, números, punto y guion bajo entre 3 y 24 caracteres.
- **Editar carga:** Perfil → Últimas cargas → Editar. Cambiar resultado, goles o asistencias con botones táctiles y guardar.
- **Borrar carga:** abrir su editor y tocar dos veces **Eliminar esta carga / Confirmar eliminación**. Todas las métricas se recalculan.
- **Cambiar tema:** Perfil → Ajustes → Oscuro, Claro o Sistema. La elección persiste al recargar.
- **Mensajes funny:** aparecen con baja frecuencia en el banner y permanecen siempre habilitados.
- **Reset local:** Perfil → Ajustes → Resetear; se requiere una segunda confirmación.

## Gestión de grupos híbridos

- Con una cuenta Supabase, **Mis grupos** lee `groups`, `group_members` y los profiles relacionados.
- **Crear grupo** usa `create_group_with_membership`: genera un código único y agrega al creador como `owner` en una transacción.
- **Unirme con código** usa `join_group_by_invite`, evita duplicados y activa el grupo real.
- El selector del header persiste localmente el UUID del último grupo Supabase elegido.
- **Editar** actualiza el nombre remoto cuando RLS lo permite.
- En modo local, crear, editar, unirse y cambiar grupo conservan el flujo mock de `localStorage`.
- El botón de copiar genera un link real del origen actual con `?joinGroup=CODIGO`. Si el visitante no inició sesión, la intención se conserva hasta completar login/registro.
- Cada carga conserva su scope. En modo cuenta, las nuevas stats se guardan en Supabase como `personal` sin `group_id` o como `group` con el UUID activo.

### Probar grupos reales

1. Entrar con el usuario A y comprobar que Home abre en **Mi historial**, incluso sin grupos.
2. Cargar una stat y verificar en Supabase `scope_type='personal'`, `group_id=null`, y que Perfil/Mundial Personal usan ese historial.
3. Crear un grupo y verificar una fila en `groups` y otra con role `owner` en `group_members`.
4. Copiar el código y editar el nombre.
5. Cerrar sesión, entrar con el usuario B y unirse con el código.
6. Verificar la segunda membresía y ambos profiles en la pantalla de miembros.
7. Cambiar entre Mi historial y el grupo desde el header.
8. Cerrar sesión y volver a entrar para comprobar que grupos y stats remotas persisten.

Las stats que ya existían en `cef-stats-local-v1` no se importan automáticamente a una cuenta. Permanecen disponibles en modo local. Una futura etapa puede agregar **Importar mis stats locales** con preview y confirmación.

## Partidos online y modo local

Con una cuenta, los partidos se sincronizan mediante Supabase. Los miembros del grupo anfitrión los ven en su listado y cualquier usuario autenticado con el código/link puede encontrarlos y unirse. El modo local interno conserva el flujo anterior en `localStorage`.

1. Abrir **Partidos** desde el bottom nav o usar **+ Partido** en Home.
2. Crear un partido con nombre, fecha y formato opcional. Se genera un código y link de invitación mock.
3. Entrar al detalle y elegir **Unirme al claro** o **Unirme al oscuro**. Cambiar de botón mueve al usuario; **Salir del partido** lo elimina de ambos.
4. Cargar el resultado con botones `−` y `+`. Se puede editar guardándolo nuevamente.
5. Pulsar **Cargar mis números para este partido**. Si hay equipo y resultado, Gané/Empaté/Perdí se calcula automáticamente; en otro caso se elige manualmente.
6. Volver a abrir el botón para editar la carga existente. El store evita una segunda carga del mismo usuario para ese partido.
7. Seleccionar un MVP entre los participantes y revisar el resumen, totales por equipo y advertencias de goles faltantes.
8. Cambiar el grupo activo: la lista de partidos, sus eventos y stats quedan aislados por `groupId`.
9. Volver a Home para comprobar eventos de creación, equipo, resultado, MVP y stats en feed/banner.

## Invitados, vinculación y cancha

- **Agregar invitado:** abrir un partido y usar `+ Agregar invitado` dentro del equipo claro u oscuro. Nombre obligatorio, avatar opcional.
- **Editar o quitar invitado:** tocar su avatar en la lista o en la cancha y usar las acciones del popover.
- **Stats guest:** desde ese mismo popover, cargar goles y asistencias. Se suman al resumen y a la validación del score, pero nunca a rankings, perfil, rachas o Mundial Personal.
- **Vincular una carga existente:** Perfil → carga sin partido → Vincular. Buscar el código, elegir equipo y confirmar si el resultado oficial cambia Gané/Empaté/Perdí.
- **Crear una carga vinculada:** Cargar → Vincular a partido con código. La asociación es opcional y se impide una segunda carga del mismo usuario/partido.
- **Cancha 2.5D:** en el detalle del partido, tocar cualquier avatar para ver equipo, stats, MVP y condición de invitado.
- Los partidos locales previos no se importan automáticamente a Supabase.

## Probar los últimos ajustes

- **Cambiar grupo:** tocar el nombre del grupo en el header y elegir otro. Home, Rankings, Perfil, feed y ticker cambian de contexto; al recargar, el grupo elegido se conserva.
- **Movimientos recientes:** cargar varios partidos. Home conserva cargas e hitos como eventos separados y muestra los 10 últimos dentro de una card con scroll.
- **Ticker:** permanecer en Home unos segundos. El letrero cambia automáticamente cada 4,5 segundos y prioriza Mundial, rachas y otros hitos.
- **Ganar un Mundial:** cargar `Gané`, `Gané`, `Perdí` para sumar 6 puntos y luego cuatro victorias (octavos, cuartos, semifinal y final).
- **Ganar un segundo Mundial:** repetir la misma secuencia de siete cargas. El contador debe llegar a 2 y ambas celebraciones se conservan mientras estén entre los movimientos recientes.
- **No clasificar:** terminar los tres partidos con 4 puntos o menos; el ciclo vuelve a comenzar en grupos.
- **Perder en eliminatorias:** clasificar y luego cargar una derrota; el Mundial vuelve a fase de grupos sin borrar títulos previos.
- **Feed y fades:** con más de 6 movimientos, desplazar la card. La barra queda oculta; aparece un degradado abajo cuando hay contenido pendiente y arriba después de scrollear.
- **Banner por grupo:** cambiar de grupo desde el header. Las frases se recalculan con el estado actual de sus jugadores y no reutilizan hitos históricos del feed.

## Escenarios del Mundial Personal por puntos

| Escenario | Cargas | Resultado esperado |
| --- | --- | --- |
| A | Gané, Gané, Gané | Clasifica a octavos con 9 puntos |
| B | Gané, Gané, Perdí | Clasifica a octavos con 6 puntos |
| C | Gané, Empaté, Empaté | Clasifica a octavos con 5 puntos |
| D | Gané, Empaté, Perdí | Queda eliminado con 4 puntos; comienza ciclo 2 |
| E | Caso B + Gané | Supera octavos; queda en cuartos |
| F | Caso B + Empaté | Permanece en octavos |
| G | Caso B + Perdí | Eliminado en octavos; comienza ciclo 2 |
| H | Caso B + cuatro victorias | Gana 1 Mundial; comienza ciclo 2 |
| I | Caso H dos veces | Gana 2 Mundiales; comienza ciclo 3 |

En cualquier eliminatoria, ganar hace avanzar, empatar conserva exactamente la misma instancia y perder reinicia el ciclo. Solo una victoria en la final suma un Mundial.

## Estructura

- `src/types`: modelos de dominio y estado central (`AppState`, usuarios, grupos, membresías, stats, partidos, banner, Mundial y feed).
- `src/data`: usuario, grupo y jugadores mock iniciales.
- `src/data/appRepository.ts`: contrato de persistencia actual y punto de reemplazo futuro por Supabase.
- `src/data/localStorageAdapter.ts`: único acceso directo a `localStorage`.
- `src/data/authRepository.ts`: operaciones de sesión y profile de Supabase.
- `src/data/supabaseRepository.ts`: grupos, miembros, stats y preferencia local del grupo remoto activo.
- `src/data/supabaseMatchRepository.ts`: partidos, participantes, invitados, score y MVP remotos.
- `src/lib/supabaseClient.ts`: cliente opcional y detección segura de variables faltantes.
- `src/hooks/useAuth.ts`: sesión, profile y actualización reactiva de Auth.
- `src/hooks/useSupabaseGroups.ts`: carga, selección y mutaciones de grupos reales.
- `src/hooks/useSupabaseMatches.ts`: partidos remotos por grupo y lookup por invitación.
- `src/utils/scopes.ts`: creación y detección del scope virtual Mi historial.
- `src/data/messages.ts`: mensajes picantes de baja frecuencia centralizados.
- `src/store`: estado React y mutaciones de dominio.
- `src/hooks/useTheme.ts`: tema oscuro, claro o del sistema mediante el repositorio.
- `src/utils`: rankings, totales, feed, formato y reglas del Mundial Personal.
- `src/utils/banner.ts`: frases actuales y distribuidas entre jugadores para el banner del grupo.
- `src/components/ActivityFeedPanel.tsx`: feed histórico con scroll oculto y fades contextuales.
- `src/components/ProfileEditor.tsx`: edición local de nombre, apodo y avatar.
- `src/components/StatEntryEditor.tsx`: edición y borrado confirmado de cargas.
- `src/components/SettingsSheet.tsx`: tema, mensajes funny, versión y reset local.
- `src/pages/MatchesPage.tsx`: lista, detalle, equipos, score, resumen y MVP manual.
- `src/components/MatchCreateSheet.tsx`: creación híbrida de partidos.
- `src/components/MatchStatsSheet.tsx`: carga o edición única de stats vinculadas.
- `src/utils/matches.ts`: cálculo puro del resultado según equipo y totales cargados.
- `src/components/MatchPitch.tsx`: cancha 2.5D responsive sin librerías externas.
- `src/components/ParticipantPopover.tsx`: ficha y edición rápida de stats de invitados.
- `src/components/GuestEditorSheet.tsx`: creación y edición local de invitados.
- `src/components/LinkEntrySheet.tsx`: vinculación segura de cargas existentes por código.
- `src/components/MatchCodePickerSheet.tsx`: vinculación opcional desde carga rápida.
- `src/components/GroupSelector.tsx`: selector persistente de grupo activo del header.
- `src/components/GroupTicker.tsx`: banner rotativo y compacto del Home.
- `src/pages`: pantallas conectadas al estado local.
- `src/components`: shell, navegación, iconos y piezas compartidas.

La clave principal del modo local es `cef-stats-local-v1`; el tema usa `cef-theme`. La UI no accede directamente a ninguna de esas claves.

En modo cuenta, Auth, profiles, grupos, miembros, stats, partidos, participantes, invitados, score y MVP usan Supabase. El scope activo y algunas preferencias siguen locales; feed, banner, rankings y Mundial Personal se calculan en frontend. En modo local, todo el dominio deportivo continúa en `localStorage`. Los partidos locales previos no se importan automáticamente.
