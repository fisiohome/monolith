import type { ADMIN_TYPES } from "../../lib/constants";
import type { User } from "../auth";

export type AdminTypes = typeof ADMIN_TYPES;
export type Admin = {
	id: number;
	adminType: AdminTypes[number];
	name: string;
	createdAt: string;
	updatedAt: string;
	"isSuperAdmin?": boolean;
	"isAdminL1?": boolean;
	"isAdminL12?": boolean;
	"isAdminL13?": boolean;
	"isAdminBacklog?": boolean;
	user: Pick<
		User,
		| "id"
		| "email"
		| "isOnline?"
		| "lastOnlineAt"
		| "lastSignInAt"
		| "currentSignInIp"
		| "lastSignInIp"
		| "suspendAt"
		| "suspendEnd"
		| "suspended?"
	>;
};
