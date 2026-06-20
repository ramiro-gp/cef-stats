import { useMemo, useState } from 'react'
import type { MatchComment } from '../types'
import { UserAvatar } from './UserAvatar'

const MAX_COMMENT_LENGTH = 240

function initials(name: string, handle: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length) return words.slice(0, 2).map(word => word[0]).join('').toUpperCase()
  return handle.replace(/^@/, '').slice(0, 1).toUpperCase() || 'J'
}

function commentDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

interface Props { comments: MatchComment[]; userId: string; onSave: (body: string) => void | Promise<unknown>; onDelete: () => void | Promise<unknown> }

export function MatchCommentsSection({ comments, userId, onSave, onDelete }: Props) {
  const mine = comments.find(comment => comment.userId === userId)
  const [body, setBody] = useState(mine?.body ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const sorted = useMemo(() => [...comments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [comments])

  const save = async () => {
    const cleanBody = body.trim()
    if (!cleanBody) { setError('Escribí algo antes de guardar.'); return }
    if (cleanBody.length > MAX_COMMENT_LENGTH) { setError(`El comentario puede tener hasta ${MAX_COMMENT_LENGTH} caracteres.`); return }
    setSaving(true); setError('')
    try { await onSave(cleanBody); setBody(cleanBody) } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos guardar el comentario.') } finally { setSaving(false) }
  }

  const remove = async () => {
    setDeleting(true); setError('')
    try { await onDelete(); setBody('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos borrar el comentario.') } finally { setDeleting(false) }
  }

  return <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
    <div><h3 className="font-extrabold">FOROBARDO</h3><p className="mt-1 text-xs leading-5 text-slate-400">Una gastada, una declaración. Una por jugador.</p></div>
    <textarea value={body} maxLength={MAX_COMMENT_LENGTH} rows={3} onChange={event => { setBody(event.target.value); setError('') }} placeholder="Ej: La próxima traigan arquero 😏" className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-amber-500 dark:border-white/10 dark:bg-white/5" />
    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400"><span>{mine ? 'Podés editar tu comentario.' : 'Sólo lo ven participantes del partido.'}</span><span className="tabular-nums">{body.length}/{MAX_COMMENT_LENGTH}</span></div>
    {error && <p className="mt-2 text-xs font-bold text-rose-500">{error}</p>}
    <div className={`mt-3 grid gap-2 ${mine ? 'grid-cols-2' : 'grid-cols-1'}`}><button type="button" onClick={() => void save()} disabled={saving || deleting || !body.trim()} className="min-h-11 rounded-xl bg-amber-400 text-sm font-extrabold text-slate-950 disabled:opacity-40">{saving ? 'Guardando...' : mine ? 'Guardar cambios' : 'Publicar comentario'}</button>{mine && <button type="button" onClick={() => void remove()} disabled={saving || deleting} className="min-h-11 rounded-xl border border-rose-500/25 text-sm font-bold text-rose-500 disabled:opacity-40">{deleting ? 'Borrando...' : 'Borrar'}</button>}</div>
    <div className="mt-5 space-y-3">{sorted.length === 0 && <p className="rounded-xl border border-dashed border-amber-500/20 p-4 text-center text-xs text-slate-400">Todavía nadie picó el partido.</p>}{sorted.map(comment => <article key={comment.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]"><div className="flex items-center gap-2.5"><UserAvatar value={comment.authorAvatar} fallback={initials(comment.authorName, comment.authorHandle)} className="h-9 w-9 rounded-full text-[10px]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{comment.authorName}</p><p className="truncate text-[10px] text-slate-400">@{comment.authorHandle.replace(/^@/, '')} · {commentDate(comment.updatedAt)}{comment.updatedAt !== comment.createdAt ? ' · editado' : ''}</p></div></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">{comment.body}</p></article>)}</div>
  </section>
}
