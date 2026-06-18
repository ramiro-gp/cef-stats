import { useState } from 'react'
import { CheckIcon, CopyIcon, PlusCircleIcon, UsersIcon } from '../components/icons'
import { PageTitle } from '../components/PageTitle'
import type { Group, GroupMemberView } from '../types'
import { createGroupInviteLink } from '../utils/groups'

interface Props {
  groups: Group[]
  currentGroup: Group | null
  members?: GroupMemberView[]
  currentUserId?: string
  remoteMode?: boolean
  loading?: boolean
  membersLoading?: boolean
  loadError?: string
  onSelectGroup: (group: Group) => void
  onCreateGroup: (name: string) => Group | Promise<Group>
  onJoinGroup: (code: string) => Group | Promise<Group>
  onUpdateGroup: (id: string, values: Partial<Pick<Group, 'name'>>) => void | Promise<void>
  onExitAccount?: () => void
}

export function GroupsPage({ groups, currentGroup, members = [], currentUserId, remoteMode = false, loading = false, membersLoading = false, loadError = '', onSelectGroup, onCreateGroup, onJoinGroup, onUpdateGroup, onExitAccount }: Props) {
  const [mode, setMode] = useState<'list' | 'create' | 'join' | 'edit'>('list')
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState<Group | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const currentMembership = members.find(member => member.userId === currentUserId)
  const canEdit = !remoteMode || currentMembership?.role === 'owner' || currentMembership?.role === 'admin'

  const open = (nextMode: typeof mode, group?: Group) => { setMode(nextMode); setEditing(group ?? null); setValue(group?.name ?? ''); setError('') }
  const copy = (group: Group) => {
    void navigator.clipboard?.writeText(createGroupInviteLink(group.code, window.location.origin))
    setCopied(group.id)
    window.setTimeout(() => setCopied(null), 1500)
  }
  const submit = async () => {
    if (!value.trim()) { setError(mode === 'join' ? 'Ingresá un código.' : 'Ingresá un nombre.'); return }
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'create') await onCreateGroup(value)
      if (mode === 'join') await onJoinGroup(value)
      if (mode === 'edit' && editing) await onUpdateGroup(editing.id, { name: value.trim() })
      open('list')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos completar la acción.')
    } finally {
      setSubmitting(false)
    }
  }

  return <>
    <PageTitle eyebrow={remoteMode ? 'Comunidad · Supabase' : 'Comunidad · Local'} title={remoteMode ? 'Mis grupos compartidos' : 'Mis grupos'} subtitle={remoteMode ? 'Los grupos son opcionales: Mi historial siempre está disponible.' : 'Cada grupo conserva sus propias cargas, movimientos y rankings.'} />
    {remoteMode && <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4 text-sm"><strong className="text-emerald-500">Mi historial</strong><span className="text-slate-500 dark:text-slate-300"> es tu espacio personal. Creá un grupo cuando quieras comparar tus números con amigos.</span></div>}
    {loadError && <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">{loadError}</div>}
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <section className="space-y-3">
          {loading && <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">Cargando grupos...</div>}
          {!loading && groups.length === 0 && <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.05] p-8 text-center"><UsersIcon className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-3 font-extrabold">Todavía no tenés grupos</p><p className="mt-1 text-sm leading-6 text-slate-400">{remoteMode ? 'Podés usar Mi historial o crear un grupo para compararte con amigos.' : 'Creá uno o unite con código.'}</p></div>}
          {groups.map(group => {
            const active = group.id === currentGroup?.id
            return <div key={group.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${active ? 'border-emerald-500/50 bg-emerald-500/[0.07]' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]'}`}>
              <button onClick={() => onSelectGroup(group)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xl dark:bg-white/10">{group.emoji}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate font-bold">{group.name}</span>{active && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink">Activo</span>}</div><div className="mt-1 text-xs text-slate-400">{group.memberCount} jugadores · Código {group.code}</div></div>
              </button>
              <button onClick={() => copy(group)} aria-label={`Copiar invitación de ${group.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-white/10">{copied === group.id ? <CheckIcon className="h-4 w-4 text-emerald-500" /> : <CopyIcon className="h-4 w-4" />}</button>
              {canEdit && <button onClick={() => open('edit', group)} className="min-h-10 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-white/10">Editar</button>}
            </div>
          })}
        </section>

        {currentGroup && <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"><div className="flex items-center justify-between"><h3 className="font-extrabold">Miembros</h3><span className="text-xs text-slate-400">{currentGroup.memberCount}</span></div>{membersLoading ? <p className="mt-4 text-sm text-slate-400">Cargando miembros...</p> : <div className="mt-4 grid gap-2 sm:grid-cols-2">{members.map(member => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-slate-100 p-3 dark:bg-white/5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-xs font-black text-ink">{member.avatar || member.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{member.name}</span><span className="block truncate text-xs text-slate-400">@{member.handle}</span></span><span className="text-[9px] font-bold uppercase text-emerald-500">{member.role}</span></div>)}{members.length === 0 && <p className="text-sm text-slate-400">No hay miembros para mostrar.</p>}</div>}</section>}
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
        {mode === 'list' ? <>
          <h3 className="font-extrabold">Gestionar grupos</h3><p className="mt-1 text-sm leading-6 text-slate-400">{remoteMode ? 'Membresías guardadas en Supabase.' : 'Todo queda guardado localmente.'}</p>
          <div className="mt-5 space-y-2.5"><button onClick={() => open('create')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-bold text-ink"><PlusCircleIcon className="h-5 w-5"/> Crear grupo {remoteMode ? '' : 'local'}</button><button onClick={() => open('join')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 font-bold dark:border-white/10"><UsersIcon className="h-5 w-5" /> Unirme con código</button></div>
          {currentGroup && <div className="mt-6 rounded-xl bg-slate-100 p-3 dark:bg-white/5"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grupo activo</p><p className="mt-1 font-bold">{currentGroup.name}</p><p className="mt-1 font-mono text-xs text-emerald-500">{currentGroup.code}</p></div>}
          {remoteMode && onExitAccount && <button onClick={onExitAccount} className="mt-5 min-h-11 w-full text-sm font-bold text-slate-400 hover:text-rose-500">Cerrar sesión</button>}
        </> : <>
          <button onClick={() => open('list')} disabled={submitting} className="mb-4 min-h-10 text-xs font-bold text-emerald-500 disabled:opacity-50">← Volver</button>
          <h3 className="font-extrabold">{mode === 'create' ? 'Nuevo grupo' : mode === 'join' ? 'Unirme a un grupo' : 'Editar grupo'}</h3>
          <p className="mt-1 text-sm text-slate-400">{mode === 'join' ? 'Pegá el código o link de invitación.' : 'Elegí un nombre corto y reconocible.'}</p>
          <label className="mt-4 block text-xs font-bold text-slate-400">{mode === 'join' ? 'Código' : 'Nombre del grupo'}</label>
          <input autoFocus value={value} disabled={submitting} onChange={event => setValue(event.target.value)} placeholder={mode === 'join' ? 'CEF-AB12CD34 o https://...' : 'Fútbol del martes'} className={`mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 disabled:opacity-50 dark:border-white/10 ${mode === 'join' ? 'font-mono tracking-wide' : ''}`} />
          {error && <p className="mt-2 text-xs font-bold text-rose-500">{error}</p>}
          <button onClick={submit} disabled={submitting} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-500 font-bold text-ink disabled:opacity-50">{submitting ? mode === 'create' ? 'Creando grupo...' : mode === 'join' ? 'Uniéndome...' : 'Guardando...' : mode === 'create' ? 'Crear y activar' : mode === 'join' ? 'Unirme y activar' : 'Guardar nombre'}</button>
        </>}
      </aside>
    </div>
  </>
}
