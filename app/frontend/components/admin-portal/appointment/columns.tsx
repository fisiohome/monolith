import { router, usePage } from "@inertiajs/react";
import type { ColumnDef, Row, Table } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	Activity,
	Ban,
	Cctv,
	ChevronDown,
	ChevronUp,
	Clock3,
	Copy,
	Hash,
	MapPinIcon,
	MoreHorizontal,
	Stethoscope,
	User,
} from "lucide-react";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDateContext } from "@/components/providers/date-provider";
import DotBadgeWithLabel from "@/components/shared/dot-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDotVariantStatus } from "@/lib/appointments/utils";
import { getBrandBadgeVariant } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { AppointmentIndexGlobalPageProps } from "@/pages/AdminPortal/Appointment/Index";
import type { Appointment } from "@/types/admin-portal/appointment";
import { getPermission } from "./details/action-buttons";

const ExpanderHeader = memo(({ table }: { table: Table<Appointment> }) => (
	<Button
		variant="ghost"
		size="icon"
		className="rounded-full"
		onClick={() => table.toggleAllRowsExpanded()}
	>
		{table.getIsAllRowsExpanded() ? (
			<ChevronUp className="size-4" />
		) : (
			<ChevronDown className="size-4" />
		)}
	</Button>
));

const ExpanderCell = memo(({ row }: { row: Row<Appointment> }) =>
	row.getCanExpand() ? (
		<Button
			variant="ghost"
			size="icon"
			className="rounded-full"
			onClick={row.getToggleExpandedHandler()}
		>
			{row.getIsExpanded() ? (
				<ChevronUp className="size-4" />
			) : (
				<ChevronDown className="size-4" />
			)}
		</Button>
	) : null,
);

const RegistrationNumberCell = memo(({ row }: { row: Row<Appointment> }) => (
	<div className="flex flex-col items-center gap-2">
		<Badge
			variant="outline"
			className={cn(
				"text-pretty font-bold",
				row.original?.service?.code &&
					getBrandBadgeVariant(row.original.service.code),
			)}
		>
			<Hash className="size-3" />
			<span className="text-nowrap">{row.original.registrationNumber}</span>
		</Badge>
	</div>
));

const AppointmentDateTimeCell = memo(({ row }: { row: Row<Appointment> }) => {
	const { locale, tzDate } = useDateContext();
	const apptDate = row.original.appointmentDateTime;
	const date = useMemo(
		() =>
			format(new Date(apptDate), "PPPP", {
				locale,
				...(tzDate && { timeZone: tzDate }),
			}),
		[apptDate, locale, tzDate],
	);
	const time = useMemo(
		() =>
			format(new Date(apptDate), "p", {
				locale,
				...(tzDate && { timeZone: tzDate }),
			}),
		[apptDate, locale, tzDate],
	);

	if (!apptDate) return "N/A";
	return (
		<div>
			<p title={date} className="font-semibold line-clamp-1">
				{date}
			</p>
			<p className="line-clamp-1">{time}</p>
		</div>
	);
});

const StatusCell = memo(({ row }: { row: Row<Appointment> }) => {
	const { t } = useTranslation("appointments");
	const status = row.original.status;
	const statusDotVariant = getDotVariantStatus(status);

	return (
		<div className="relative">
			<DotBadgeWithLabel
				size="xs"
				className="relative flex-shrink-0 text-left"
				variant={statusDotVariant}
			>
				<span
					title={t(`statuses.${status}`)}
					className="tracking-wide line-clamp-1"
				>
					{t(`statuses.${status}`)}
				</span>
			</DotBadgeWithLabel>
		</div>
	);
});

const PatientCell = memo(({ row }: { row: Row<Appointment> }) => {
	const { t } = useTranslation("appointments");
	const patient = row.original.patient;
	if (!patient) return <p className="uppercase">N/A</p>;

	const { name, gender, age, contact } = patient;

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center gap-2 max-w-[125px]">
						<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
							<AvatarFallback>
								<User className="flex-shrink-0 size-4 text-muted-foreground/75" />
							</AvatarFallback>
						</Avatar>
						<p title={name} className="uppercase line-clamp-1">
							{name}
						</p>
					</div>
				</TooltipTrigger>
				<TooltipContent className="py-3">
					<ul className="grid grid-cols-2 gap-3 text-xs">
						<li className="grid gap-0.5">
							<span className="font-light">{t("list.gender")}</span>
							<span className="font-medium">{gender || "N/A"}</span>
						</li>
						<li className="grid gap-0.5">
							<span className="font-light">{t("list.age")}</span>
							<span className="font-medium">
								{age || "N/A"} {age && t("list.years")}
							</span>
						</li>
						<li className="grid gap-0.5">
							<span className="font-light">{t("list.contact_name")}</span>
							<span className="font-medium">
								{contact?.contactName || "N/A"}
							</span>
						</li>
						<li className="grid gap-0.5">
							<span className="font-light">{t("list.contact_phone")}</span>
							<span className="font-medium">
								{contact?.contactPhone || "N/A"}
							</span>
						</li>
					</ul>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
});

const TherapistCell = memo(({ row }: { row: Row<Appointment> }) => {
	const { t } = useTranslation("appointments");
	const therapist = row.original.therapist;
	if (!therapist) return <p className="uppercase">N/A</p>;

	const { name, gender, employmentType } = therapist;

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center gap-2 max-w-[125px]">
						<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
							<AvatarFallback>
								<Stethoscope className="flex-shrink-0 size-4 text-muted-foreground/75" />
							</AvatarFallback>
						</Avatar>
						<p title={name} className="uppercase line-clamp-1">
							{name}
						</p>
					</div>
				</TooltipTrigger>
				<TooltipContent className="py-3">
					<ul className="grid gap-3 text-xs">
						<li className="grid gap-0.5">
							<span className="font-light">{t("list.gender")}</span>
							<span className="font-medium">{gender || "N/A"}</span>
						</li>
						<li className="grid gap-0.5">
							<span className="font-light">{t("list.emp_type")}</span>
							<span className="font-medium">{employmentType || "N/A"}</span>
						</li>
					</ul>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
});

const ServiceCell = memo(({ row }: { row: Row<Appointment> }) => {
	const { service, package: servicePackage } = row.original;
	if (!service || !servicePackage) return null;

	const serviceName = service.name.replaceAll("_", " ");
	const packageName = servicePackage.name || "N/A";
	const visitLabel = `${servicePackage.numberOfVisit} visit(s)`;

	return (
		<div title={serviceName}>
			<p className="font-semibold line-clamp-1">{serviceName}</p>
			<p className="line-clamp-1">
				<span>{packageName}</span>
				<span className="mx-0.5">-</span>
				<span className="italic">{visitLabel}</span>
			</p>
		</div>
	);
});

const LocationCell = memo(({ row }: { row: Row<Appointment> }) => {
	const location = row.original.location;
	if (!location) return <p className="font-semibold uppercase">N/A</p>;

	const { city, state, country } = location;

	return (
		<div title={city}>
			<p className="font-semibold line-clamp-1">{city}</p>
			<p className="line-clamp-1">
				{state}, {country}
			</p>
		</div>
	);
});

const VisitNoCell = memo(({ row }: { row: Row<Appointment> }) => {
	const visitProgress = row.original.visitProgress || "N/A";

	return (
		<div>
			<p className="line-clamp-1 font-semibold">Visit {visitProgress}</p>
		</div>
	);
});

const ActionsCell = memo(({ row }: { row: Row<Appointment> }) => {
	const appointment = row.original;
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const { auth } = globalProps;
	const isAdminPIC = useMemo(() => {
		const currentAccountId = auth.currentUser?.id;

		return !!appointment.admins?.some((admin) => admin.id === currentAccountId);
	}, [auth.currentUser?.id, appointment.admins]);
	const isSuperAdmin = useMemo(
		() => !!auth.currentUser?.["isSuperAdmin?"],
		[auth.currentUser?.["isSuperAdmin?"]],
	);
	const isAdminSupervisor = useMemo(
		() => !!auth.currentUser?.["isAdminSupervisor?"],
		[auth.currentUser?.["isAdminSupervisor?"]],
	);

	const isShow = useMemo(() => {
		const updateStatus = getPermission.updateStatus(appointment);
		const cancel = getPermission.cancel(appointment);

		return { updateStatus, cancel };
	}, [appointment]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(appointment.registrationNumber);
			toast.success("Registration number copied to clipboard");
		} catch (error) {
			const message = "Failed to copy registration number";
			console.error(`${message}: ${error}`);
			toast.error(message);
		}
	};

	const routeTo = useMemo(
		() => ({
			cancel: (id: string) =>
				router.get(
					pageURL,
					{ cancel: id },
					{
						only: ["adminPortal", "flash", "errors", "selectedAppointment"],
						preserveScroll: true,
						preserveState: true,
					},
				),
			updatePic: (id: string) =>
				router.get(
					pageURL,
					{ update_pic: id },
					{
						only: [
							"adminPortal",
							"flash",
							"errors",
							"selectedAppointment",
							"optionsData",
						],
						preserveScroll: true,
						preserveState: true,
					},
				),
			updateStatus: (id: string) =>
				router.get(
					pageURL,
					{ update_status: id },
					{
						only: [
							"adminPortal",
							"flash",
							"errors",
							"selectedAppointment",
							"optionsData",
						],
						preserveScroll: true,
						preserveState: true,
					},
				),
			reschedule: (id: string) => {
				const url = `${globalProps.adminPortal.router.adminPortal.appointment.index}/${id}/reschedule`;
				router.visit(url);
			},
		}),
		[pageURL, globalProps.adminPortal.router.adminPortal.appointment.index],
	);

	const canShowActions =
		(isSuperAdmin || isAdminPIC || isAdminSupervisor) &&
		appointment.status !== "cancelled";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<span className="sr-only">Open menu</span>
					<MoreHorizontal className="w-4 h-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Copy className="opacity-60" aria-hidden="true" />
							Copy
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								<DropdownMenuItem onSelect={handleCopy}>
									Reg. Number
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>
					<DropdownMenuItem
						onSelect={() => {
							window.open(
								`https://www.google.com/maps/search/?api=1&query=${appointment?.visitAddress?.coordinates.y},${appointment.visitAddress?.coordinates.x}`,
							);
						}}
						disabled={!appointment?.visitAddress?.coordinates}
					>
						<MapPinIcon className="opacity-60" aria-hidden="true" />
						View on Google Maps
					</DropdownMenuItem>
				</DropdownMenuGroup>
				{canShowActions && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								onSelect={() => routeTo.reschedule(String(appointment.id))}
							>
								<Clock3 className="opacity-60" aria-hidden="true" />
								Reschedule
							</DropdownMenuItem>

							{isShow.updateStatus && (
								<DropdownMenuItem
									onSelect={() => routeTo.updateStatus(String(appointment.id))}
								>
									<Activity className="opacity-60" aria-hidden="true" />
									Update Status
								</DropdownMenuItem>
							)}

							<DropdownMenuItem
								onSelect={() => routeTo.updatePic(String(appointment.id))}
							>
								<Cctv className="opacity-60" aria-hidden="true" />
								Update PIC
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</>
				)}
				{canShowActions && isShow.cancel && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onSelect={() => routeTo.cancel(String(appointment.id))}
							>
								<Ban className="opacity-60" aria-hidden="true" />
								Cancel Booking
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
});

const getColumns = (): ColumnDef<Appointment>[] => [
	{
		id: "expander",
		enableHiding: false,
		header: ({ table }) => <ExpanderHeader table={table} />,
		cell: ({ row }) => <ExpanderCell row={row} />,
	},
	{
		accessorKey: "registrationNumber",
		header: "Reg. No.",
		cell: ({ row }) => <RegistrationNumberCell row={row} />,
	},
	{
		accessorKey: "visitNumber",
		enableHiding: false,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Visit No." />
		),
		cell: ({ row }) => <VisitNoCell row={row} />,
	},
	{
		accessorKey: "appointmentDateTime",
		enableHiding: false,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Visit Date Time" />
		),
		cell: ({ row }) => <AppointmentDateTimeCell row={row} />,
	},
	{
		accessorKey: "status",
		enableHiding: false,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Status" />
		),
		cell: ({ row }) => <StatusCell row={row} />,
	},
	{
		accessorKey: "patient.name",
		enableHiding: false,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Patient" />
		),
		cell: ({ row }) => <PatientCell row={row} />,
	},
	{
		accessorKey: "therapist.name",
		enableHiding: false,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Therapist" />
		),
		cell: ({ row }) => <TherapistCell row={row} />,
	},
	{
		accessorKey: "service.name",
		enableHiding: false,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Service" />
		),
		cell: ({ row }) => <ServiceCell row={row} />,
	},
	{
		accessorKey: "location.city",
		enableHiding: false,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Location" />
		),
		cell: ({ row }) => <LocationCell row={row} />,
	},
	{
		id: "actions",
		cell: ({ row }) => <ActionsCell row={row} />,
	},
];

export default getColumns;
