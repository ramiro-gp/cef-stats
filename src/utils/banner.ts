import { getRareBannerFunnyMessage } from '../data/messages'
import type { BannerMessage, Group, Match, PersonalWorldCupState, RankingPlayer, StatEntry, User } from '../types'
import type { UserTotals } from './stats'
import { worldCupStageLabels } from './worldCup'
import { isPersonalScope } from './scopes'

function currentWorldCupPhrase(user: User, state: PersonalWorldCupState): string {
  if (state.currentStage !== 'group') return `${user.name} está en ${worldCupStageLabels[state.currentStage].toLowerCase()} de su Mundial Personal.`
  const missingPoints = Math.max(0, 5 - state.groupPoints)
  const ending = missingPoints ? ` y necesita ${missingPoints} más para clasificar` : ' y debe completar los 3 partidos'
  return `${user.name} suma ${state.groupPoints} ${state.groupPoints === 1 ? 'punto' : 'puntos'} en ${state.groupMatchesPlayed}/3 partidos${ending}.`
}

function mockWorldCupPhrase(player: RankingPlayer): string {
  if (player.worldCupsWon > 0) return `${player.name} ganó ${player.worldCupsWon} Mundial${player.worldCupsWon === 1 ? '' : 'es'} Personal${player.worldCupsWon === 1 ? '' : 'es'}.`
  if (player.worldCupStage === 'group') return `${player.name} está buscando su pase a octavos.`
  return `${player.name} está en ${worldCupStageLabels[player.worldCupStage].toLowerCase()} de su Mundial Personal.`
}

function distribute(candidates: BannerMessage[], limit: number): string[] {
  const pending = [...candidates]
  const selected: BannerMessage[] = []
  while (pending.length && selected.length < limit) {
    const previous = selected.at(-1)
    let index = pending.findIndex(item => item.subject !== previous?.subject && item.type !== previous?.type)
    if (index < 0) index = pending.findIndex(item => item.subject !== previous?.subject)
    if (index < 0) index = 0
    selected.push(pending.splice(index, 1)[0])
  }
  return Array.from(new Set(selected.map(item => item.text)))
}

export function buildGroupBannerMessages(group: Group, players: RankingPlayer[], user: User, totals: UserTotals, worldCup: PersonalWorldCupState, entryCount: number, matches: Match[] = [], entries: StatEntry[] = []): string[] {
  const personalScope = isPersonalScope(group)
  if (!players.length) {
    const latestMatch = [...matches].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0]
    if (!latestMatch) return [personalScope ? 'Mi historial todavía no tiene stats. Cargá tu primer partido cuando quieras.' : `${group.name} todavía no tiene stats. Cargá el primer partido para abrir la conversación.`]
    const messages = [`${latestMatch.title} ${latestMatch.score ? `terminó Claro ${latestMatch.score.light} - ${latestMatch.score.dark} Oscuro` : 'está abierto. Sumate desde Partidos'}.`]
    if (latestMatch.mvpParticipantId) { const mvp = latestMatch.participants.find(participant => participant.id === latestMatch.mvpParticipantId); messages.push(`${mvp?.type === 'guest' ? mvp.guestName : mvp?.userId === user.id ? user.name : 'Un jugador'} fue MVP de ${latestMatch.title}.`) }
    const guestCount = latestMatch.participants.filter(participant => participant.type === 'guest').length
    if (guestCount) messages.push(`${guestCount} ${guestCount === 1 ? 'invitado completa' : 'invitados completan'} ${latestMatch.title}.`)
    if (latestMatch.guestStats.length) messages.push(`${latestMatch.guestStats.length} ${latestMatch.guestStats.length === 1 ? 'invitado ya cargó' : 'invitados ya cargaron'} sus stats.`)
    const funny = getRareBannerFunnyMessage({ group, players, user, totals, matches, entries, entryCount })
    return funny ? [...messages, funny] : messages
  }
  const goalRanking = [...players].sort((a, b) => b.goals - a.goals)
  const assistRanking = [...players].sort((a, b) => b.assists - a.assists)
  const mockPlayers = players.filter(player => !player.isCurrentUser)
  const offset = [...group.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % Math.max(1, mockPlayers.length)
  const rotatedMocks = [...mockPlayers.slice(offset), ...mockPlayers.slice(0, offset)]
  const candidates: BannerMessage[] = [
    { subject: user.id, type: 'world_cup', text: currentWorldCupPhrase(user, worldCup) },
    { subject: goalRanking[0].id, type: 'ranking', text: `${goalRanking[0].name} lidera la tabla con ${goalRanking[0].goals} goles.` },
    ...rotatedMocks.slice(0, 2).map(player => ({ subject: player.id, type: 'world_cup' as const, text: mockWorldCupPhrase(player) })),
    { subject: assistRanking[0].id, type: 'stats', text: `${assistRanking[0].name} manda en asistencias con ${assistRanking[0].assists}.` },
  ]

  if (totals.scoringStreak >= 3) candidates.push({ subject: user.id, type: 'streak', text: `${user.name} lleva ${totals.scoringStreak} partidos seguidos convirtiendo.` })
  if (worldCup.worldCupsWon > 0) candidates.push({ subject: user.id, type: 'world_cup', text: `${user.name} ganó ${worldCup.worldCupsWon} Mundial${worldCup.worldCupsWon === 1 ? '' : 'es'} Personal${worldCup.worldCupsWon === 1 ? '' : 'es'}.` })
  const latestMatch = [...matches].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0]
  if (latestMatch?.score) candidates.push({ subject: latestMatch.id, type: 'system', text: `${latestMatch.title}: Claro ${latestMatch.score.light} - ${latestMatch.score.dark} Oscuro.` })
  else if (latestMatch) candidates.push({ subject: latestMatch.id, type: 'system', text: `${latestMatch.title} está abierto. Sumate desde Partidos.` })
  if (latestMatch?.mvpParticipantId) { const mvp = latestMatch.participants.find(participant => participant.id === latestMatch.mvpParticipantId); candidates.push({ subject: latestMatch.mvpParticipantId, type: 'ranking', text: `${mvp?.type === 'guest' ? mvp.guestName : mvp?.userId === user.id ? user.name : 'Un jugador'} fue MVP de ${latestMatch.title}.` }) }
  if (latestMatch) {
    const guests = latestMatch.participants.filter(participant => participant.type === 'guest')
    if (guests.length) candidates.push({ subject: latestMatch.id, type: 'stats', text: `${guests.length} ${guests.length === 1 ? 'invitado completa' : 'invitados completan'} ${latestMatch.title}.` })
    const loadedStats = entries.filter(entry => entry.matchId === latestMatch.id).length + latestMatch.guestStats.length
    if (loadedStats) candidates.push({ subject: latestMatch.id, type: 'stats', text: `${loadedStats} ${loadedStats === 1 ? 'jugador ya cargó' : 'jugadores ya cargaron'} stats en ${latestMatch.title}.` })
  }
  candidates.push({ subject: group.id, type: 'system', text: personalScope ? 'Mi historial guarda tus números aunque todavía no tengas grupo.' : `${group.name}: la tabla está más apretada de lo que algunos admiten.` })

  const funny = getRareBannerFunnyMessage({ group, players, user, totals, matches, entries, entryCount })
  if (funny) candidates.push({ subject: 'system', type: 'funny', text: funny })
  return distribute(candidates, 7)
}
