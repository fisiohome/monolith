import { useMemo } from "react";
import type { UserSerialize } from "@/types/auth";
import type { Auth } from "@/types/globals";

export interface UseAuthProps {
	auth: Auth;
	user: UserSerialize;
}

export const useAuth = ({ user, auth }: UseAuthProps) => {
	const isAuthCurrentUser = useMemo(
		() => user.email === auth.currentUser?.user.email,
		[user.email, auth.currentUser?.user.email],
	);
	const isAuthAdmin = useMemo(
		() => auth.currentUserType === "ADMIN",
		[auth.currentUserType],
	);
	const isAuthSuperAdmin = useMemo(
		() => isAuthAdmin && auth.currentUser?.["isSuperAdmin?"],
		[isAuthAdmin, auth.currentUser?.["isSuperAdmin?"]],
	);
	const isAuthAdminSupervisor = useMemo(
		() => isAuthAdmin && auth.currentUser?.["isAdminSupervisor?"],
		[isAuthAdmin, auth.currentUser?.["isAdminSupervisor?"]],
	);
	const isAuthTherapist = useMemo(
		() => auth.currentUserType === "THERAPIST",
		[auth.currentUserType],
	);

	return {
		isAuthCurrentUser,
		isAuthAdmin,
		isAuthTherapist,
		isAuthSuperAdmin,
		isAuthAdminSupervisor,
	};
};
