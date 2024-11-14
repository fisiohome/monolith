import type { Admin } from "./admin-portal/admin";
import type { User } from "./auth";

export interface Auth {
	currentUser:
		| null
		| (Admin & {
				user: Pick<User, "id" | "email">;
		  });
}
export interface FlashMessage {
	success: string | null;
	alert: string | null;
}
export interface AdminPortal {
	currentLocale: string;
	currentTimezone: string;
	currentQuery: Record<string, string> | null;
	router: {
		root: string;
		authenticatedRootPath: string;
		logout: string;
		adminPortalRootPath: string;
		adminPortal: {
			adminManagement: {
				index: string;
				new: string;
			};
		};
	};
}
export type GlobalPageProps = {
	auth: Auth;
	flash: FlashMessage;
	X_CSRF_TOKEN: string;
	adminPortal: AdminPortal;
};
