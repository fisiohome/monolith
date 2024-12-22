import type { Admin } from "./admin-portal/admin";
import type { User } from "./auth";

export type ResponsiveDialogMode = "dialog" | "drawer";

export interface Auth {
	currentUser:
		| null
		| (Pick<
				Admin,
				| "id"
				| "name"
				| "adminType"
				| "isSuperAdmin?"
				| "isAdminL1?"
				| "isAdminL12?"
				| "isAdminL13?"
				| "isAdminBacklog?"
		  > & {
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
		login: string;
		logout: string;
		auth: {
			registration: {
				index: string;
				edit: string;
			};
			password: {
				index: string;
			};
		};
		adminPortalRootPath: string;
		adminPortal: {
			adminManagement: {
				index: string;
				new: string;
				generateResetPasswordUrl: string;
				changePassword: string;
				suspend: string;
				activate: string;
			};
			therapistManagement: {
				index: string;
				new: string;
			};
			serviceManagement: {
				index: string;
				updateStatus: string;
			};
			locationManagement: {
				index: string;
				createBulk: string;
				updateBulk: string;
				deleteBulk: string;
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

export type Timestamp = {
	createdAt: string;
	updatedAt: string;
};
