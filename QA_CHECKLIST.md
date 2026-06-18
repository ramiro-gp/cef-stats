# QA checklist · stats, scopes y RLS

## Preparación

- [ ] Ejecutar `supabase/schema.sql` en una base nueva o confirmar que el schema actual está aplicado.
- [ ] Ejecutar `supabase/patches/001_fix_invite_code_generation.sql` si corresponde.
- [ ] Ejecutar `supabase/patches/002_add_stat_entries.sql`.
- [ ] Abrir dos sesiones separadas (por ejemplo, navegador normal e incógnito).
- [ ] Crear/iniciar sesión con **Usuario A** y **Usuario B**.
- [ ] Crear **Grupo compartido** con A y unir B por código.
- [ ] Crear **Grupo privado A** con A y no unir B.
- [ ] Crear **Grupo privado B** con B y no unir A.
- [ ] Anotar los UUID de ambos usuarios, los tres grupos y algunas filas de `stat_entries` para las pruebas negativas.

> El SQL Editor de Supabase suele operar con privilegios elevados y puede omitir RLS. Las pruebas negativas deben ejecutarse desde una sesión autenticada real de A/B (la app, REST con su JWT o el cliente Supabase en una página de prueba), nunca con service role.

## Matriz de datos inicial

Crear cargas fáciles de distinguir:

| Actor | Scope | Resultado | Goles | Asistencias |
| --- | --- | --- | ---: | ---: |
| A | Mi historial | Victoria | 11 | 1 |
| A | Grupo compartido | Empate | 22 | 2 |
| A | Grupo privado A | Derrota | 33 | 3 |
| B | Mi historial | Derrota | 44 | 4 |
| B | Grupo compartido | Victoria | 55 | 5 |
| B | Grupo privado B | Empate | 66 | 6 |

## Aislamiento de scopes

### Usuario A

- [ ] En **Mi historial** solo aparece 11/1; no aparecen 22/2, 33/3 ni cargas de B.
- [ ] En **Grupo compartido**, Perfil y Mundial Personal de A usan solo 22/2.
- [ ] En **Grupo compartido**, Rankings incluyen las cargas 22/2 de A y 55/5 de B.
- [ ] En **Grupo privado A** solo aparecen datos de ese grupo; Perfil y Mundial Personal usan 33/3.
- [ ] Cambiar rápidamente Mi historial → Grupo compartido → Grupo privado A varias veces: nunca deben parpadear datos del scope anterior.

### Usuario B

- [ ] En **Mi historial** solo aparece 44/4.
- [ ] En **Grupo compartido**, Perfil y Mundial Personal de B usan solo 55/5.
- [ ] Rankings del Grupo compartido coinciden para A y B.
- [ ] En **Grupo privado B** solo aparecen 66/6.
- [ ] Grupo privado A no aparece en el selector de B.

## CRUD y estados de UI

- [ ] Crear una stat: el botón muestra `Guardando...`, evita doble submit y confirma antes de navegar.
- [ ] Forzar un error de red al crear: la pantalla conserva los valores y muestra un error legible.
- [ ] Editar resultado/goles/asistencias: el modal permanece abierto mientras guarda y cierra solo al finalizar correctamente.
- [ ] Forzar un error al editar: el modal permanece abierto y muestra el error.
- [ ] Borrar requiere dos acciones (`Eliminar` y `Confirmar eliminación`).
- [ ] Forzar un error al borrar: la fila permanece visible y el modal informa el error.
- [ ] Recargar después de cada operación y confirmar persistencia en Supabase.
- [ ] Durante la carga inicial aparece `Cargando stats...` sin mostrar datos del scope anterior.

## RLS: lectura

Con la sesión de B:

- [ ] Consultar stats personales de A por `user_id`: devuelve cero filas.
- [ ] Consultar stats del Grupo privado A por `group_id`: devuelve cero filas.
- [ ] Consultar stats del Grupo compartido: devuelve filas de A y B.
- [ ] Consultar stats personales propias: devuelve solo las de B.

## RLS: escritura

Con la sesión de B y usando IDs reales de A:

- [ ] Intentar insertar `user_id=A`: falla por RLS.
- [ ] Intentar insertar una stat grupal en Grupo privado A: falla por RLS.
- [ ] Intentar insertar una stat personal con `group_id` no nulo: falla por constraint/RLS.
- [ ] Intentar insertar una stat grupal con `group_id=null`: falla por constraint/RLS.
- [ ] Intentar actualizar una stat de A: no modifica filas y devuelve error.
- [ ] Intentar borrar una stat de A: no modifica filas y devuelve error.
- [ ] B puede editar y borrar sus propias stats del Grupo compartido.

Repetir los intentos equivalentes con A contra datos privados de B.

## Rankings, Perfil y Mundial Personal

- [ ] Rankings personales muestran únicamente al usuario autenticado.
- [ ] Rankings grupales agregan cada jugador por separado, sin sumar stats ajenas al usuario actual.
- [ ] Un miembro con stats aparece aunque la carga de profiles/miembros falle; puede mostrarse con nombre de respaldo.
- [ ] Perfil cambia totales e historial al cambiar scope.
- [ ] Mundial Personal cambia de progreso al cambiar scope y usa únicamente las stats propias de ese scope.
- [ ] Stats de B nunca alteran el Mundial Personal de A, ni viceversa.

## Partidos online y cargas vinculadas

- [ ] A crea un partido en el grupo compartido y B lo ve desde otro dispositivo/sesiÃ³n.
- [ ] B abre el link/código, se une a un equipo y carga stats.
- [ ] A agrega un invitado, carga sus stats, score y MVP.
- [ ] En Perfil, el nombre del partido aparece como enlace con flecha.
- [ ] Hacer clic abre directamente el detalle de ese partido.
- [ ] Volver a Perfil y confirmar que editar/borrar la stat sigue funcionando.
- [ ] Confirmar `stat_entries.match_id` y que `local_match_id` queda nulo en vínculos nuevos.

## Modo local

- [ ] Confirmar por regresión técnica que el store local sigue compilando y conservando aislamiento; el gateway de producción ya no expone esta entrada.
- [ ] Crear, editar y borrar stats locales.
- [ ] Recargar y confirmar persistencia en `cef-stats-local-v1`.
- [ ] Cambiar entre grupos locales y confirmar aislamiento por `groupId`.
- [ ] Abrir Perfil, Rankings y Mundial Personal y comparar con el comportamiento previo.
- [ ] Crear/abrir un partido local, vincular una carga y navegar desde Perfil al partido.
- [ ] Confirmar que ninguna operación local crea filas en Supabase.

## Regresión final

- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] No hay errores en consola durante cambio de scope y CRUD.
- [ ] El modo local continúa compilando y no mezcla datos con partidos remotos.

## Smoke test en Vercel

- [ ] La home carga en la URL de producción sin errores de consola.
- [ ] Recargar `/` conserva el funcionamiento normal.
- [ ] Usuario A registra y confirma una cuenta desde producción.
- [ ] Usuario B registra y confirma otra cuenta desde producción.
- [ ] Logout/login mantiene profiles, grupos y stats remotas.
- [ ] A crea un grupo y B se une mediante el código.
- [ ] Ambos cargan stats distintas en el grupo y Rankings muestra a ambos.
- [ ] Las stats de Mi historial no aparecen en el grupo compartido ni al revés.
- [ ] Un grupo privado de A no aparece ni acepta escrituras de B.
- [ ] El modo local crea y conserva stats solo en el navegador.
- [ ] Partidos, participantes, invitados, score, MVP y stats vinculadas persisten tras logout/login.
- [ ] Supabase Auth tiene Site URL y Redirect URLs apuntando al dominio desplegado.
