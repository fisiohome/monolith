import type { TherapistUser } from "@/types/admin-portal/therapist";
import type { Auth } from "@/types/globals";
import { useMemo } from "react";

export interface UseActionPermissionsProps {
	authData: Auth;
	user: TherapistUser;
}
export const useActionPermissions = ({
	authData,
	user,
}: UseActionPermissionsProps) => {
	const currentUser = useMemo(
		() => authData.currentUser,
		[authData.currentUser],
	);

	const isCurrentUser = useMemo(
		() => currentUser?.user.email === user.email,
		[currentUser?.user.email, user.email],
	);

	const isShowEdit = useMemo(
		() => authData.currentUserType === "ADMIN" || isCurrentUser,
		[authData.currentUserType, isCurrentUser],
	);

	const isShowChangePassword = useMemo(
		() => isCurrentUser || authData.currentUserType === "ADMIN",
		[authData.currentUserType, isCurrentUser],
	);

	const isShowDelete = useMemo(
		() => !!currentUser?.["isSuperAdmin?"],
		[currentUser?.["isSuperAdmin?"]],
	);

	const isPermitted = useMemo(() => isShowEdit, [isShowEdit]);

	return {
		isCurrentUser,
		isShowEdit,
		isPermitted,
		isShowChangePassword,
		isShowDelete,
	};
};
