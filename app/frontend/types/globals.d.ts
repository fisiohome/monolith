export interface Auth {
	currentUser: null | {
		id: number;
		adminType:
			| "SUPER_ADMIN"
			| "ADMIN_L1"
			| "ADMIN_L2"
			| "ADMIN_L3"
			| "ADMIN_BACKLOG";
		name: string;
		user: {
			id: number;
			email: string;
		};
	};
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
