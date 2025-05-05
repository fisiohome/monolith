import type { ADMIN_TYPES } from "../../lib/constants";
import type { UserSerialize } from "../auth";
import type { Timestamp } from "../globals";

export type AdminTypes = typeof ADMIN_TYPES;
export type Admin = {
	id: number;
	adminType: AdminTypes[number];
	name: string;
	"isSuperAdmin?": boolean;
	"isAdmin?": boolean;
	"isAdminSupervisor?": boolean;
	user: UserSerialize;
} & Timestamp;
