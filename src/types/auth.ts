import type { User } from 'firebase/auth'

export interface AuthContextValue {
  user: User | null
  authReady: boolean
  signOutUser: () => Promise<void>
}
