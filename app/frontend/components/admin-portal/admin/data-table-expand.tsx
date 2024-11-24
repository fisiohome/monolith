import { Button } from "@/components/ui/button";
import type { TableRowDataProps } from "@/pages/AdminPortal/Admin/Index";
import type { GlobalPageProps } from "@/types/globals";
import { usePage } from "@inertiajs/react";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns/format";
import { Ban, Fingerprint, Key, Pencil, Trash2 } from "lucide-react";
import { type ComponentProps, useMemo } from "react";
import { DeleteAdminAlert } from "./feature-actions";

interface ExpandSubTableProps extends ComponentProps<"div"> {
	row: TableRowDataProps;
	routeTo: {
		editAdmin: (id: number) => void;
		changePassword: (id: number) => void;
		suspendAdmin: (id: number) => void;
	};
}

export default function ExpandSubTable({ row, routeTo }: ExpandSubTableProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	const isCurrentUser = useMemo(
		() => globalProps.auth.currentUser?.user.email === row.original.user.email,
		[globalProps.auth.currentUser?.user.email, row.original.user.email],
	);
	const isShowDelete = useMemo(
		() => globalProps.auth.currentUser?.["isSuperAdmin?"] && !isCurrentUser,
		[isCurrentUser, globalProps.auth.currentUser],
	);
	const isShowEdit = useMemo(
		() => globalProps.auth.currentUser?.["isSuperAdmin?"] || isCurrentUser,
		[isCurrentUser, globalProps.auth.currentUser],
	);
	const isShowChangePassword = useMemo(
		() => !isCurrentUser && globalProps.auth.currentUser?.["isSuperAdmin?"],
		[isCurrentUser, globalProps.auth.currentUser],
	);
	const isShowSuspend = useMemo(
		() => !isCurrentUser && globalProps.auth.currentUser?.["isSuperAdmin?"],
		[isCurrentUser, globalProps.auth.currentUser],
	);

	return (
		<>
			<div className="grid w-full grid-cols-3 gap-4">
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Created Date</p>
					<p className="font-semibold">
						{format(row.original.createdAt, "PPP")}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Last updated</p>
					<p className="font-semibold">
						{formatDistanceToNow(row.original.updatedAt, {
							includeSeconds: true,
							addSuffix: true,
						})}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Last Sign In</p>
					<p className="font-semibold">
						{row?.original?.user?.lastSignInAt
							? formatDistanceToNow(row?.original?.user?.lastSignInAt, {
									includeSeconds: true,
									addSuffix: true,
								})
							: "-"}
					</p>
				</div>
				{globalProps.auth.currentUser?.["isSuperAdmin?"] && (
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Last IP</p>
						<p className="font-semibold">
							{row?.original?.user?.lastSignInIp || "-"}
						</p>
					</div>
				)}
				{globalProps.auth.currentUser?.["isSuperAdmin?"] &&
					row.original.user["isOnline?"] && (
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">Current IP</p>
							<p className="font-semibold">
								{row?.original?.user?.currentSignInIp || "-"}
							</p>
						</div>
					)}
			</div>

			<div className="flex items-center mt-6 space-x-2">
				{isShowEdit && (
					<Button
						variant="outline"
						onClick={() => routeTo.editAdmin(row.original.id)}
					>
						<Pencil />
						Edit
					</Button>
				)}

				{isShowChangePassword && (
					<Button
						variant="outline"
						onClick={() => routeTo.changePassword(row.original.id)}
					>
						<Fingerprint />
						Change Password
					</Button>
				)}

				{isShowSuspend && (
					<Button
						variant={
							row.original.user["suspended?"] ? "default" : "destructive"
						}
						onClick={() => routeTo.suspendAdmin(row.original.id)}
					>
						{row.original.user["suspended?"] ? <Key /> : <Ban />}
						{row.original.user["suspended?"] ? "Activate" : "Suspend"}
					</Button>
				)}

				{isShowDelete && (
					<DeleteAdminAlert row={row}>
						<Button variant="destructive">
							<Trash2 />
							Delete
						</Button>
					</DeleteAdminAlert>
				)}
			</div>
		</>
	);
}
