export { ShowSubTabEvent } from './ShowSubTabEvent'
export { InfoSubTabStateChangedEvent } from './InfoSubTabStateChangedEvent'
export { ArcadeInfoEvent } from './ArcadeInfoEvent'
export { ShowArcadeSideEvent } from './ShowArcadeSideEvent'
export { Button3DSimpleClickEvent } from './Button3DSimpleClickEvent'
export { LobbyInfoEvent } from './LobbyInfoEvent'
export { LobbyPlayerUpdateEvent } from './LobbyPlayerUpdateEvent'
export { UpdateLobbyEvent } from './UpdateLobbyEvent'
export { CreateProfileEvent } from './CreateProfileEvent'
export { UpdatePlayerListEvent } from './UpdatePlayerListEvent'
export { StartLobbyAsHostEvent } from './StartLobbyAsHostEvent'
export { PlayerLeftLobbyEvent } from './PlayerLeftLobbyEvent'
export { ShowScreenEvent } from './ShowScreenEvent'
export { UpdateLobbyListEvent } from './UpdateLobbyListEvent'
export { UpdateLobbyPlayerListEvent } from './UpdateLobbyPlayerListEvent'
export { ProfileCreatedEvent } from './ProfileCreatedEvent'
export { CreateLobbyEvent } from './CreateLobbyEvent'
export { InputLobbyPasswordEvent } from './InputLobbyPasswordEvent'
export { JoinedLobbyEvent } from './JoinedLobbyEvent'
export { JoinLobbyEvent } from './JoinLobbyEvent'

import type { ShowSubTabEvent } from './ShowSubTabEvent'
import type { InfoSubTabStateChangedEvent } from './InfoSubTabStateChangedEvent'
import type { ArcadeInfoEvent } from './ArcadeInfoEvent'
import type { ShowArcadeSideEvent } from './ShowArcadeSideEvent'
import type { Button3DSimpleClickEvent } from './Button3DSimpleClickEvent'
import type { LobbyInfoEvent } from './LobbyInfoEvent'
import type { LobbyPlayerUpdateEvent } from './LobbyPlayerUpdateEvent'
import type { UpdateLobbyEvent } from './UpdateLobbyEvent'
import type { CreateProfileEvent } from './CreateProfileEvent'
import type { UpdatePlayerListEvent } from './UpdatePlayerListEvent'
import type { StartLobbyAsHostEvent } from './StartLobbyAsHostEvent'
import type { PlayerLeftLobbyEvent } from './PlayerLeftLobbyEvent'
import type { ShowScreenEvent } from './ShowScreenEvent'
import type { UpdateLobbyListEvent } from './UpdateLobbyListEvent'
import type { UpdateLobbyPlayerListEvent } from './UpdateLobbyPlayerListEvent'
import type { ProfileCreatedEvent } from './ProfileCreatedEvent'
import type { CreateLobbyEvent } from './CreateLobbyEvent'
import type { InputLobbyPasswordEvent } from './InputLobbyPasswordEvent'
import type { JoinedLobbyEvent } from './JoinedLobbyEvent'
import type { JoinLobbyEvent } from './JoinLobbyEvent'

declare module '@lib/eventing/EventTypes' {
  interface EventTypeMap {
    'Lobby/ShowSubTab': ShowSubTabEvent
    'Lobby/InfoSubStateChanged': InfoSubTabStateChangedEvent
    'Lobby/ArcadeInfo': ArcadeInfoEvent
    'Lobby/ShowArcadeSide': ShowArcadeSideEvent
    'Lobby/Button3DClick': Button3DSimpleClickEvent
    'Lobby/Info': LobbyInfoEvent
    'Lobby/PlayerUpdate': LobbyPlayerUpdateEvent
    'Lobby/Update': UpdateLobbyEvent
    'Lobby/CreateProfile': CreateProfileEvent
    'Lobby/UpdatePlayerList': UpdatePlayerListEvent
    'Lobby/StartAsHost': StartLobbyAsHostEvent
    'Lobby/PlayerLeft': PlayerLeftLobbyEvent
    'Lobby/ShowScreen': ShowScreenEvent
    'Lobby/UpdateLobbyList': UpdateLobbyListEvent
    'Lobby/UpdateLobbyPlayerList': UpdateLobbyPlayerListEvent
    'Lobby/ProfileCreated': ProfileCreatedEvent
    'Lobby/CreateLobby': CreateLobbyEvent
    'Lobby/InputLobbyPassword': InputLobbyPasswordEvent
    'Lobby/Joined': JoinedLobbyEvent
    'Lobby/JoinLobby': JoinLobbyEvent
  }
}
