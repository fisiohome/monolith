export interface Auth {
  currentUser: null | {
    id: string
    email: string
    signInCount: string
    currentSignInAt: string
    lastSignInAt: string
    currentSignInIp: string
    lastSignInIp: string
    createdAt: string
    updatedAt: string
  }
}
export interface FlashMessage {
  success: string | null
  alert: string | null
}
export interface AdminPortal {
  router: {
    root: string
    logout: string
    adminRootPath: string
    accountManagement: {
      index: string
    }
  }
}
export type GlobalPageProps = {
  auth: Auth
  flash: FlashMessage
  X_CSRF_TOKEN: string
  adminPortal: AdminPortal
}