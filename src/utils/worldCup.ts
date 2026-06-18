import type { MatchResult, PersonalWorldCupState, StatEntry, WorldCupStage } from '../types'

const POINTS: Record<MatchResult, number> = { win: 3, draw: 1, loss: 0 }

export const worldCupStageLabels: Record<WorldCupStage, string> = {
  group: 'Fase de grupos',
  roundOf16: 'Octavos',
  quarterFinal: 'Cuartos',
  semiFinal: 'Semifinal',
  final: 'Final',
}

const nextStage: Record<Exclude<WorldCupStage, 'group' | 'final'>, Exclude<WorldCupStage, 'group'>> = {
  roundOf16: 'quarterFinal',
  quarterFinal: 'semiFinal',
  semiFinal: 'final',
}

function groupStatus(matches: number, points: number): string {
  return `Fase de grupos: ${matches}/3 partidos, ${points} ${points === 1 ? 'punto' : 'puntos'}. Necesitás 5 puntos para clasificar.`
}

function knockoutStatus(stage: Exclude<WorldCupStage, 'group'>): string {
  if (stage === 'final') return 'Estás en la final. Ganar te da el Mundial Personal; empatar mantiene la instancia y perder reinicia.'
  return `Estás en ${worldCupStageLabels[stage].toLowerCase()}. Ganar te hace avanzar, empatar mantiene la instancia y perder reinicia.`
}

export const initialWorldCupState: PersonalWorldCupState = {
  currentStage: 'group',
  groupMatchesPlayed: 0,
  groupPoints: 0,
  worldCupsWon: 0,
  currentCycle: 1,
  statusText: groupStatus(0, 0),
  lastMilestone: null,
  wasReset: false,
  lastCycleOutcome: null,
}

function startNextCycle(state: PersonalWorldCupState, outcome: NonNullable<PersonalWorldCupState['lastCycleOutcome']>, milestone: string): PersonalWorldCupState {
  return {
    ...initialWorldCupState,
    worldCupsWon: state.worldCupsWon,
    currentCycle: state.currentCycle + 1,
    lastMilestone: milestone,
    wasReset: true,
    lastCycleOutcome: outcome,
  }
}

// Transición pura de un único partido. No lee estado externo ni muta el recibido.
export function applyWorldCupResult(state: PersonalWorldCupState, result: MatchResult): PersonalWorldCupState {
  if (state.currentStage === 'group') {
    const groupMatchesPlayed = state.groupMatchesPlayed + 1
    const groupPoints = state.groupPoints + POINTS[result]

    if (groupMatchesPlayed < 3) {
      return {
        ...state,
        groupMatchesPlayed,
        groupPoints,
        statusText: groupStatus(groupMatchesPlayed, groupPoints),
        wasReset: false,
      }
    }

    if (groupPoints >= 5) {
      return {
        ...state,
        currentStage: 'roundOf16',
        groupMatchesPlayed: 3,
        groupPoints,
        statusText: knockoutStatus('roundOf16'),
        lastMilestone: `Clasificó a octavos con ${groupPoints} puntos`,
        wasReset: false,
      }
    }

    return startNextCycle(state, 'not_qualified', `Quedó eliminado en fase de grupos con ${groupPoints} puntos`)
  }

  if (result === 'loss') {
    return startNextCycle(state, 'eliminated', `Quedó eliminado en ${worldCupStageLabels[state.currentStage].toLowerCase()}`)
  }

  if (result === 'draw') {
    return {
      ...state,
      statusText: knockoutStatus(state.currentStage),
      lastMilestone: `Empató y sigue en ${worldCupStageLabels[state.currentStage].toLowerCase()}`,
      wasReset: false,
    }
  }

  if (state.currentStage === 'final') {
    const won = { ...state, worldCupsWon: state.worldCupsWon + 1 }
    const ordinal = won.worldCupsWon === 1 ? 'primer' : `${won.worldCupsWon}°`
    return startNextCycle(won, 'champion', `Ganó su ${ordinal} Mundial Personal`)
  }

  const currentStage = nextStage[state.currentStage]
  return {
    ...state,
    currentStage,
    statusText: knockoutStatus(currentStage),
    lastMilestone: `Llegó a ${worldCupStageLabels[currentStage].toLowerCase()}`,
    wasReset: false,
  }
}

export function sortWorldCupEntries(entries: StatEntry[]): StatEntry[] {
  return [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

export function calculatePersonalWorldCup(entries: StatEntry[]): PersonalWorldCupState {
  return sortWorldCupEntries(entries).reduce((state, entry) => applyWorldCupResult(state, entry.result), initialWorldCupState)
}

/*
  Casos de control A-I documentados también en README:
  9, 6 o 5 puntos clasifican; 4 o menos reinician.
  En eliminatorias win avanza, draw conserva la fase y loss reinicia.
  Dos secuencias ganadoras completas acumulan dos Mundiales y abren el ciclo 3.
*/
