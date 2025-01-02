import type { Admin } from "@/types/admin-portal/admin";
import type { Auth } from "@/types/globals";
import { useMemo } from "react";

export interface UseActionPermissionsProps {
	currentUser: Auth["currentUser"];
	user: Admin["user"];
}
export const useActionPermissions = ({
	currentUser,
	user,
}: UseActionPermissionsProps) => {
	const isCurrentUser = useMemo(
		() => currentUser?.user.email === user.email,
		[currentUser?.user.email, user.email],
	);

	const isShowDelete = useMemo(
		() => !!currentUser?.["isSuperAdmin?"] && !isCurrentUser,
		[currentUser?.["isSuperAdmin?"], isCurrentUser],
	);

	const isShowEdit = useMemo(
		() => !!currentUser?.["isSuperAdmin?"] || isCurrentUser,
		[currentUser?.["isSuperAdmin?"], isCurrentUser],
	);

	const isShowChangePassword = useMemo(
		() => !isCurrentUser && !!currentUser?.["isSuperAdmin?"],
		[currentUser?.["isSuperAdmin?"], isCurrentUser],
	);

	const isShowSuspend = useMemo(
		() => !isCurrentUser && !!currentUser?.["isSuperAdmin?"],
		[currentUser?.["isSuperAdmin?"], isCurrentUser],
	);

	const isPermitted = useMemo(
		() => isShowDelete || isShowEdit || isShowChangePassword || isShowSuspend,
		[isShowDelete, isShowEdit, isShowChangePassword, isShowSuspend],
	);

	return {
		isCurrentUser,
		isShowDelete,
		isShowEdit,
		isShowChangePassword,
		isShowSuspend,
		isPermitted,
	};
};
