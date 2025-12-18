import { useMemo } from "react";
import type { Admin } from "@/types/admin-portal/admin";
import type { Auth } from "@/types/globals";

export interface UseActionPermissionsProps {
	currentUser: Auth["currentUser"];
	user: Admin["user"];
	adminType: Admin["adminType"];
}
export const useActionPermissions = ({
	currentUser,
	user,
	adminType,
}: UseActionPermissionsProps) => {
	// Check if the user being acted upon is the same as the currently logged-in user
	const isCurrentUser = useMemo(
		() => currentUser?.user.email === user.email,
		[currentUser?.user.email, user.email],
	);

	// check is it both current user and the admin data are admin supervisor?
	const isBothSupervisor = useMemo(
		() =>
			currentUser?.["isAdminSupervisor?"] && adminType === "ADMIN_SUPERVISOR",
		[currentUser, adminType],
	);

	// Show delete option only if the current user is a super admin and is not deleting themselves
	const isShowDelete = useMemo(
		() => !!currentUser?.["isSuperAdmin?"] && !isCurrentUser,
		[currentUser?.["isSuperAdmin?"], isCurrentUser],
	);

	// Show edit option if the current user is a super admin, admin supervisor, or editing themselves
	const isShowEdit = useMemo(
		() =>
			!!currentUser?.["isSuperAdmin?"] ||
			!!currentUser?.["isAdminSupervisor?"] ||
			isCurrentUser,
		[currentUser, isCurrentUser],
	);

	// Show change password option if the user is not editing themselves and is either a super admin or admin supervisor
	const isShowChangePassword = useMemo(
		() =>
			!isCurrentUser &&
			(!!currentUser?.["isSuperAdmin?"] ||
				!!currentUser?.["isAdminSupervisor?"]),
		[currentUser, isCurrentUser],
	);

	// Show suspend option under the same condition as change password: user must not be acting on themselves, and must be a super admin or admin supervisor
	const isShowSuspend = useMemo(
		() =>
			!isCurrentUser &&
			(!!currentUser?.["isSuperAdmin?"] ||
				!!currentUser?.["isAdminSupervisor?"]),
		[currentUser, isCurrentUser],
	);

	// Determine if any action is permitted at all (used as a general flag)
	const isPermitted = useMemo(() => {
		// supervisor only have permission to manage admin data
		if (currentUser?.["isAdminSupervisor?"] && adminType === "SUPER_ADMIN")
			return false;

		return (
			(isShowDelete || isShowEdit || isShowChangePassword || isShowSuspend) &&
			!isBothSupervisor
		);
	}, [
		isShowDelete,
		isShowEdit,
		isShowChangePassword,
		isShowSuspend,
		isBothSupervisor,
		currentUser,
		adminType,
	]);

	return {
		isCurrentUser,
		isShowDelete,
		isShowEdit,
		isShowChangePassword,
		isShowSuspend,
		isPermitted,
	};
};
