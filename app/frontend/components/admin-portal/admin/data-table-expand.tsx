import { Button } from "@/components/ui/button";
import { useActionPermissions } from "@/hooks/admin-portal/use-admin-utils";
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
import { useMemo } from "react";
import { DeleteAdminAlert } from "./feature-actions";

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
			adminType: row.original.adminType,
		});

	const cards = useMemo(() => {
		const data: { title: string; value: string | JSX.Element }[] = [
			{
				title: "Join date",
				value: format(row.original.createdAt, "PPP"),
			},
			{
				title: "Last updated",
				value: formatDistanceToNow(row.original.updatedAt, {
					includeSeconds: true,
					addSuffix: true,
				}),
			},
			{
				title: "Last sign-in",
				value: row?.original?.user?.lastSignInAt
					? formatDistanceToNow(row?.original?.user?.lastSignInAt, {
							includeSeconds: true,
							addSuffix: true,
						})
					: "-",
			},
			{
				title: "Last online session",
				value: row?.original?.user?.lastOnlineAt
					? formatDistanceToNow(row?.original?.user?.lastOnlineAt, {
							includeSeconds: true,
							addSuffix: true,
						})
					: "-",
			},
		];

		if (globalProps.auth.currentUser?.["isSuperAdmin?"]) {
			data.push({
				title: "Last IP Address",
				value: row?.original?.user?.lastSignInIp || "-",
			});

			if (row.original.user["isOnline?"]) {
				data.push({
					title: "Current IP Address",
					value: row?.original?.user?.currentSignInIp || "-",
				});
			}
		}

		if (row.original.user["suspended?"]) {
			data.push({
				title: "Suspend on",
				value: row?.original?.user?.suspendAt
					? format(row.original.user.suspendAt, "PP")
					: "-",
			});
			data.push({
				title: "Suspend until",
				value: row?.original?.user?.suspendEnd ? (
					format(row.original.user.suspendEnd, "PP")
				) : (
					<InfinityIcon className="size-4" />
				),
			});
		}

		return data;
	}, [row.original, globalProps.auth.currentUser?.["isSuperAdmin?"]]);

	return (
		<>
			<div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
				{cards.map((card) => (
					<div
						key={card.title}
						className="p-2 space-y-1 border bg-background border-border"
					>
						<p className="text-xs text-muted-foreground">{card.title}</p>
						<p className="font-semibold">{card.value}</p>
					</div>
				))}
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
