export type Page = 'home' | 'add' | 'matches' | 'rankings' | 'profile' | 'groups'
export type MatchResult = 'win' | 'draw' | 'loss'
export type StatScopeType = 'personal' | 'group'
export type RankingTab = 'goals' | 'assists' | 'matches' | 'average' | 'worldCup'
export type WorldCupStage = 'group' | 'roundOf16' | 'quarterFinal' | 'semiFinal' | 'final'
export type ActivityIcon = 'trophy' | 'up' | 'fire' | 'info'
export type ActivityCategory = 'stat_entry' | 'ranking_change' | 'streak' | 'world_cup' | 'funny' | 'system'
export type ThemeMode = 'dark' | 'light' | 'system'
export type MatchFormat = 'F5' | 'F6' | 'F7' | 'F8' | 'F11'
export type MatchStatus = 'open' | 'played' | 'closed'
export type MatchTeam = 'light' | 'dark'
export type PlayerPosition = 'Arquero' | 'Defensor' | 'Mediocampista' | 'Delantero'
export type MatchEventType = 'created' | 'joined_team' | 'left_match' | 'score_saved' | 'mvp_selected' | 'guest_added' | 'guest_removed' | 'guest_stats' | 'stats_linked'
export type MatchParticipantType = 'registered_user' | 'guest'
export type GroupMemberRole = 'owner' | 'admin' | 'member'
export type BannerMessageType = 'world_cup' | 'ranking' | 'streak' | 'stats' | 'funny' | 'system'
export type AccessMode = 'gateway' | 'local' | 'account'

export interface User {
  id: string
  name: string
  nickname: string
  username: string
  initials: string
  avatar: string
  position: PlayerPosition | ''
}

export interface AuthProfile {
  id: string
  name: string
  handle: string
  avatar: string | null
  position: PlayerPosition | null
  createdAt: string
  updatedAt: string
}

export interface Group {
  id: string
  name: string
  code: string
  memberCount: number
  gamesCount: number
  emoji: string
  spicyMode: boolean
  seeded: boolean
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  role: GroupMemberRole
  joinedAt: string
}

export interface GroupMemberView extends GroupMember {
  name: string
  handle: string
  avatar: string | null
}

export interface StatEntry {
  id: string
  userId: string
  scopeType?: StatScopeType
  groupId?: string
  createdAt: string
  playedAt?: string
  updatedAt?: string
  result: MatchResult
  goals: number
  assists: number
  matchId?: string
  team?: MatchTeam
}

export interface MatchParticipant {
  id: string
  matchId: string
  userId?: string
  guestName?: string
  guestHandle?: string
  handle?: string
  avatar?: string
  displayName?: string
  type: MatchParticipantType
  team?: MatchTeam
  createdAt: string
}

export interface GuestMatchStats {
  participantId: string
  goals: number
  assists: number
  updatedAt: string
}

export interface MatchScore {
  light: number
  dark: number
}

export interface MatchMvpVote {
  id: string
  matchId: string
  voterUserId: string
  participantId: string
  createdAt: string
  updatedAt: string
}

export interface MatchComment {
  id: string
  matchId: string
  userId: string
  body: string
  authorName: string
  authorHandle: string
  authorAvatar?: string
  createdAt: string
  updatedAt: string
}

export interface Match {
  id: string
  groupId: string
  groupName?: string
  title: string
  format?: MatchFormat
  scheduledAt: string
  createdByUserId: string
  inviteCode: string
  status: MatchStatus
  participants: MatchParticipant[]
  score?: MatchScore
  mvpUserId?: string
  mvpParticipantId?: string
  mvpVotes?: MatchMvpVote[]
  comments?: MatchComment[]
  guestStats: GuestMatchStats[]
  createdAt: string
  updatedAt: string
}

export interface MatchEvent {
  id: string
  groupId: string
  matchId: string
  type: MatchEventType
  userId?: string
  team?: MatchTeam
  score?: MatchScore
  participantId?: string
  guestName?: string
  goals?: number
  assists?: number
  createdAt: string
}

export interface RankingPlayer {
  id: string
  name: string
  initials: string
  accent: string
  goals: number
  assists: number
  matches: number
  wins: number
  draws: number
  losses: number
  average: number
  worldCupsWon: number
  worldCupStage: WorldCupStage
  isCurrentUser?: boolean
}

export interface PersonalWorldCupState {
  currentStage: WorldCupStage
  groupMatchesPlayed: number
  groupPoints: number
  worldCupsWon: number
  currentCycle: number
  statusText: string
  lastMilestone: string | null
  wasReset: boolean
  lastCycleOutcome: 'not_qualified' | 'eliminated' | 'champion' | null
}

export interface ActivityFeedItem {
  id: string
  groupId: string
  groupName?: string
  icon: ActivityIcon
  category: ActivityCategory
  important: boolean
  text: string
  createdAt: string
}

export interface BannerMessage {
  subject: string
  type: BannerMessageType
  text: string
}

export interface ThemeSettings {
  mode: ThemeMode
}

export interface AppState {
  user: User
  groups: Group[]
  groupMembers: GroupMember[]
  activeGroupId: string
  entries: StatEntry[]
  matches: Match[]
  matchEvents: MatchEvent[]
}

// Alias temporal para no romper imports mientras la app migra hacia AppState.
export type LocalAppState = AppState
