import { Deferred, Head, router, usePage } from "@inertiajs/react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
	CheckIcon,
	Copy,
	CopyIcon,
	ExternalLinkIcon,
	EyeIcon,
	MoreHorizontal,
	SearchIcon,
	X,
} from "lucide-react";
import { startTransition, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ApptViewChanger from "@/components/admin-portal/appointment/appt-view-changer";
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
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderRow {
	id: string;
	registrationNumber: string;
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
}

interface OrdersGlobalPageProps extends BaseGlobalPageProps, OrdersPageProps {
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
		"bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100/80",
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
		"bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100/80",
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
}: {
	row: Row<OrderRow>;
	onOpenDetail: (id: string) => void;
}) => {
	const order = row.original;

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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="size-8">
					<span className="sr-only">Open menu</span>
					<MoreHorizontal className="w-4 h-4" />
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
						View details
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Copy className="opacity-60" aria-hidden="true" />
							Copy
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								<DropdownMenuItem
									onSelect={onCopyInvoiceUrl}
									disabled={!order.invoiceUrl}
								>
									Invoice URL
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={onCopyRegNumber}>
									Appt Reg. Number
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={onCopyInvoiceNumber}
									disabled={!order.invoiceNumber}
								>
									No. Invoice
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

const orderColumns = (
	openOrderDetail: (orderId: string) => void,
): ColumnDef<OrderRow>[] => [
	{
		accessorKey: "registrationNumber",
		header: "Reg. No",
		meta: {
			headerClassName: "sticky left-0 z-10 bg-card",
			cellClassName: "sticky left-0 z-10 bg-card",
		},
		cell: ({ row }) => (
			<span className="font-mono text-sm font-bold text-nowrap">
				{row.original.registrationNumber}
			</span>
		),
	},
	{
		accessorKey: "patientName",
		header: "Patient",
		cell: ({ row }) => (
			<span className="text-sm uppercase">
				{row.original.patientName || "—"}
			</span>
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
		accessorKey: "totalAmount",
		header: () => <div className="text-right">Total</div>,
		cell: ({ row }) => (
			<div className="text-right">
				<span className="text-sm font-medium text-nowrap">
					{formatCurrency(row.original.totalAmount)}
				</span>
			</div>
		),
	},
	{
		accessorKey: "paymentStatus",
		header: "Payment",
		cell: ({ row }) => (
			<Badge
				className={cn(
					"text-[10px] border px-1",
					PAYMENT_STATUS_STYLES[row.original.paymentStatus] ||
						"bg-background hover:bg-background/80",
				)}
			>
				{row.original.paymentStatus.replace(/_/g, " ")}
			</Badge>
		),
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => (
			<Badge
				className={cn(
					"text-[10px] border px-1",
					ORDER_STATUS_STYLES[row.original.status] ||
						"bg-background hover:bg-background/80",
				)}
			>
				{row.original.status.replace(/_/g, " ")}
			</Badge>
		),
	},
	{
		accessorKey: "invoiceNumber",
		header: "Invoice",
		cell: ({ row }) => (
			<span className="select-all text-sm text-muted-foreground text-nowrap">
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
				<OrderActionsCell row={row} onOpenDetail={openOrderDetail} />
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
									"text-[10px] border",
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
									"text-[10px] border",
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
							value={`${formatDateTime(order.cancelledAt)}${order.cancelledBy ? ` (${order.cancelledBy})` : ""}`}
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
														"text-[10px] border-transparent uppercase",
														APPOINTMENT_STATUS_STYLES[
															appt.status.toUpperCase()
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
		<div className="space-y-0.5 rounded-md bg-background px-3 py-2">
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

	// ── Dialog (view order detail) ─────────────────────────────────────────
	const dialogMode = useMemo(() => {
		const q = globalProps.adminPortal?.currentQuery;
		return !!q?.viewOrder;
	}, [globalProps.adminPortal?.currentQuery]);

	const dialog = useMemo<Omit<ResponsiveDialogProps, "children">>(
		() => ({
			isOpen: dialogMode,
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
		[dialogMode, pageURL],
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

	const orders = useMemo(
		() => globalProps?.orders?.data ?? [],
		[globalProps?.orders?.data],
	);

	const tableColumns = useMemo(
		() => orderColumns(openOrderDetail),
		[openOrderDetail],
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

				<ApptViewChanger activeView="orders" showNewBadge />

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
											icon: X,
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
			{globalProps?.selectedOrder && dialog.isOpen && (
				<ResponsiveDialog {...dialog}>
					<OrderDetailContent
						order={globalProps.selectedOrder}
						onClose={() => dialog.onOpenChange?.(false)}
					/>
				</ResponsiveDialog>
			)}
		</>
	);
}
