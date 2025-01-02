import { Button } from "@/components/ui/button";
import type { TableRowDataProps } from "@/pages/AdminPortal/Admin/Index";
import type { GlobalPageProps } from "@/types/globals";
import { usePage } from "@inertiajs/react";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns/format";
import {
	Ban,
	Fingerprint,
	InfinityIcon,
	Key,
	Pencil,
	Trash2,
} from "lucide-react";
import { DeleteAdminAlert } from "./feature-actions";
import { useActionPermissions } from "@/hooks/admin-portal/use-admin-utils";

interface ExpandSubTableProps {
	row: TableRowDataProps;
	routeTo: {
		editAdmin: (id: number) => void;
		changePassword: (id: number) => void;
		suspendAdmin: (id: number) => void;
	};
}

export default function ExpandSubTable({ row, routeTo }: ExpandSubTableProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	const { isShowEdit, isShowChangePassword, isShowSuspend, isShowDelete } =
		useActionPermissions({
			currentUser: globalProps.auth.currentUser,
			user: row.original.user,
		});

	return (
		<>
			<div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Join date</p>
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
					<p className="text-xs text-muted-foreground">Last sign-in</p>
					<p className="font-semibold">
						{row?.original?.user?.lastSignInAt
							? formatDistanceToNow(row?.original?.user?.lastSignInAt, {
									includeSeconds: true,
									addSuffix: true,
								})
							: "-"}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Last online session</p>
					<p className="font-semibold">
						{row?.original?.user?.lastOnlineAt
							? formatDistanceToNow(row?.original?.user?.lastOnlineAt, {
									includeSeconds: true,
									addSuffix: true,
								})
							: "-"}
					</p>
				</div>
				{globalProps.auth.currentUser?.["isSuperAdmin?"] && (
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Last IP Address</p>
						<p className="font-semibold">
							{row?.original?.user?.lastSignInIp || "-"}
						</p>
					</div>
				)}
				{globalProps.auth.currentUser?.["isSuperAdmin?"] &&
					row.original.user["isOnline?"] && (
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">
								Current IP Address
							</p>
							<p className="font-semibold">
								{row?.original?.user?.currentSignInIp || "-"}
							</p>
						</div>
					)}
				{row.original.user["suspended?"] && (
					<>
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">Suspend on</p>
							<p className="font-semibold">
								{row?.original?.user?.suspendAt
									? format(row.original.user.suspendAt, "PP")
									: "-"}
							</p>
						</div>

						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">Suspend until</p>
							<p className="font-semibold">
								{row?.original?.user?.suspendEnd ? (
									format(row.original.user.suspendEnd, "PP")
								) : (
									<InfinityIcon className="size-4" />
								)}
							</p>
						</div>
					</>
				)}
			</div>

			<div className="grid items-center gap-2 mt-6 lg:flex">
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
