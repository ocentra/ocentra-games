export { SignInAsGuestEvent } from './SignInAsGuestEvent'
export { CreateAccountEvent } from './CreateAccountEvent'
export { SignInWithSteamEvent } from './SignInWithSteamEvent'
export { SignInWithUserPasswordEvent } from './SignInWithUserPasswordEvent'
export { SignInWithGoogleEvent } from './SignInWithGoogleEvent'
export { SignInWithFacebookEvent } from './SignInWithFacebookEvent'
export { SignInCachedUserEvent } from './SignInCachedUserEvent'
export { AuthenticationStatusEvent } from './AuthenticationStatusEvent'
export { AuthenticationCompletedEvent } from './AuthenticationCompletedEvent'
export { RequestUserCredentialsEvent } from './RequestUserCredentialsEvent'
export { RequestAdditionalUserInfoEvent } from './RequestAdditionalUserInfoEvent'
export { RequestConfigManagerEvent } from './RequestConfigManagerEvent'
export { UpdateUIInteractabilityEvent } from './UpdateUIInteractabilityEvent'

import type { SignInAsGuestEvent } from './SignInAsGuestEvent'
import type { CreateAccountEvent } from './CreateAccountEvent'
import type { SignInWithSteamEvent } from './SignInWithSteamEvent'
import type { SignInWithUserPasswordEvent } from './SignInWithUserPasswordEvent'
import type { SignInWithGoogleEvent } from './SignInWithGoogleEvent'
import type { SignInWithFacebookEvent } from './SignInWithFacebookEvent'
import type { SignInCachedUserEvent } from './SignInCachedUserEvent'
import type { AuthenticationStatusEvent } from './AuthenticationStatusEvent'
import type { AuthenticationCompletedEvent } from './AuthenticationCompletedEvent'
import type { RequestUserCredentialsEvent } from './RequestUserCredentialsEvent'
import type { RequestAdditionalUserInfoEvent } from './RequestAdditionalUserInfoEvent'
import type { RequestConfigManagerEvent } from './RequestConfigManagerEvent'
import type { UpdateUIInteractabilityEvent } from './UpdateUIInteractabilityEvent'

declare module '@lib/eventing/EventTypes' {
  interface EventTypeMap {
    'Authentication/SignInAsGuest': SignInAsGuestEvent
    'Authentication/CreateAccount': CreateAccountEvent
    'Authentication/SignInWithSteam': SignInWithSteamEvent
    'Authentication/SignInWithUserPassword': SignInWithUserPasswordEvent
    'Authentication/SignInWithGoogle': SignInWithGoogleEvent
    'Authentication/SignInWithFacebook': SignInWithFacebookEvent
    'Authentication/SignInCachedUser': SignInCachedUserEvent
    'Authentication/Status': AuthenticationStatusEvent
    'Authentication/Completed': AuthenticationCompletedEvent
    'Authentication/RequestUserCredentials': RequestUserCredentialsEvent
    'Authentication/RequestAdditionalUserInfo': RequestAdditionalUserInfoEvent
    'Authentication/RequestConfigManager': RequestConfigManagerEvent
    'Authentication/UpdateUIInteractability': UpdateUIInteractabilityEvent
  }
}
