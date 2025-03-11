import type { Admin } from "./admin-portal/admin";
import type { Service } from "./admin-portal/service";
import type { Therapist } from "./admin-portal/therapist";
import type { User } from "./auth";

export type ResponsiveDialogMode = "dialog" | "drawer";
type CurrentUserType = "ADMIN" | "THERAPIST";
type CurrentUserAdmin = Pick<
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
};
type CurrentUserTypeTherapist = Pick<Therapist, "id" | "name"> & {
	user: Pick<User, "id" | "email">;
	service: Pick<Service, "id" | "name" | "code">;
};
export interface Auth {
	currentUser: null | (CurrentUserAdmin & CurrentUserTypeTherapist);
	currentUserType: CurrentUserType;
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
				generateResetPasswordUrl: string;
				changePassword: string;
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
			appointment: {
				index: string;
				new: string;
				book: string;
			};
			availability: {
				index: string;
				upsert: string;
			};
			settings: {
				accountSecurity: string;
				appearance: string;
			};
		};
	};
	protect: {
		hereMapApiKey: string;
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
