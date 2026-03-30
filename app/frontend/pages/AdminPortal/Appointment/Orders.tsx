import { Deferred, Head, Link, router, usePage } from "@inertiajs/react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
	ActivityIcon,
	BanIcon,
	BanknoteIcon,
	CctvIcon,
	CheckIcon,
	Clock3Icon,
	CopyIcon,
	DownloadIcon,
	ExternalLinkIcon,
	EyeIcon,
	MailIcon,
	MapPinIcon,
	MoreHorizontalIcon,
	SearchIcon,
	XIcon,
} from "lucide-react";
import { startTransition, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ApptViewChanger from "@/components/admin-portal/appointment/appt-view-changer";
import { getPermission } from "@/components/admin-portal/appointment/details/action-buttons";
import {
	FeedbackReminderDialog,
	UpdatePaymentForm,
	UpdatePICForm,
	UpdateStatusForm,
} from "@/components/admin-portal/appointment/feature-form";
import ApptPagination from "@/components/admin-portal/appointment/pagination-list";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn, debounce, populateQueryParams } from "@/lib/utils";
import type { Admin } from "@/types/admin-portal/admin";
import type {
	Appointment,
	AppointmentStatuses,
	OrderPaymentStatuses,
} from "@/types/admin-portal/appointment";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderRow {
	id: string;
	registrationNumber: string;
	patientId: string;
	patientName: string | null;
	packageName: string | null;
	serviceName: string | null;
	numberOfVisit: number | null;
	totalAmount: number;
	paidAmount: number;
	remainingAmount: number;
	paymentStatus: string;
	status: string;
	invoiceNumber: string | null;
	invoiceUrl: string | null;
	createdAt: string;
	therapistId: string | null;
	firstAppointmentId: string | null;
	appointments: {
		id: Appointment["id"];
		visitNumber: Appointment["visitNumber"];
		totalPackageVisits: Appointment["totalPackageVisits"];
		status: Appointment["status"];
	}[];
	latitude: number | null;
	longitude: number | null;
}

interface OrderDetail {
	id: string;
	registrationNumber: string;
	bookingDraftId: string | null;
	patientId: string;
	packageId: number;
	packageBasePrice: number;
	subtotal: number;
	discountType: string | null;
	discountValue: number;
	discountAmount: number;
	voucherCode: string | null;
	taxPercentage: number;
	taxAmount: number;
	totalAmount: number;
	paidAmount: number;
	remainingAmount: number;
	paymentStatus: string;
	invoiceNumber: string | null;
	invoiceUrl: string | null;
	invoiceDueDate: string | null;
	status: string;
	specialNotes: string | null;
	cancellationReason: string | null;
	cancelledAt: string | null;
	cancelledBy: string | null;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
	patient: {
		id: string;
		name: string;
		gender: string;
		dateOfBirth: string;
	} | null;
	package: {
		id: number;
		name: string;
		numberOfVisit: number;
		totalPrice: number;
		currency: string;
	} | null;
	appointments: {
		id: string;
		registrationNumber: string;
		visitNumber: number;
		status: string;
		appointmentDateTime: string | null;
		therapistName: string | null;
		serviceName: string | null;
		locationCity: string | null;
	}[];
}

interface OrdersPageProps {
	orders?: {
		data: OrderRow[];
		metadata: Metadata;
	};
	selectedOrder?: OrderDetail;
	selectedAppointment?: Appointment;
	optionsData?: {
		admins: Admin[];
		statuses: {
			key: keyof typeof AppointmentStatuses;
			value: AppointmentStatuses;
		}[];
		paymentStatuses: {
			label: OrderPaymentStatuses;
			value: OrderPaymentStatuses;
		}[];
	};
}

export interface OrdersGlobalPageProps
	extends BaseGlobalPageProps,
		OrdersPageProps {
	[key: string]: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_STYLES: Record<string, string> = {
	UNPAID: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100/80",
	PARTIALLY_PAID:
		"bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100/80",
	PAID: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80",
	OVERPAID: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100/80",
	REFUNDED:
		"bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100/80",
};

const ORDER_STATUS_STYLES: Record<string, string> = {
	DRAFT: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100/80",
	PENDING_PAYMENT:
		"bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100/80",
	PARTIALLY_PAID:
		"bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100/80",
	PAID: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80",
	SCHEDULED: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100/80",
	IN_PROGRESS:
		"bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100/80",
	COMPLETED:
		"bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80",
	CANCELLED: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100/80",
	REFUNDED:
		"bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100/80",
};

const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
	CANCELLED: "bg-red-100 text-red-700 hover:bg-red-100/80",
	UNSCHEDULED: "bg-slate-100 text-slate-600 hover:bg-slate-100/80",
	"ON HOLD": "bg-amber-100 text-amber-700 hover:bg-amber-100/80",
	"PENDING THERAPIST ASSIGNMENT":
		"bg-orange-100 text-orange-700 hover:bg-orange-100/80",
	"PENDING PATIENT APPROVAL":
		"bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80",
	"PENDING PAYMENT": "bg-amber-100 text-amber-700 hover:bg-amber-100/80",
	PAID: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80",
	COMPLETED: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80",
	SCHEDULED: "bg-blue-100 text-blue-700 hover:bg-blue-100/80",
};

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatDate(dateString: string): string {
	return format(new Date(dateString), "dd MMM yyyy", { locale: idLocale });
}

function formatDateTime(dateString: string): string {
	return format(new Date(dateString), "dd MMM yyyy, HH:mm", {
		locale: idLocale,
	});
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const OrderActionsCell = ({
	row,
	onOpenDetail,
	onOpenFeedbackDialog,
}: {
	row: Row<OrderRow>;
	onOpenDetail: (id: string) => void;
	onOpenFeedbackDialog: (orderId: string, registrationNumber: string) => void;
}) => {
	const order = row.original;
	const { props: globalProps, url: pageURL } = usePage<OrdersGlobalPageProps>();
	const { t: tappt } = useTranslation("appointments", {
		useSuspense: false,
	});

	const permission = useMemo(() => {
		const isOrderCancelled = order.status === "CANCELLED";
		const isOrderRefunded = order.status === "REFUNDED";
		const isOrderCompleted = order.status === "COMPLETED";
		const markOrderDone =
			isOrderCancelled || isOrderRefunded || isOrderCompleted;

		const allAppointmentsCompleted =
			order.appointments?.length > 0 &&
			order.appointments.every((appt) => appt.status === "completed");

		return {
			cannotUpdatePic: !order.firstAppointmentId,
			cannotReschedule: !order.appointments?.length || markOrderDone,
			cannotUpdateStatus: !order.appointments?.length || markOrderDone,
			cannotCancelBooking: !order.firstAppointmentId || markOrderDone,
			cannotUpdatePayment: !order.appointments?.length || markOrderDone,
			cannotSendFeedbackReminder: !allAppointmentsCompleted,
		};
	}, [order.appointments, order.firstAppointmentId, order.status]);

	const handleCopy = useCallback(async (value: string, label: string) => {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(`${label} copied to clipboard`);
		} catch (error) {
			const message = `Failed to copy ${label.toLowerCase()}`;
			console.error(`${message}: ${error}`);
			toast.error(message);
		}
	}, []);

	const onCopyRegNumber = useCallback(() => {
		handleCopy(order.registrationNumber, "Registration number");
	}, [order.registrationNumber, handleCopy]);

	const onCopyInvoiceNumber = useCallback(() => {
		if (!order.invoiceNumber) {
			toast.error("Invoice number unavailable");
			return;
		}
		handleCopy(order.invoiceNumber, "Invoice number");
	}, [order.invoiceNumber, handleCopy]);

	const onCopyInvoiceUrl = useCallback(() => {
		if (!order.invoiceUrl) {
			toast.error("Invoice URL unavailable");
			return;
		}
		handleCopy(order.invoiceUrl, "Invoice URL");
	}, [order.invoiceUrl, handleCopy]);

	const onCopyPatientId = useCallback(() => {
		if (!order.patientId) {
			toast.error("Patient ID unavailable");
			return;
		}
		handleCopy(order.patientId, "Patient ID");
	}, [order.patientId, handleCopy]);

	const onCopyTherapistId = useCallback(() => {
		if (!order.therapistId) {
			toast.error("Therapist ID unavailable");
			return;
		}
		handleCopy(order.therapistId, "Therapist ID");
	}, [order.therapistId, handleCopy]);

	// for download soap report
	const onDownloadSoapReport = useCallback(
		async (appointmentId: string, visitNumber: number, totalVisits: number) => {
			try {
				const url = `/admin-portal/appointments/${appointmentId}/soap-report`;
				window.open(url, "_blank", "noopener,noreferrer");
				toast.success(`Downloading SOAP Visit ${visitNumber}/${totalVisits}`);
			} catch (error) {
				const message = `Failed to download SOAP report`;
				console.error(`${message}: ${error}`);
				toast.error(message);
			}
		},
		[],
	);

	const onDownloadSoapFinal = useCallback(async () => {
		// Find the last appointment (highest visit number)
		if (!order.appointments || order.appointments.length === 0) {
			toast.error("No appointments found");
			return;
		}

		const lastAppointment = order.appointments.reduce((last, current) =>
			current.visitNumber > last.visitNumber ? current : last,
		);

		try {
			const url = `/admin-portal/appointments/${lastAppointment.id}/soap-report-final`;
			window.open(url, "_blank", "noopener,noreferrer");
			toast.success("Downloading Final SOAP Report");
		} catch (error) {
			const message = `Failed to download Final SOAP report`;
			console.error(`${message}: ${error}`);
			toast.error(message);
		}
	}, [order.appointments]);

	const onViewOnGoogleMaps = useCallback(() => {
		if (!order.latitude || !order.longitude) {
			toast.error("Location unavailable");
			return;
		}
		window.open(
			`https://maps.google.com/?q=${order.latitude},${order.longitude}`,
			"_blank",
		);
	}, [order.latitude, order.longitude]);

	// for open the update pic form
	const openUpdatePicForm = useCallback(() => {
		if (order.firstAppointmentId) {
			router.get(
				pageURL,
				{ update_pic: order.firstAppointmentId },
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
			);
		} else {
			toast.error("Appointment ID unavailable");
		}
	}, [order.firstAppointmentId, pageURL]);

	// for open the update payment form
	const openUpdatePayment = useCallback(() => {
		const { fullUrl } = populateQueryParams(pageURL, {
			update_payment: order.id,
			selected_order: order.id,
		});
		startTransition(() => {
			router.get(
				fullUrl,
				{},
				{
					only: [
						"adminPortal",
						"flash",
						"errors",
						"selectedOrder",
						"optionsData",
					],
					preserveScroll: true,
					preserveState: true,
					replace: false,
				},
			);
		});
	}, [order.id, pageURL]);

	// for open the reschedule page
	const openReschedulePage = useCallback(
		(id: string) => {
			if (id) {
				router.visit(
					`${globalProps.adminPortal.router.adminPortal.appointment.index}/${id}/reschedule`,
				);
			} else {
				toast.error("Appointment ID unavailable");
			}
		},
		[globalProps.adminPortal.router.adminPortal.appointment.index],
	);

	// for open the update status page
	const openUpdateStatusPage = useCallback(
		(id: string) => {
			if (id) {
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
						replace: false,
					},
				);
			} else {
				toast.error("Appointment ID unavailable");
			}
		},
		[pageURL],
	);

	// for open the cancel appointment modal
	const openCancelPage = useCallback(
		(id: string) => {
			if (id) {
				router.get(
					pageURL,
					{ cancel: id },
					{
						only: ["adminPortal", "flash", "errors", "selectedAppointment"],
						preserveScroll: true,
						preserveState: true,
					},
				);
			} else {
				toast.error("Appointment ID unavailable");
			}
		},
		[pageURL],
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="size-8">
					<span className="sr-only">{tappt("button.order_actions.label")}</span>
					<MoreHorizontalIcon className="w-4 h-4" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							onOpenDetail(order.id);
						}}
					>
						<EyeIcon className="opacity-60" aria-hidden="true" />
						{tappt("button.order_actions.menus.view_details")}
					</DropdownMenuItem>

					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							onViewOnGoogleMaps();
						}}
						disabled={!order.latitude || !order.longitude}
					>
						<MapPinIcon className="opacity-60" aria-hidden="true" />
						{tappt("button.order_actions.menus.view_on_google_maps")}
					</DropdownMenuItem>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<CopyIcon className="opacity-60" aria-hidden="true" />
							{tappt("button.order_actions.menus.copy.label")}
						</DropdownMenuSubTrigger>

						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								<DropdownMenuItem
									onSelect={onCopyInvoiceUrl}
									disabled={!order.invoiceUrl}
								>
									{tappt("button.order_actions.menus.copy.invoice_url")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={onCopyRegNumber}
									disabled={!order.registrationNumber}
								>
									{tappt("button.order_actions.menus.copy.appt_reg_number")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={onCopyInvoiceNumber}
									disabled={!order.invoiceNumber}
								>
									{tappt("button.order_actions.menus.copy.invoice_number")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={onCopyPatientId}
									disabled={!order.patientId}
								>
									{tappt("button.order_actions.menus.copy.patient_id")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={onCopyTherapistId}
									disabled={!order.therapistId}
								>
									{tappt("button.order_actions.menus.copy.therapist_id")}
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={!order.appointments?.length}>
							<DownloadIcon className="opacity-60" aria-hidden="true" />
							{tappt("button.order_actions.menus.download.soap")}
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								{order.appointments?.map((appt) => (
									<DropdownMenuItem
										key={appt.id}
										onSelect={() => {
											onDownloadSoapReport(
												appt.id,
												appt.visitNumber,
												appt.totalPackageVisits,
											);
										}}
									>
										Visit {appt.visitNumber}/{appt.totalPackageVisits}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>

					<DropdownMenuItem
						onSelect={() => {
							onDownloadSoapFinal();
						}}
					>
						<DownloadIcon className="opacity-60" aria-hidden="true" />
						{tappt("button.order_actions.menus.download.final_soap")}
					</DropdownMenuItem>

					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							onOpenFeedbackDialog(order.id, order.registrationNumber);
						}}
						disabled={permission.cannotSendFeedbackReminder}
					>
						<MailIcon className="opacity-60" aria-hidden="true" />
						Send Feedback Reminder
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							openUpdatePicForm();
						}}
						disabled={permission.cannotUpdatePic}
					>
						<CctvIcon className="opacity-60" aria-hidden="true" />
						{tappt("button.update_pic")}
					</DropdownMenuItem>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={permission.cannotReschedule}>
							<Clock3Icon className="opacity-60" aria-hidden="true" />
							{tappt("button.reschedule")}
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								{order.appointments?.map((appt) => (
									<DropdownMenuItem
										key={appt.id}
										onSelect={(e) => {
											e.preventDefault();
											openReschedulePage(appt.id);
										}}
										disabled={!getPermission.reschedule(appt as Appointment)}
									>
										Visit {appt.visitNumber}/{appt.totalPackageVisits}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={permission.cannotUpdateStatus}>
							<ActivityIcon className="opacity-60" aria-hidden="true" />
							{tappt("button.update_status")}
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								{order.appointments?.map((appt) => (
									<DropdownMenuItem
										key={appt.id}
										onSelect={(e) => {
											e.preventDefault();
											openUpdateStatusPage(appt.id);
										}}
										disabled={!getPermission.updateStatus(appt as Appointment)}
									>
										Visit {appt.visitNumber}/{appt.totalPackageVisits}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>

					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							openUpdatePayment();
						}}
						disabled={permission.cannotUpdatePayment}
					>
						<BanknoteIcon className="opacity-60" aria-hidden="true" />
						{tappt("button.update_payment")}
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onSelect={(e) => {
							e.preventDefault();
							if (order.firstAppointmentId) {
								openCancelPage(order.firstAppointmentId);
							}
						}}
						disabled={permission.cannotCancelBooking}
					>
						<BanIcon className="opacity-60" aria-hidden="true" />
						{tappt("button.cancel_booking")}
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

const orderColumns = ({
	pageURL,
	openOrderDetail,
	onOpenFeedbackDialog,
}: {
	pageURL: string;
	openOrderDetail: (orderId: string) => void;
	onOpenFeedbackDialog: (orderId: string, registrationNumber: string) => void;
}): ColumnDef<OrderRow>[] => [
	{
		accessorKey: "registrationNumber",
		header: "Reg. No",
		meta: {
			headerClassName: "sticky left-0 z-10 bg-card",
			cellClassName: "sticky left-0 z-10 bg-card",
		},
		cell: ({ row }) => {
			const { fullUrl } = populateQueryParams(pageURL, {
				view_order: row.original.id,
			});

			return (
				<div>
					<Link
						href={fullUrl}
						preserveScroll
						preserveState
						only={["adminPortal", "flash", "errors", "selectedOrder"]}
					>
						<span className="font-mono text-sm font-bold text-nowrap text-primary hover:underline">
							{row.original.registrationNumber}
						</span>
					</Link>
				</div>
			);
		},
	},
	{
		accessorKey: "patientName",
		header: "Patient",
		cell: ({ row }) => (
			<div className="max-w-[200px]">
				<span
					title={row.original.patientName || "—"}
					className="text-sm uppercase text-pretty"
				>
					{row.original.patientName || "—"}
				</span>
			</div>
		),
	},
	{
		accessorKey: "packageName",
		header: "Package",
		cell: ({ row }) => {
			const { serviceName, packageName, numberOfVisit } = row.original;
			const visitLabel =
				numberOfVisit && numberOfVisit > 0 ? ` - ${numberOfVisit} visits` : "";

			return (
				<div className="flex flex-col text-nowrap">
					<span className="text-sm">
						{serviceName?.replace(/_/g, " ") || "—"}
					</span>
					<span className="text-xs italic text-muted-foreground">
						{packageName || "—"}
						{visitLabel}
					</span>
				</div>
			);
		},
	},
	{
		accessorKey: "paymentStatus",
		header: () => <div className="text-center">Payment</div>,
		cell: ({ row }) => (
			<div className="flex items-center justify-center">
				<Badge
					className={cn(
						"text-[10px] border p-0 px-1 rounded-full font-bold",
						PAYMENT_STATUS_STYLES[row.original.paymentStatus] ||
							"bg-background hover:bg-background/80",
					)}
				>
					{row.original.paymentStatus.replace(/_/g, " ")}
				</Badge>
			</div>
		),
	},
	{
		accessorKey: "status",
		header: () => <div className="text-center">Status</div>,
		cell: ({ row }) => (
			<div className="flex items-center justify-center">
				<Badge
					className={cn(
						"text-[10px] border p-0 px-1 rounded-full font-bold",
						ORDER_STATUS_STYLES[row.original.status] ||
							"bg-background hover:bg-background/80",
					)}
				>
					{row.original.status.replace(/_/g, " ")}
				</Badge>
			</div>
		),
	},
	{
		accessorKey: "invoiceNumber",
		header: "Invoice",
		cell: ({ row }) => (
			<span className="select-all text-sm text-muted-foreground text-nowrap italic">
				{row.original.invoiceNumber || "—"}
			</span>
		),
	},
	{
		accessorKey: "createdAt",
		header: "Date",
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground text-nowrap">
				{formatDate(row.original.createdAt)}
			</span>
		),
	},
	{
		id: "actions",
		header: "",
		cell: ({ row }) => (
			<div className="flex justify-end">
				<OrderActionsCell
					row={row}
					onOpenDetail={openOrderDetail}
					onOpenFeedbackDialog={onOpenFeedbackDialog}
				/>
			</div>
		),
	},
];

// ─── Order Detail Dialog ──────────────────────────────────────────────────────

function OrderDetailContent({
	order,
	onClose,
}: {
	order: OrderDetail;
	onClose?: () => void;
}) {
	const { t: tappt } = useTranslation("appointments", {
		useSuspense: false,
	});

	return (
		<div className="space-y-4 px-1">
			{/* Overview */}
			<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
				<InfoItem
					label="Reg. Number"
					value={<CopyableValue value={order.registrationNumber} />}
				/>
				<InfoItem label="Patient" value={order.patient?.name || "—"} />
				<InfoItem
					label="Package"
					value={
						<div className="flex flex-col text-nowrap">
							<span className="text-sm font-semibold">
								{order.appointments?.[0]?.serviceName?.replace(/_/g, " ") ||
									"—"}
							</span>
							<span className="text-xs italic text-muted-foreground">
								{order.package?.name || "—"}
								{order.package?.numberOfVisit
									? ` - ${order.package.numberOfVisit} visits`
									: ""}
							</span>
						</div>
					}
				/>
			</div>

			<Separator />

			{/* Financial */}
			<div>
				<h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
					Financial
				</h4>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
					<InfoItem
						label="Payment Status"
						value={
							<Badge
								className={cn(
									"text-[10px] border p-0 px-1 rounded-full font-bold",
									PAYMENT_STATUS_STYLES[order.paymentStatus] ||
										"bg-background hover:bg-background/80",
								)}
							>
								{order.paymentStatus.replace(/_/g, " ")}
							</Badge>
						}
					/>
					{order.voucherCode && (
						<InfoItem
							label="Voucher"
							value={
								<a
									href={`/admin-portal/vouchers?code=${order.voucherCode}`}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold text-sm"
								>
									{order.voucherCode}
									<ExternalLinkIcon className="size-3" />
								</a>
							}
						/>
					)}
					<InfoItem
						label="Invoice"
						value={
							order.invoiceNumber ? (
								<CopyableValue value={order.invoiceNumber} />
							) : (
								"N/A"
							)
						}
					/>
					{order.invoiceDueDate && (
						<InfoItem
							label="Due Date"
							value={formatDate(order.invoiceDueDate)}
						/>
					)}
				</div>

				{/* Price Breakdown */}
				<div className="border rounded-lg overflow-hidden mt-3">
					<table className="w-full text-sm">
						<tbody>
							{order.packageBasePrice > 0 && (
								<tr className="border-b">
									<td className="px-3 py-1.5 text-muted-foreground">
										Base Price
									</td>
									<td className="px-3 py-1.5 text-right font-medium">
										{formatCurrency(order.packageBasePrice)}
									</td>
								</tr>
							)}
							{order.discountAmount > 0 && (
								<tr className="border-b">
									<td className="px-3 py-1.5 text-muted-foreground">
										Discount{" "}
										{order.discountType && (
											<span className="text-xs">({order.discountType})</span>
										)}
									</td>
									<td className="px-3 py-1.5 text-right font-medium text-red-600">
										-{formatCurrency(order.discountAmount)}
									</td>
								</tr>
							)}
							{order.taxAmount > 0 && (
								<tr className="border-b">
									<td className="px-3 py-1.5 text-muted-foreground">
										Tax ({order.taxPercentage}%)
									</td>
									<td className="px-3 py-1.5 text-right font-medium">
										{formatCurrency(order.taxAmount)}
									</td>
								</tr>
							)}
							<tr className="bg-muted/50 font-semibold">
								<td className="px-3 py-2">Total</td>
								<td className="px-3 py-2 text-right">
									{formatCurrency(order.totalAmount)}
								</td>
							</tr>
							{order.remainingAmount > 0 && (
								<tr>
									<td className="px-3 py-1.5 text-muted-foreground">
										Remaining
									</td>
									<td className="px-3 py-1.5 text-right font-medium text-amber-600">
										{formatCurrency(order.remainingAmount)}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<Separator />

			{/* Status & Timeline */}
			<div>
				<h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
					Status & Timeline
				</h4>
				<div className="grid grid-cols-3 gap-2">
					<InfoItem
						label="Order Status"
						value={
							<Badge
								className={cn(
									"text-[10px] border p-0 px-1 rounded-full font-bold",
									ORDER_STATUS_STYLES[order.status] ||
										"bg-background hover:bg-background/80",
								)}
							>
								{order.status.replace(/_/g, " ")}
							</Badge>
						}
					/>
					<InfoItem label="Created" value={formatDateTime(order.createdAt)} />
					{order.completedAt && (
						<InfoItem
							label="Completed"
							value={formatDateTime(order.completedAt)}
						/>
					)}
					{order.cancelledAt && (
						<InfoItem
							label="Cancelled"
							valueClassName=""
							value={
								<>
									<p className="font-semibold text-sm text-pretty leading-snug">
										{formatDateTime(order.cancelledAt)}
									</p>

									{order.cancelledBy && (
										<Badge
											variant="outline"
											className="text-[10px] italic border p-0 px-1 rounded-full font-bold bg-card"
										>
											By {order.cancelledBy}
										</Badge>
									)}
								</>
							}
						/>
					)}
				</div>
			</div>

			{order.specialNotes && (
				<InfoItem label="Special Notes" value={order.specialNotes} />
			)}

			{order.cancellationReason && (
				<InfoItem
					label="Cancellation Reason"
					value={order.cancellationReason}
					valueClassName="text-red-600"
				/>
			)}

			{/* Related Appointments */}
			{order.appointments.length > 0 && (
				<>
					<Separator />
					<div>
						<div className="flex items-center justify-between mb-2">
							<h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
								Appointments ({order.appointments.length})
							</h4>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-xs gap-1.5"
								onClick={() =>
									window.open(
										`/admin-portal/appointments?registration_number=${order.registrationNumber}`,
										"_blank",
									)
								}
							>
								See Details
								<ExternalLinkIcon className="size-3" />
							</Button>
						</div>
						<div className="border rounded-lg overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-xs py-2">Visit</TableHead>
										<TableHead className="text-xs py-2">Date</TableHead>
										<TableHead className="text-xs py-2">Therapist</TableHead>
										<TableHead className="text-xs py-2">Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{order.appointments.map((appt) => (
										<TableRow key={appt.id}>
											<TableCell className="py-1.5">
												<span className="font-medium text-sm">
													#{appt.visitNumber}
												</span>
											</TableCell>
											<TableCell className="py-1.5">
												<span className="text-sm text-muted-foreground text-nowrap">
													{appt.appointmentDateTime
														? formatDateTime(appt.appointmentDateTime)
														: "—"}
												</span>
											</TableCell>
											<TableCell className="py-1.5">
												<span className="text-sm">
													{appt.therapistName || "—"}
												</span>
											</TableCell>
											<TableCell className="py-1.5">
												<Badge
													className={cn(
														"text-[10px] border p-0 px-1 rounded-full font-bold",
														APPOINTMENT_STATUS_STYLES[
															appt.status.replaceAll("_", " ").toUpperCase()
														] || "bg-background hover:bg-background/80",
													)}
												>
													{tappt(`statuses.${appt.status}`)}
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
				</>
			)}

			{/* Close Button */}
			<div className="hidden md:flex justify-end pt-2">
				<Button variant="outline" size="sm" onClick={onClose}>
					Close
				</Button>
			</div>
		</div>
	);
}

function InfoItem({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value: React.ReactNode;
	valueClassName?: string;
}) {
	return (
		<div className="space-y-0.5 rounded-md bg-muted px-3 py-2">
			<p className="text-[11px] uppercase text-muted-foreground tracking-wide">
				{label}
			</p>
			{typeof value === "string" ? (
				<p
					className={cn(
						"font-semibold text-sm text-pretty leading-snug",
						valueClassName,
					)}
				>
					{value}
				</p>
			) : (
				<div className={valueClassName}>{value}</div>
			)}
		</div>
	);
}

function CopyableValue({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(value).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}, [value]);

	return (
		<span className="inline-flex items-center gap-1.5 font-semibold text-sm">
			{value}
			<button
				type="button"
				onClick={handleCopy}
				className="text-muted-foreground hover:text-foreground transition-colors"
			>
				{copied ? (
					<CheckIcon className="size-3.5 text-emerald-600" />
				) : (
					<CopyIcon className="size-3.5" />
				)}
			</button>
		</span>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_OPTIONS = [
	{ value: "all", label: "All Payment Status" },
	{ value: "UNPAID", label: "Unpaid" },
	{ value: "PARTIALLY_PAID", label: "Partially Paid" },
	{ value: "PAID", label: "Paid" },
	{ value: "OVERPAID", label: "Overpaid" },
	{ value: "REFUNDED", label: "Refunded" },
];

const ORDER_STATUS_OPTIONS = [
	{ value: "all", label: "All Order Status" },
	{ value: "DRAFT", label: "Draft" },
	{ value: "PENDING_PAYMENT", label: "Pending Payment" },
	{ value: "PARTIALLY_PAID", label: "Partially Paid" },
	{ value: "PAID", label: "Paid" },
	{ value: "SCHEDULED", label: "Scheduled" },
	{ value: "IN_PROGRESS", label: "In Progress" },
	{ value: "COMPLETED", label: "Completed" },
	{ value: "CANCELLED", label: "Cancelled" },
	{ value: "REFUNDED", label: "Refunded" },
];

export default function AppointmentOrders() {
	const { props: globalProps, url: pageURL } = usePage<OrdersGlobalPageProps>();

	// ── Filters ────────────────────────────────────────────────────────────
	const [filters, setFilters] = useState(() => {
		const q = globalProps?.adminPortal?.currentQuery;
		return {
			search: q?.search || "",
			paymentStatus: q?.paymentStatus || "all",
			status: q?.status || "all",
		};
	});

	const [isSearching, setIsSearching] = useState(false);

	const debouncedUpdate = useCallback(
		debounce((url: string) => {
			setIsSearching(true);
			startTransition(() => {
				router.get(
					url,
					{},
					{
						preserveScroll: true,
						preserveState: true,
						only: ["adminPortal", "flash", "errors", "orders"],
						onFinish: () => setIsSearching(false),
					},
				);
			});
		}, 300),
		[],
	);

	const handleFilterChange = useCallback(
		(field: keyof typeof filters, value: string) => {
			const next = { ...filters, [field]: value };
			setFilters(next);

			const { fullUrl } = populateQueryParams(
				pageURL,
				deepTransformKeysToSnakeCase({
					...next,
					paymentStatus:
						next.paymentStatus === "all" ? null : next.paymentStatus,
					status: next.status === "all" ? null : next.status,
					page: null,
				}),
			);
			debouncedUpdate(fullUrl);
		},
		[filters, pageURL, debouncedUpdate],
	);

	// ── Pagination ─────────────────────────────────────────────────────────
	const metadata = useMemo(
		() => globalProps?.orders?.metadata ?? null,
		[globalProps?.orders?.metadata],
	);

	const changePage = useCallback(
		(
			type: "prev" | "next" | "first" | "last" | "limit" | "page",
			value?: string,
		) => {
			if (!metadata) return;

			let url: string | undefined;
			switch (type) {
				case "prev":
					url = metadata.prevUrl;
					break;
				case "next":
					url = metadata.nextUrl;
					break;
				case "first":
					url = metadata.firstUrl;
					break;
				case "last":
					url = metadata.lastUrl;
					break;
				case "limit": {
					if (!value) return;
					const { fullUrl } = populateQueryParams(metadata.pageUrl, {
						limit: value,
					});
					url = fullUrl;
					break;
				}
				case "page": {
					if (!value) return;
					const { fullUrl } = populateQueryParams(metadata.pageUrl, {
						page: value,
					});
					url = fullUrl;
					break;
				}
			}

			if (!url) return;

			startTransition(() => {
				router.get(
					url,
					{},
					{
						preserveScroll: false,
						preserveState: true,
						only: ["adminPortal", "flash", "errors", "orders"],
					},
				);
			});
		},
		[metadata],
	);

	// ── Dialogs ─────────────────────────────────────────
	const dialogMode = useMemo(() => {
		const q = globalProps.adminPortal?.currentQuery;
		return {
			viewOrder: !!q?.viewOrder,
			updatePIC: !!q?.updatePic,
			updateStatus: !!q?.updateStatus,
			updatePayment: !!q?.updatePayment,
		};
	}, [globalProps.adminPortal?.currentQuery]);

	const { t } = useTranslation("appointments");

	const dialogViewOrder = useMemo<Omit<ResponsiveDialogProps, "children">>(
		() => ({
			isOpen: dialogMode.viewOrder,
			title: "Order Details",
			description: "View order details and related appointments",
			dialogWidth: "680px",
			onOpenChange: (value: boolean) => {
				if (!value) {
					const { fullUrl } = populateQueryParams(pageURL, {
						view_order: null,
					});
					startTransition(() => {
						router.get(
							fullUrl,
							{},
							{
								only: ["adminPortal", "flash", "errors", "selectedOrder"],
								preserveScroll: true,
								preserveState: true,
								replace: false,
							},
						);
					});
				}
			},
		}),
		[dialogMode.viewOrder, pageURL],
	);

	const dialogUpdatePIC = useMemo<Omit<ResponsiveDialogProps, "children">>(
		() => ({
			isOpen: dialogMode.updatePIC,
			title: t("modal.update_pic.title"),
			description: t("modal.update_pic.description"),
			onOpenChange: (value: boolean) => {
				if (!value) {
					const { fullUrl } = populateQueryParams(pageURL, {
						update_pic: null,
					});
					startTransition(() => {
						router.get(
							fullUrl,
							{},
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
								replace: false,
							},
						);
					});
				}
			},
		}),
		[dialogMode.updatePIC, pageURL, t],
	);

	const dialogUpdateStatus = useMemo<Omit<ResponsiveDialogProps, "children">>(
		() => ({
			isOpen: dialogMode.updateStatus,
			title: t("modal.update_status.title"),
			description: t("modal.update_status.description"),
			onOpenChange: (value: boolean) => {
				if (!value) {
					const { fullUrl } = populateQueryParams(pageURL, {
						update_status: null,
					});
					startTransition(() => {
						router.get(
							fullUrl,
							{},
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
								replace: false,
							},
						);
					});
				}
			},
		}),
		[dialogMode.updateStatus, pageURL, t],
	);

	const dialogUpdatePayment = useMemo<Omit<ResponsiveDialogProps, "children">>(
		() => ({
			isOpen: dialogMode.updatePayment,
			title: "Update Payment Status",
			description: "Update payment status for this order",
			onOpenChange: (value: boolean) => {
				if (!value) {
					const { fullUrl } = populateQueryParams(pageURL, {
						update_payment: undefined,
						selected_order: undefined,
					});
					startTransition(() => {
						router.get(
							fullUrl,
							{},
							{
								only: ["adminPortal", "flash", "errors", "selectedOrder"],
								preserveScroll: true,
								preserveState: true,
								replace: false,
							},
						);
					});
				}
			},
		}),
		[dialogMode.updatePayment, pageURL],
	);

	const openOrderDetail = useCallback(
		(orderId: string) => {
			const { fullUrl } = populateQueryParams(pageURL, {
				view_order: orderId,
			});
			startTransition(() => {
				router.get(
					fullUrl,
					{},
					{
						only: ["adminPortal", "flash", "errors", "selectedOrder"],
						preserveScroll: true,
						preserveState: true,
					},
				);
			});
		},
		[pageURL],
	);

	// ── Feedback Dialog ────────────────────────────────────────────────────
	const [feedbackDialog, setFeedbackDialog] = useState<{
		isOpen: boolean;
		orderId: string;
		registrationNumber: string;
	}>({ isOpen: false, orderId: "", registrationNumber: "" });

	const handleOpenFeedbackDialog = useCallback(
		(orderId: string, registrationNumber: string) => {
			setFeedbackDialog({ isOpen: true, orderId, registrationNumber });
		},
		[],
	);

	const handleCloseFeedbackDialog = useCallback(() => {
		setFeedbackDialog({ isOpen: false, orderId: "", registrationNumber: "" });
	}, []);

	const orders = useMemo(
		() => globalProps?.orders?.data ?? [],
		[globalProps?.orders?.data],
	);

	const tableColumns = useMemo(
		() =>
			orderColumns({
				pageURL,
				openOrderDetail,
				onOpenFeedbackDialog: handleOpenFeedbackDialog,
			}),
		[pageURL, openOrderDetail, handleOpenFeedbackDialog],
	);

	return (
		<>
			<Head title="Orders" />

			<PageContainer className="min-h-[100vh] flex flex-col md:grid md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							Appointment Orders
						</h1>
						<p className="w-full text-sm text-muted-foreground text-pretty md:max-w-[60ch]">
							View and manage orders associated with appointment bookings,
							including payment and invoice details.
						</p>
					</div>
				</div>

				<Separator className="bg-border" />

				<ApptViewChanger activeView="orders" />

				{/* Filters */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-2 lg:grid-cols-4 xl:grid-cols-6">
					<div className="grid gap-2 col-span-full md:col-span-2">
						<Input
							type="text"
							className="shadow-inner bg-input"
							placeholder="Search order..."
							value={filters.search}
							StartIcon={{ icon: SearchIcon }}
							isLoading={isSearching}
							EndIcon={
								filters.search
									? {
											icon: XIcon,
											isButton: true,
											handleOnClick: () => {
												handleFilterChange("search", "");
											},
										}
									: undefined
							}
							onChange={(e) => handleFilterChange("search", e.target.value)}
						/>

						<p className="text-[0.8rem] text-pretty text-muted-foreground">
							Search by Reg. No, Invoice, Patient, or Voucher.
						</p>
					</div>

					<div className="col-span-full md:col-span-1">
						<Select
							value={filters.paymentStatus}
							onValueChange={(v) => handleFilterChange("paymentStatus", v)}
						>
							<SelectTrigger className="shadow-inner bg-input">
								<SelectValue placeholder="Payment Status" />
							</SelectTrigger>
							<SelectContent>
								{PAYMENT_STATUS_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="col-span-full md:col-span-1">
						<Select
							value={filters.status}
							onValueChange={(v) => handleFilterChange("status", v)}
						>
							<SelectTrigger className="shadow-inner bg-input">
								<SelectValue placeholder="Order Status" />
							</SelectTrigger>
							<SelectContent>
								{ORDER_STATUS_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Orders Table */}
				<Deferred
					data={["orders"]}
					fallback={
						<div className="space-y-4">
							<Skeleton className="w-full h-12 rounded-lg" />
							<Skeleton className="w-full h-64 rounded-lg" />
						</div>
					}
				>
					<div className="overflow-x-auto">
						<DataTable
							columns={tableColumns}
							data={orders}
							customPagination={() =>
								metadata ? (
									<ApptPagination
										metadata={metadata}
										actions={{
											goToPrevpage: () => changePage("prev"),
											goToNextPage: () => changePage("next"),
											onChangeLimit: (value) => changePage("limit", value),
											goToPage: (value) => changePage("page", value),
											goToFirstPage: () => changePage("first"),
											goToLastPage: () => changePage("last"),
										}}
									/>
								) : null
							}
						/>
					</div>
				</Deferred>
			</PageContainer>

			{/* Order Detail Dialog */}
			{globalProps?.selectedOrder && dialogViewOrder.isOpen && (
				<ResponsiveDialog {...dialogViewOrder}>
					<OrderDetailContent
						order={globalProps.selectedOrder}
						onClose={() => dialogViewOrder.onOpenChange?.(false)}
					/>
				</ResponsiveDialog>
			)}

			{/* Update PIC Dialog */}
			{globalProps?.selectedAppointment && dialogUpdatePIC.isOpen && (
				<ResponsiveDialog {...dialogUpdatePIC}>
					<UpdatePICForm
						selectedAppointment={globalProps.selectedAppointment}
					/>
				</ResponsiveDialog>
			)}

			{/* Update Status Dialog */}
			{globalProps?.selectedAppointment && dialogUpdateStatus.isOpen && (
				<ResponsiveDialog {...dialogUpdateStatus}>
					<UpdateStatusForm
						selectedAppointment={globalProps.selectedAppointment}
					/>
				</ResponsiveDialog>
			)}

			{/* Update Payment Dialog */}
			{globalProps?.selectedOrder && dialogUpdatePayment.isOpen && (
				<ResponsiveDialog {...dialogUpdatePayment}>
					<UpdatePaymentForm
						order={globalProps.selectedOrder}
						paymentStatusOptions={
							globalProps.optionsData?.paymentStatuses || []
						}
						onSuccess={() => {
							// Refresh the page data after successful update
							router.reload({ only: ["orders"] });
						}}
					/>
				</ResponsiveDialog>
			)}

			{/* Feedback Reminder Dialog */}
			{feedbackDialog.isOpen && (
				<FeedbackReminderDialog
					isOpen={feedbackDialog.isOpen}
					onOpenChange={handleCloseFeedbackDialog}
					registrationNumber={feedbackDialog.registrationNumber}
					orderId={feedbackDialog.orderId}
				/>
			)}
		</>
	);
}
