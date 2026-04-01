export interface ButtonReference {
  id: string
  label?: string
  context?: Record<string, unknown>
}

export interface LobbyPlayer {
  id: string
  displayName: string
  avatarUrl?: string
  isHost?: boolean
  isLocal?: boolean
  metadata?: Record<string, unknown>
}

export interface LobbySummary {
  id: string
  name: string
  gameMode?: string
  maxPlayers?: number
  isPrivate?: boolean
  metadata?: Record<string, unknown>
}

export interface LobbyDetails extends LobbySummary {
  players: LobbyPlayer[]
  hostPlayerId?: string
  createdAt?: string
  lobbyCode?: string
}

export interface LobbyOptions {
  lobbyName: string
  gameMode: string
  maxPlayers: number
  isPrivate?: boolean
  optionsPassword?: string | null
}

