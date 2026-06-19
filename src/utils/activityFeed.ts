import { getRareFunnyMessage } from '../data/messages'
import { seedFeed } from '../data/seedData'
import type { ActivityFeedItem, Group, Match, MatchEvent, PersonalWorldCupState, StatEntry, User } from '../types'
import { buildRankings, getGoalPosition } from './stats'
import { applyWorldCupResult, initialWorldCupState, sortWorldCupEntries, worldCupStageLabels } from './worldCup'

function activity(values: Omit<ActivityFeedItem, 'groupId'>, groupId: string): ActivityFeedItem {
  return { ...values, groupId }
}

function matchEventActivity(event: MatchEvent, matches: Match[], user: User): ActivityFeedItem | null {
  const match = matches.find(item => item.id === event.matchId)
  if (!match) return null
  const playerName = event.guestName ?? (event.userId === user.id ? user.name : 'Un jugador')
  const teamName = event.team === 'light' ? 'claro' : 'oscuro'
  const text = event.type === 'created' ? `Se creó el partido ${match.title}.`
    : event.type === 'joined_team' ? `${playerName} se unió al equipo ${teamName}.`
    : event.type === 'left_match' ? `${playerName} salió de ${match.title}.`
    : event.type === 'score_saved' && event.score ? `Se cargó el resultado: Claro ${event.score.light} - ${event.score.dark} Oscuro.`
    : event.type === 'mvp_selected' ? `${playerName} fue MVP de ${match.title}.`
    : event.type === 'guest_added' ? `${playerName} fue agregado como invitado al equipo ${teamName}.`
    : event.type === 'guest_removed' ? `${playerName} salió de la lista de invitados de ${match.title}.`
    : event.type === 'guest_stats' ? `Invitado ${playerName} metió ${event.goals ?? 0} ${(event.goals ?? 0) === 1 ? 'gol' : 'goles'} y ${event.assists ?? 0} ${(event.assists ?? 0) === 1 ? 'asistencia' : 'asistencias'}.`
    : event.type === 'stats_linked' ? `${playerName} vinculó sus stats a ${match.title}.`
    : null
  if (!text) return null
  return { id: event.id, groupId: event.groupId, icon: event.type === 'mvp_selected' ? 'trophy' : event.type === 'guest_stats' ? 'up' : 'info', category: event.type === 'mvp_selected' ? 'ranking_change' : event.type === 'guest_stats' || event.type === 'stats_linked' ? 'stat_entry' : 'system', important: event.type === 'mvp_selected' || event.type === 'score_saved', text, createdAt: event.createdAt }
}

export function buildActivityFeed(entries: StatEntry[], user: User, group: Group, matches: Match[] = [], matchEvents: MatchEvent[] = []): ActivityFeedItem[] {
  const generated: ActivityFeedItem[] = []
  const chronologicalEntries = sortWorldCupEntries(entries)
  let worldCup = initialWorldCupState
  let streak = 0
  let previousGoalPosition = getGoalPosition(buildRankings([], user, group.seeded), user.id)

  chronologicalEntries.forEach((entry, index) => {
    const beforeWorldCup = worldCup
    worldCup = applyWorldCupResult(worldCup, entry.result)
    streak = entry.goals > 0 ? streak + 1 : 0

    const linkedMatch = entry.matchId ? matches.find(match => match.id === entry.matchId) : null
    generated.push(activity({
      id: `stats-${entry.id}`,
      icon: entry.goals > 0 ? 'up' : 'info',
      category: 'stat_entry',
      important: false,
      text: `${user.name} cargó ${entry.goals} ${entry.goals === 1 ? 'gol' : 'goles'} y ${entry.assists} ${entry.assists === 1 ? 'asistencia' : 'asistencias'}${linkedMatch ? ` en ${linkedMatch.title}` : ''}.`,
      createdAt: entry.createdAt,
    }, group.id))

    if (worldCup.worldCupsWon > beforeWorldCup.worldCupsWon) {
      generated.push(activity({ id: `cup-${entry.id}`, icon: 'trophy', category: 'world_cup', important: true, text: `${user.name} ganó su ${worldCup.worldCupsWon === 1 ? 'primer' : `${worldCup.worldCupsWon}°`} Mundial Personal.`, createdAt: entry.createdAt }, group.id))
    } else if (beforeWorldCup.currentStage === 'group' && worldCup.currentStage === 'roundOf16') {
      generated.push(activity({ id: `stage-${entry.id}`, icon: 'trophy', category: 'world_cup', important: true, text: `${user.name} clasificó a octavos con ${worldCup.groupPoints} puntos.`, createdAt: entry.createdAt }, group.id))
    } else if (worldCup.currentStage !== beforeWorldCup.currentStage && worldCup.currentStage !== 'group') {
      generated.push(activity({ id: `stage-${entry.id}`, icon: 'trophy', category: 'world_cup', important: true, text: `${user.name} llegó a ${worldCupStageLabels[worldCup.currentStage].toLowerCase()} de su Mundial Personal.`, createdAt: entry.createdAt }, group.id))
    } else if (beforeWorldCup.currentStage !== 'group' && worldCup.currentStage === 'group') {
      generated.push(activity({ id: `reset-${entry.id}`, icon: 'info', category: 'world_cup', important: true, text: `${user.name} vuelve a empezar su Mundial Personal.`, createdAt: entry.createdAt }, group.id))
    } else if (entry.result === 'draw' && worldCup.currentStage !== 'group') {
      generated.push(activity({ id: `draw-${entry.id}`, icon: 'trophy', category: 'world_cup', important: true, text: `${user.name} empató y sigue en ${worldCupStageLabels[worldCup.currentStage].toLowerCase()}.`, createdAt: entry.createdAt }, group.id))
    } else if (worldCup.wasReset && worldCup.lastCycleOutcome === 'not_qualified') {
      generated.push(activity({ id: `groups-reset-${entry.id}`, icon: 'info', category: 'system', important: false, text: `${user.name} ${worldCup.lastMilestone?.toLowerCase()} y comienza un nuevo ciclo.`, createdAt: entry.createdAt }, group.id))
    }

    if (streak >= 3) {
      generated.push(activity({ id: `streak-${entry.id}`, icon: 'fire', category: 'streak', important: true, text: `${user.name} lleva ${streak} partidos seguidos convirtiendo.`, createdAt: entry.createdAt }, group.id))
    }

    if (entry.goals >= 4) {
      generated.push(activity({ id: `record-${entry.id}`, icon: 'fire', category: 'ranking_change', important: true, text: `${user.name} firmó un partidazo con ${entry.goals} goles.`, createdAt: entry.createdAt }, group.id))
    }

    const currentRankings = buildRankings(chronologicalEntries.slice(0, index + 1), user, group.seeded)
    const goalPosition = getGoalPosition(currentRankings, user.id)
    if (goalPosition < previousGoalPosition) {
      const passedPlayer = [...currentRankings].sort((a, b) => b.goals - a.goals)[goalPosition]
      if (passedPlayer) generated.push(activity({ id: `ranking-${entry.id}`, icon: 'up', category: 'ranking_change', important: true, text: `${user.name} superó a ${passedPlayer.name} en goles.`, createdAt: entry.createdAt }, group.id))
    }
    previousGoalPosition = goalPosition

    const funnyMessage = getRareFunnyMessage(index + 1)
    if (funnyMessage) generated.push(activity({ id: `funny-${entry.id}`, icon: 'info', category: 'funny', important: false, text: funnyMessage, createdAt: entry.createdAt }, group.id))
  })

  const matchFeed = matchEvents.filter(event => event.groupId === group.id).map(event => matchEventActivity(event, matches, user)).filter((item): item is ActivityFeedItem => Boolean(item))
  const groupSeed = seedFeed.filter(item => item.groupId === group.id)
  if (!generated.length && !matchFeed.length && !groupSeed.length) {
    return [activity({ id: `system-${group.id}`, icon: 'info', category: 'system', important: false, text: 'Cuando el grupo cargue stats, acá aparece el bardo.', createdAt: new Date().toISOString() }, group.id)]
  }

  // Invertimos eventos completos, preservando todos los mensajes simples y los hitos.
  return [...generated, ...matchFeed].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).concat(groupSeed)
}

export function buildAllGroupsActivityFeed(entries: StatEntry[], userNames: Record<string, string>, groupNames: Record<string, string>, matches: Match[] = []): ActivityFeedItem[] {
  const seen = new Set<string>()
  return [...entries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap(entry => {
      if (seen.has(entry.id)) return []
      seen.add(entry.id)
      const groupId = entry.groupId ?? 'all'
      const linkedMatch = entry.matchId ? matches.find(match => match.id === entry.matchId) : undefined
      const playerName = userNames[entry.userId] ?? 'Un jugador'
      return [{
        id: `stats-${entry.id}`,
        groupId,
        groupName: groupNames[groupId] ?? 'Grupo',
        icon: entry.goals > 0 ? 'up' as const : 'info' as const,
        category: 'stat_entry' as const,
        important: false,
        text: `${playerName} cargó ${entry.goals} ${entry.goals === 1 ? 'gol' : 'goles'} y ${entry.assists} ${entry.assists === 1 ? 'asistencia' : 'asistencias'}${linkedMatch ? ` en ${linkedMatch.title}` : ''}.`,
        createdAt: entry.createdAt,
      }]
    })
}

export function worldCupProgress(state: PersonalWorldCupState): number {
  if (state.currentStage === 'group') return state.groupMatchesPlayed
  return { roundOf16: 4, quarterFinal: 5, semiFinal: 6, final: 7 }[state.currentStage]
}
