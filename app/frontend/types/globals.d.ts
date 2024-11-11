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
  currentLocale: string
  currentTimezone: string
  router: {
    root: string
    logout: string
    adminRootPath: string
    authenticatedRootPath: string
    accountManagement: {
      index: string
      new: string
    }
  }
}
export type GlobalPageProps = {
  auth: Auth
  flash: FlashMessage
  X_CSRF_TOKEN: string
  adminPortal: AdminPortal
}