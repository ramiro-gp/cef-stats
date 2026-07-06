import { useState } from 'react'
import { CheckIcon, CopyIcon, PlusCircleIcon, UsersIcon } from '../components/icons'
import { PageTitle } from '../components/PageTitle'
import type { Group, GroupMemberView, StatFootballFormat, StatMatchType } from '../types'
import { createGroupInviteLink } from '../utils/groups'
import { defaultGroupEmoji, groupEmojiOptions } from '../data/groupEmojiOptions'
import { UserAvatar } from '../components/UserAvatar'
import { formatInviteCodeInput } from '../utils/inviteCodes'
import type { ScheduleUndoableAction } from '../utils/criticalActions'

const matchTypeOptions: { value: StatMatchType; label: string }[] = [{ value: 'friendly', label: 'Amistoso' }, { value: 'tournament', label: 'Torneo' }]
const footballFormatOptions: StatFootballFormat[] = ['F5', 'F6', 'F7', 'F8', 'F11']

interface Props {
  groups: Group[]
  currentGroup: Group | null
  members?: GroupMemberView[]
  memberships?: GroupMemberView[]
  currentUserId?: string
  remoteMode?: boolean
  loading?: boolean
  membersLoading?: boolean
  loadError?: string
  onSelectGroup: (group: Group) => void
  onCreateGroup: (name: string, emoji?: string) => Group | Promise<Group>
  onJoinGroup: (code: string) => Group | Promise<Group>
  onUpdateGroup: (id: string, values: Partial<Pick<Group, 'name' | 'emoji' | 'defaultMatchType' | 'defaultFootballFormat'>>) => void | Promise<void>
  onKickMember?: (groupId: string, userId: string) => void | Promise<void>
  onDeleteGroup?: (groupId: string) => void | Promise<void>
  onUndoableAction?: ScheduleUndoableAction
}

export function GroupsPage({ groups, currentGroup, members = [], memberships = [], currentUserId, remoteMode = false, loading = false, membersLoading = false, loadError = '', onSelectGroup, onCreateGroup, onJoinGroup, onUpdateGroup, onKickMember, onDeleteGroup, onUndoableAction }: Props) {
  const [mode, setMode] = useState<'list' | 'create' | 'join' | 'edit'>('list')
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState<Group | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [emoji, setEmoji] = useState(defaultGroupEmoji)
  const [defaultMatchType, setDefaultMatchType] = useState<StatMatchType>('friendly')
  const [defaultFootballFormat, setDefaultFootballFormat] = useState<StatFootballFormat>('F5')
  const [confirmKick, setConfirmKick] = useState<string | null>(null)
  const [kicking, setKicking] = useState<string | null>(null)
  const [deleteGroupName, setDeleteGroupName] = useState('')
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [memberFeedback, setMemberFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const currentMembership = currentGroup ? memberships.find(member => member.groupId === currentGroup.id && member.userId === currentUserId) : undefined
  const canEditGroup = (groupId: string) => !remoteMode || memberships.some(member => member.groupId === groupId && member.userId === currentUserId && member.role === 'owner')
  const canManageMembers = Boolean(onKickMember && currentGroup && currentMembership && ['owner', 'admin'].includes(currentMembership.role))
  const canDeleteCurrentGroup = Boolean(onDeleteGroup && currentGroup && currentMembership && ['owner', 'admin'].includes(currentMembership.role))
  const canKickMember = (member: GroupMemberView) => {
    if (!canManageMembers || !currentUserId || member.userId === currentUserId) return false
    if (currentMembership?.role === 'admin') return member.role === 'member'
    return true
  }

  const open = (nextMode: typeof mode, group?: Group) => { setMode(nextMode); setEditing(group ?? null); setValue(group?.name ?? ''); setEmoji(group?.emoji || defaultGroupEmoji); setDefaultMatchType(group?.defaultMatchType ?? 'friendly'); setDefaultFootballFormat(group?.defaultFootballFormat ?? 'F5'); setDeleteGroupName(''); setError('') }
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
      if (mode === 'create') {
        const created = await onCreateGroup(value, emoji)
        await onUpdateGroup(created.id, { name: created.name, emoji: created.emoji, defaultMatchType, defaultFootballFormat })
      }
      if (mode === 'join') await onJoinGroup(value)
      if (mode === 'edit' && editing) await onUpdateGroup(editing.id, { name: value.trim(), emoji, defaultMatchType, defaultFootballFormat })
      open('list')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos completar la acción.')
    } finally {
      setSubmitting(false)
    }
  }
  const kickMember = async (member: GroupMemberView) => {
    if (!currentGroup || !onKickMember || !canKickMember(member)) return
    if (confirmKick !== member.id) { setConfirmKick(member.id); return }
    setConfirmKick(null)
    if (onUndoableAction) {
      onUndoableAction({ text: `${member.name} será echado del grupo.`, successText: `${member.name} ya no pertenece al grupo.`, errorText: 'No pudimos echar a este integrante.', commit: () => onKickMember(currentGroup.id, member.userId) })
      return
    }
    setKicking(member.id)
    setMemberFeedback(null)
    try { await onKickMember(currentGroup.id, member.userId) }
    catch (reason) { setMemberFeedback({ tone: 'error', text: reason instanceof Error ? reason.message : 'No pudimos echar a este integrante.' }) }
    finally { setKicking(null) }
  }
  const deleteCurrentGroup = async () => {
    if (!currentGroup || !onDeleteGroup || !canDeleteCurrentGroup) return
    if (deleteGroupName !== currentGroup.name) { setMemberFeedback({ tone: 'error', text: 'Escribí el nombre exacto del grupo para eliminarlo.' }); return }
    setDeleteGroupName('')
    if (onUndoableAction) {
      onUndoableAction({ text: `El grupo ${currentGroup.name} será eliminado.`, successText: `El grupo ${currentGroup.name} fue eliminado.`, errorText: 'No pudimos eliminar el grupo.', commit: () => onDeleteGroup(currentGroup.id) })
      return
    }
    setDeletingGroup(true)
    setMemberFeedback(null)
    try { await onDeleteGroup(currentGroup.id) }
    catch (reason) { setMemberFeedback({ tone: 'error', text: reason instanceof Error ? reason.message : 'No pudimos eliminar el grupo.' }) }
    finally { setDeletingGroup(false) }
  }

  return <>
    <PageTitle eyebrow={remoteMode ? 'Comunidad · Supabase' : 'Comunidad · Local'} title={remoteMode ? 'Mis grupos compartidos' : 'Mis grupos'} subtitle={remoteMode ? 'Administrá únicamente tus grupos reales. El historial personal vive en Perfil.' : 'Cada grupo conserva sus propias cargas, movimientos y rankings.'} />
    {remoteMode && <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4 text-sm"><strong className="text-emerald-500">TODOS</strong><span className="text-slate-500 dark:text-slate-300"> es sólo una vista combinada. No se edita ni admite invitaciones.</span></div>}
    {loadError && <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">{loadError}</div>}
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <section data-tour="groups-list" className="space-y-3">
          {loading && <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">Cargando grupos...</div>}
          {!loading && groups.length === 0 && <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.05] p-8 text-center"><UsersIcon className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-3 font-extrabold">Todavía no tenés grupos</p><p className="mt-1 text-sm leading-6 text-slate-400">{remoteMode ? 'Tu historial personal sigue disponible en Perfil. Creá un grupo para compartir y comparar.' : 'Creá uno o unite con código.'}</p></div>}
          {groups.map(group => {
            const active = group.id === currentGroup?.id
            return <div key={group.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${active ? 'border-emerald-500/50 bg-emerald-500/[0.07]' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]'}`}>
              <button onClick={() => onSelectGroup(group)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-2xl dark:bg-white/10">{group.emoji || defaultGroupEmoji}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate font-bold">{group.name}</span>{active && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink">Activo</span>}</div><div className="mt-1 text-xs text-slate-400">{group.memberCount} jugadores · Código {group.code}</div></div>
              </button>
              <button onClick={() => copy(group)} aria-label={`Copiar invitación de ${group.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-white/10">{copied === group.id ? <CheckIcon className="h-4 w-4 text-emerald-500" /> : <CopyIcon className="h-4 w-4" />}</button>
              {canEditGroup(group.id) && <button onClick={() => open('edit', group)} className="min-h-10 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-white/10">Editar</button>}
            </div>
          })}
        </section>

        {currentGroup && <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"><div className="flex items-center justify-between"><h3 className="font-extrabold">Miembros</h3><span className="text-xs text-slate-400">{currentGroup.memberCount}</span></div>{memberFeedback && <p className={`mt-3 rounded-xl p-3 text-xs font-bold ${memberFeedback.tone === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>{memberFeedback.text}</p>}{membersLoading ? <p className="mt-4 text-sm text-slate-400">Cargando miembros...</p> : <div className="mt-4 grid gap-2 sm:grid-cols-2">{members.map(member => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-slate-100 p-3 dark:bg-white/5"><UserAvatar value={member.avatar} fallback={member.name.slice(0, 2).toUpperCase()} className="h-10 w-10 rounded-xl text-xs" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{member.name}</span><span className="block truncate text-xs text-slate-400">@{member.handle}</span></span><span className="text-[9px] font-bold uppercase text-emerald-500">{member.role}</span>{canKickMember(member) && <button type="button" onClick={() => void kickMember(member)} onBlur={() => setConfirmKick(current => current === member.id ? null : current)} disabled={Boolean(kicking)} className={`min-h-9 shrink-0 rounded-lg px-2 text-[10px] font-bold transition disabled:opacity-50 ${confirmKick === member.id ? 'bg-rose-500 text-white' : 'text-rose-500 hover:bg-rose-500/10'}`}>{kicking === member.id ? 'Echando...' : confirmKick === member.id ? 'Confirmar' : 'Echar'}</button>}</div>)}{members.length === 0 && <p className="text-sm text-slate-400">No hay miembros para mostrar.</p>}</div>}</section>}
      </div>

      <aside data-tour="groups-actions" className="h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
        {mode === 'list' ? <>
          <h3 className="font-extrabold">Gestionar grupos</h3><p className="mt-1 text-sm leading-6 text-slate-400">{remoteMode ? 'Membresías guardadas en Supabase.' : 'Todo queda guardado localmente.'}</p>
          <div className="mt-5 space-y-2.5"><button onClick={() => open('create')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-bold text-ink"><PlusCircleIcon className="h-5 w-5"/> Crear grupo {remoteMode ? '' : 'local'}</button><button onClick={() => open('join')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 font-bold dark:border-white/10"><UsersIcon className="h-5 w-5" /> Unirme con código</button></div>
          {currentGroup && <div className="mt-6 rounded-xl bg-slate-100 p-3 dark:bg-white/5"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grupo activo</p><p className="mt-1 font-bold">{currentGroup.name}</p><p className="mt-1 font-mono text-xs text-emerald-500">{currentGroup.code}</p></div>}
          {canDeleteCurrentGroup && currentGroup && <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
            <p className="text-xs font-extrabold text-rose-500">Zona de peligro</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">Eliminar el grupo borra sus membresías y partidos, pero conserva las cargas como historial personal con la etiqueta del grupo eliminado.</p>
            <label className="mt-3 block"><span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Escribí “{currentGroup.name}” para confirmar</span><input value={deleteGroupName} onChange={event => setDeleteGroupName(event.target.value)} disabled={deletingGroup} className="mt-2 h-10 w-full rounded-xl border border-rose-500/30 bg-transparent px-3 text-xs font-bold outline-none focus:border-rose-500 disabled:opacity-50" /></label>
            <button type="button" onClick={() => void deleteCurrentGroup()} disabled={deletingGroup || deleteGroupName !== currentGroup.name} className="mt-3 min-h-10 w-full rounded-xl border border-rose-500/30 text-xs font-bold text-rose-500 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50">{deletingGroup ? 'Eliminando...' : 'Eliminar grupo definitivamente'}</button>
          </div>}
        </> : <>
          <button onClick={() => open('list')} disabled={submitting} className="mb-4 min-h-10 text-xs font-bold text-emerald-500 disabled:opacity-50">← Volver</button>
          <h3 className="font-extrabold">{mode === 'create' ? 'Nuevo grupo' : mode === 'join' ? 'Unirme a un grupo' : 'Editar grupo'}</h3>
          <p className="mt-1 text-sm text-slate-400">{mode === 'join' ? 'Pegá el código o link de invitación.' : 'Elegí un nombre corto y reconocible.'}</p>
          <label className="mt-4 block text-xs font-bold text-slate-400">{mode === 'join' ? 'Código' : 'Nombre del grupo'}</label>
          <input autoFocus value={value} disabled={submitting} onChange={event => setValue(mode === 'join' ? formatInviteCodeInput(event.target.value) : event.target.value)} placeholder={mode === 'join' ? 'H63K-81HY o link de invitación' : 'Fútbol del martes'} className={`mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 disabled:opacity-50 dark:border-white/10 ${mode === 'join' ? 'font-mono tracking-wide' : ''}`} />
          {mode !== 'join' && <div className="mt-4"><p className="text-xs font-bold text-slate-400">Emoji del grupo</p><div className="mt-2 grid grid-cols-8 gap-1.5">{groupEmojiOptions.map(option => <button type="button" key={option} onClick={() => setEmoji(option)} aria-label={`Emoji ${option}`} aria-pressed={emoji === option} className={`grid aspect-square place-items-center rounded-xl border text-xl transition ${emoji === option ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'}`}>{option}</button>)}</div></div>}
          {mode !== 'join' && <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-white/10"><p className="text-xs font-bold text-slate-400">Defaults para partidos y cargas</p><div className="mt-3 grid grid-cols-2 gap-2">{matchTypeOptions.map(option => <button type="button" key={option.value} onClick={() => setDefaultMatchType(option.value)} className={`min-h-10 rounded-xl text-xs font-bold ${defaultMatchType === option.value ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{option.label}</button>)}</div><div className="mt-3 grid grid-cols-5 gap-1.5">{footballFormatOptions.map(format => <button type="button" key={format} onClick={() => setDefaultFootballFormat(format)} className={`min-h-10 rounded-xl text-xs font-black ${defaultFootballFormat === format ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{format}</button>)}</div><p className="mt-2 text-[11px] leading-5 text-slate-400">Cuando crees un partido o cargues stats dentro de este grupo, Fulbo arranca con estos valores.</p></div>}
          {error && <p className="mt-2 text-xs font-bold text-rose-500">{error}</p>}
          <button onClick={submit} disabled={submitting} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-500 font-bold text-ink disabled:opacity-50">{submitting ? mode === 'create' ? 'Creando grupo...' : mode === 'join' ? 'Uniéndome...' : 'Guardando...' : mode === 'create' ? 'Crear y activar' : mode === 'join' ? 'Unirme y activar' : 'Guardar nombre'}</button>
        </>}
      </aside>
    </div>
  </>
}
