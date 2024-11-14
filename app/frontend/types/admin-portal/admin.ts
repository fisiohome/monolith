import type { ADMIN_TYPES } from "../../lib/constants";
import type { User } from "../auth";

export type AdminTypes = typeof ADMIN_TYPES;
export type Admin = {
	id: number;
	adminType: AdminTypes[number];
	name: string;
	createdAt: string;
	updatedAt: string;
	user: User;
};
