# Deploy de CEF Stats en Vercel

Esta guía cubre el deploy actual: frontend React/Vite en Vercel; Auth, profiles, grupos, membresías y stats en Supabase; partidos y datos asociados en `localStorage`.

## 1. Verificaciones locales

```bash
pnpm install
pnpm build
pnpm lint
```

La app navega por estado React y hoy solo utiliza la URL `/`. No usa React Router ni rutas client-side reales, por lo que no necesita rewrites de SPA para recargar. Si más adelante se agregan URLs como `/partidos/:id`, habrá que configurar un fallback hacia `/index.html` en Vercel.

Variables locales esperadas en `.env.local`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

`.env.local` está ignorado. `.env.example` debe seguir sin valores reales. Las variables `VITE_*` quedan incluidas en el JavaScript compilado: la URL y anon key están diseñadas para ser públicas y deben protegerse con RLS. Nunca usar una service-role key en Vite.

## 2. Preparar Supabase

En un proyecto nuevo, ejecutar desde **SQL Editor**, en este orden:

1. `supabase/schema.sql`
2. `supabase/patches/002_add_stat_entries.sql`

En una base existente, ejecutar los patches idempotentes:

1. `supabase/patches/001_fix_invite_code_generation.sql`
2. `supabase/patches/002_add_stat_entries.sql`

El patch 001 actualiza la RPC de creación de grupos. El patch 002 crea `stat_entries`, constraints, índices, trigger y policies RLS.

Confirmar en Supabase:

- Email/password habilitado en **Authentication → Providers**.
- Existen `profiles`, `groups`, `group_members` y `stat_entries`.
- RLS está habilitado en las cuatro tablas.
- Existen las RPC `create_group_with_membership`, `join_group_by_invite` e `is_handle_available`.

## 3. Configurar URLs de Auth

Después del primer deploy, abrir **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://TU-PROYECTO.vercel.app`
- **Redirect URLs:** agregar `https://TU-PROYECTO.vercel.app/**`
- Para desarrollo, conservar `http://localhost:5173/**` y/o `http://127.0.0.1:5173/**`.
- Si se prueban Preview Deployments, agregar únicamente el patrón de previews de la cuenta/equipo de Vercel que se vaya a usar.

El registro actual no define `emailRedirectTo`; cuando Supabase exige confirmación por email, utiliza la Site URL configurada. Una URL incorrecta puede confirmar la cuenta pero devolver al usuario al host equivocado.

Referencia oficial: [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Subir a GitHub

Esta copia del proyecto no incluye actualmente un directorio `.git`. Desde la raíz del proyecto:

```bash
git init
git add .
git status --short
```

Antes del commit, comprobar que `.env.local`, `dist`, `node_modules` y `.vercel` no aparecen. `.env.example` sí debe aparecer.

```bash
git commit -m "Prepare CEF Stats for Vercel deploy"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

Si el repositorio ya existe, omitir `git init` y revisar con:

```bash
git ls-files .env.local
git check-ignore -v .env.local
```

El primer comando no debe devolver nada; el segundo debe indicar una regla de `.gitignore`.

## 5. Crear el proyecto en Vercel

1. En Vercel, elegir **Add New → Project**.
2. Importar el repositorio de GitHub.
3. Confirmar framework **Vite**.
4. Si CEF Stats está en una subcarpeta, seleccionar esa carpeta como **Root Directory**.
5. La configuración versionada en `vercel.json` usa:
   - Install: `pnpm install --frozen-lockfile`
   - Build: `pnpm build`
   - Output: `dist`
6. En **Environment Variables**, agregar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Cargar ambas para **Production** y, si se usarán previews conectadas a esa base, también para **Preview**.
8. Ejecutar **Deploy**.

Las variables Vite se resuelven durante el build. Después de modificarlas en Vercel hay que redeployar; un cambio no altera bundles ya construidos.

Referencias oficiales: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) y [Vercel Environment Variables](https://vercel.com/docs/environment-variables).

## 6. Smoke test de producción

### Auth

1. Abrir la URL de producción en una ventana privada.
2. Registrar Usuario A con email, contraseña, nombre y handle únicos.
3. Si email confirmation está habilitado, confirmar y volver a la URL de producción.
4. Cerrar sesión e iniciar sesión nuevamente.
5. Repetir con Usuario B en otra sesión privada.

### Grupos

1. A crea un grupo y copia el código.
2. B se une con ese código.
3. Ambos ven el grupo y sus dos miembros.
4. Crear además un grupo privado de A y comprobar que B no puede verlo.

### Stats

1. A carga una stat en **Mi historial**.
2. Verificar en Supabase: `scope_type='personal'`, `group_id is null`, `user_id=A`.
3. A y B cargan stats distintas en el grupo compartido.
4. Verificar: `scope_type='group'` y `group_id` del grupo.
5. Confirmar que Rankings usa solo el grupo activo.
6. Cambiar entre Mi historial y grupo: Perfil, Rankings y Mundial Personal no deben mezclar datos.
7. Editar y borrar una stat propia.
8. Confirmar mediante la checklist RLS que ningún usuario puede modificar stats ajenas ni escribir en grupos donde no es miembro.

### Persistencia y modo local

1. Cerrar sesión y volver a entrar: grupos y stats remotas deben seguir disponibles.
2. Elegir **Seguir en modo local**, crear una stat y recargar.
3. Confirmar persistencia en ese navegador y ausencia de una nueva fila remota.

## 7. Limitaciones actuales

- Partidos, participantes, invitados, scores, eventos y referencias visuales de partidos siguen en `localStorage`.
- Cambiar de navegador o dispositivo no sincroniza partidos.
- Las stats vinculadas conservan `local_match_id`, pero el detalle solo puede abrirse donde exista ese partido local.
- Feed y banner se calculan en frontend.
- No existe importación automática de stats locales hacia una cuenta.

Después de estabilizar el deploy, el próximo paso recomendado es migrar partidos en una etapa separada, con schema, RLS y migración explícita.
