import { Deferred, Head, Link, router, usePage } from "@inertiajs/react";
import type {
	ColumnDef,
	ExpandedState,
	Row,
	Table as TanstackTable,
} from "@tanstack/react-table";
import { type ContextFn, format, type Locale } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronDown,
	ChevronUp,
	ListFilterIcon,
	Loader2,
	MoreHorizontal,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PaginationTable from "@/components/admin-portal/shared/data-table-pagination";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import NewVoucherFormFields from "@/components/admin-portal/vouchers/upsert-form-fields";
import { useDateContext } from "@/components/providers/date-provider";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import { DataTablePagination } from "@/components/ui/data-table/pagination";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
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
	cn,
	formatCurrency,
	formatPercentage,
	populateQueryParams,
} from "@/lib/utils";
import { formatVouchersMetaToMetadata } from "@/lib/vouchers/meta-formatter";
import type { Package } from "@/types/admin-portal/package";
import type { Voucher, VouchersMeta } from "@/types/admin-portal/vouchers";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

export interface PageProps {
	vouchers: Voucher[];
	vouchersMeta?: VouchersMeta | null;
	selectedVoucher?: Voucher | null;
	packages?: Package[] | null;
}

export interface VoucherIndexGlobalPageProps
	extends BaseGlobalPageProps,
		PageProps {
	[key: string]: any;
}

export default function Index({
	vouchers,
	vouchersMeta,
	selectedVoucher,
	packages,
}: PageProps) {
	const { props: globalProps, url: pageURL } =
		usePage<VoucherIndexGlobalPageProps>();
	const { locale, tzDate } = useDateContext();
	const { t: tv } = useTranslation("vouchers");
	const vouchersIndexRoute =
		globalProps.adminPortal?.router?.adminPortal?.vouchers?.index;

	const { queryParams } = useMemo(
		() => populateQueryParams(pageURL),
		[pageURL],
	);
	const selectedId = queryParams?.id;

	const vouchersData = useMemo(
		() => (Array.isArray(vouchers) ? vouchers : []),
		[vouchers],
	);

	const packagesData = useMemo<Package[]>(() => {
		if (Array.isArray(packages)) return packages;
		const fallback = globalProps?.packages;
		return Array.isArray(fallback) ? (fallback as Package[]) : [];
	}, [packages, globalProps?.packages]);

	const packagesById = useMemo<Record<string, Package>>(
		() =>
			packagesData.reduce<Record<string, Package>>((acc, pkg) => {
				acc[String(pkg.id)] = pkg;
				return acc;
			}, {}),
		[packagesData],
	);

	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [voucherIdPendingDelete, setVoucherIdPendingDelete] = useState<
		string | number | null
	>(null);
	const [isDeleteLoading, setIsDeleteLoading] = useState(false);

	const voucherPendingDelete = useMemo(
		() =>
			voucherIdPendingDelete == null
				? null
				: (vouchersData.find(
						(voucher) => String(voucher.id) === String(voucherIdPendingDelete),
					) ?? null),
		[voucherIdPendingDelete, vouchersData],
	);

	const currentExpanded = useMemo<ExpandedState>(() => {
		if (!selectedId) return {};

		const rowIndex = vouchersData.findIndex(
			(voucher) => String(voucher.id) === String(selectedId),
		);

		if (rowIndex < 0) return {};

		return { [rowIndex]: true };
	}, [selectedId, vouchersData]);

	const handleRowExpandToggle = useCallback(
		(row: Row<Voucher>) => {
			const nextId = row.getIsExpanded() ? null : row.original.id;
			row.toggleExpanded();

			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				id: nextId,
			});

			router.get(fullUrl, queryParams, {
				only: ["flash", "adminPortal", "selectedVoucher", "packages"],
				preserveScroll: true,
				preserveState: true,
				replace: true,
			});
		},
		[pageURL],
	);

	const handleRowClose = useCallback(
		(row: Row<Voucher>) => {
			row.toggleExpanded(false);

			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				id: null,
			});

			router.get(fullUrl, queryParams, {
				only: ["flash", "adminPortal", "selectedVoucher"],
				preserveScroll: true,
				preserveState: true,
				replace: true,
			});
		},
		[pageURL],
	);

	const handleEditVoucher = useCallback(
		(voucherId: string | number) => {
			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				edit: voucherId,
				id: voucherId,
			});

			router.get(
				fullUrl,
				{ ...queryParams },
				{
					only: ["flash", "adminPortal", "selectedVoucher", "packages"],
					preserveScroll: true,
					preserveState: true,
					replace: true,
				},
			);
		},
		[pageURL],
	);

	const handleDeleteVoucher = useCallback((voucherId: string | number) => {
		setVoucherIdPendingDelete(voucherId);
		setIsDeleteLoading(false);
		setIsDeleteDialogOpen(true);
	}, []);

	const handleDeleteDialogOpenChange = useCallback(
		(open: boolean) => {
			if (!open && isDeleteLoading) {
				return;
			}
			setIsDeleteDialogOpen(open);
			if (!open) {
				setVoucherIdPendingDelete(null);
			}
		},
		[isDeleteLoading],
	);

	const handleConfirmDelete = useCallback(() => {
		if (!voucherIdPendingDelete || !vouchersIndexRoute) return;

		router.delete(`${vouchersIndexRoute}/${voucherIdPendingDelete}`, {
			preserveScroll: true,
			preserveState: true,
			onStart: () => setIsDeleteLoading(true),
			onFinish: () => {
				setIsDeleteLoading(false);
				setIsDeleteDialogOpen(false);
				setVoucherIdPendingDelete(null);
			},
		});
	}, [voucherIdPendingDelete, vouchersIndexRoute]);

	const columns = useMemo<ColumnDef<Voucher>[]>(
		() =>
			getColumns(handleRowExpandToggle, {
				locale,
				tzDate,
				onEditVoucher: handleEditVoucher,
				onDeleteVoucher: handleDeleteVoucher,
			}),
		[
			handleDeleteVoucher,
			handleEditVoucher,
			handleRowExpandToggle,
			locale,
			tzDate,
		],
	);

	const formDialogMode = useMemo(() => {
		const isCreateMode =
			globalProps.adminPortal?.currentQuery?.new === "voucher";
		const editVoucherId = globalProps.adminPortal?.currentQuery?.edit ?? null;
		return { isCreateMode, editVoucherId };
	}, [globalProps.adminPortal?.currentQuery]);

	const createVoucherDialog = useMemo<ResponsiveDialogProps>(() => {
		return {
			title: "Create Voucher",
			description: "Fill in the details to create a new voucher.",
			isOpen: formDialogMode.isCreateMode,
			dialogWidth: "640px",
			onOpenChange: () => {
				const { fullUrl, queryParams } = populateQueryParams(pageURL, {
					new: null,
				});

				router.get(
					fullUrl,
					{ ...queryParams },
					{
						only: ["flash", "adminPortal", "packages"],
						preserveScroll: true,
						preserveState: true,
						replace: true,
					},
				);
			},
		};
	}, [formDialogMode.isCreateMode, pageURL]);

	const editVoucherDialog = useMemo<ResponsiveDialogProps>(() => {
		const isOpen = Boolean(formDialogMode.editVoucherId);
		return {
			title: "Edit Voucher",
			description: "Update the voucher details.",
			isOpen,
			dialogWidth: "640px",
			onOpenChange: () => {
				const { fullUrl, queryParams } = populateQueryParams(pageURL, {
					edit: null,
					id: null,
				});

				router.get(
					fullUrl,
					{ ...queryParams },
					{
						only: ["flash", "adminPortal", "selectedVoucher", "packages"],
						preserveScroll: true,
						preserveState: true,
						replace: true,
					},
				);
			},
		};
	}, [formDialogMode.editVoucherId, pageURL]);

	const voucherForEdit =
		formDialogMode.editVoucherId &&
		selectedVoucher &&
		String(selectedVoucher.id) === String(formDialogMode.editVoucherId)
			? selectedVoucher
			: undefined;

	return (
		<>
			<Head title={tv("head_title")} />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{tv("page_title")}
						</h1>

						<p className="w-full text-sm text-muted-foreground text-pretty md:w-10/12 xl:w-8/12">
							{tv("page_description")}
						</p>
					</div>
				</div>

				<Separator className="bg-border" />

				<Deferred
					data={["vouchers"]}
					fallback={<Skeleton className="w-2/12 h-4 rounded-sm" />}
				>
					<FiltersPanel
						pageURL={globalProps.adminPortal.router.adminPortal.vouchers.index}
						queryParams={queryParams}
						newVoucherHref={
							globalProps.adminPortal.router.adminPortal.vouchers.index
						}
					/>
				</Deferred>

				<Deferred
					data={["vouchers"]}
					fallback={<Skeleton className="relative w-full h-32 rounded-xl" />}
				>
					<DataTable
						columns={columns}
						data={vouchersData}
						customPagination={(table) => (
							<Pagination
								table={table}
								metadata={vouchersMeta}
								hrefLink={
									globalProps.adminPortal.router.adminPortal.vouchers.index
								}
							/>
						)}
						subComponent={(row) => (
							<VoucherDetails
								row={row}
								onClose={() => handleRowClose(row)}
								onEdit={() => handleEditVoucher(row.original.id)}
								packagesById={packagesById}
								selectedVoucher={
									selectedVoucher && selectedVoucher.id === row.original.id
										? selectedVoucher
										: undefined
								}
							/>
						)}
						currentExpanded={currentExpanded}
					/>
				</Deferred>

				{createVoucherDialog.isOpen && (
					<ResponsiveDialog {...createVoucherDialog}>
						<NewVoucherFormFields
							packages={packagesData}
							forceMode={createVoucherDialog.forceMode}
							handleOpenChange={createVoucherDialog.onOpenChange}
						/>
					</ResponsiveDialog>
				)}

				{editVoucherDialog.isOpen && (
					<ResponsiveDialog {...editVoucherDialog}>
						<NewVoucherFormFields
							packages={packagesData}
							forceMode={editVoucherDialog.forceMode}
							handleOpenChange={editVoucherDialog.onOpenChange}
							voucher={voucherForEdit}
						/>
					</ResponsiveDialog>
				)}

				<AlertDialog
					open={isDeleteDialogOpen}
					onOpenChange={handleDeleteDialogOpenChange}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete voucher?</AlertDialogTitle>
							<AlertDialogDescription>
								{voucherPendingDelete ? (
									<>
										This action will permanently delete{" "}
										<span className="font-semibold">
											{voucherPendingDelete.name ?? voucherPendingDelete.code}
										</span>{" "}
										and all of its associated data.
									</>
								) : (
									"This action cannot be undone."
								)}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isDeleteLoading}>
								Cancel
							</AlertDialogCancel>
							<Button
								variant="destructive"
								disabled={isDeleteLoading}
								onClick={(event) => {
									event.preventDefault();
									handleConfirmDelete();
								}}
							>
								{isDeleteLoading ? (
									<>
										<Loader2 className="mr-2 size-4 animate-spin" />
										Deleting...
									</>
								) : (
									"Delete"
								)}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</PageContainer>
		</>
	);
}

type VoucherColumnContext = {
	locale: Locale;
	tzDate: ContextFn<Date>;
	onEditVoucher: (voucherId: string | number) => void;
	onDeleteVoucher: (voucherId: string | number) => void;
};

function getColumns(
	handleRowExpandToggle: (row: Row<Voucher>) => void,
	{ locale, tzDate, onEditVoucher, onDeleteVoucher }: VoucherColumnContext,
): ColumnDef<Voucher>[] {
	return [
		{
			id: "expander",
			header: () => null,
			cell: ({ row }) => (
				<Button
					variant="ghost"
					size="icon"
					className="border size-8 shadow-none bg-card border-none"
					onClick={() => handleRowExpandToggle(row)}
					aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
				>
					{row.getIsExpanded() ? (
						<ChevronUp className="size-4" />
					) : (
						<ChevronDown className="size-4" />
					)}
				</Button>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "code",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Code" />
			),
			cell: ({ row }) => (
				<span className="font-semibold uppercase tracking-tight">
					{row.original.code}
				</span>
			),
		},
		{
			accessorKey: "isActive",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => (
				<Badge
					variant="outline"
					className={cn(
						"border rounded-full text-xs font-semibold uppercase",
						row.original.isActive
							? "bg-emerald-50 text-emerald-700 border-emerald-200"
							: "bg-rose-50 text-rose-700 border-rose-200",
					)}
				>
					{row.original.isActive ? "Active" : "Inactive"}
				</Badge>
			),
		},
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Name" />
			),
			cell: ({ row }) => (
				<span className="font-medium line-clamp-2">{row.original.name}</span>
			),
		},
		{
			accessorKey: "description",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Description" />
			),
			meta: {
				headerClassName: "hidden md:table-cell",
				cellClassName: "hidden md:table-cell",
			},
			cell: ({ row }) => (
				<p className="max-w-xs text-sm text-muted-foreground line-clamp-2">
					{row.original.description || "N/A"}
				</p>
			),
		},
		{
			accessorKey: "validFrom",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Valid From" />
			),
			meta: {
				headerClassName: "hidden lg:table-cell",
				cellClassName: "hidden lg:table-cell text-nowrap",
			},
			cell: ({ row }) =>
				row?.original?.validFrom
					? format(new Date(row.original.validFrom), "PPPp", {
							locale,
							in: tzDate,
						})
					: "N/A",
		},
		{
			accessorKey: "validUntil",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Valid Until" />
			),
			meta: {
				headerClassName: "hidden lg:table-cell",
				cellClassName: "hidden lg:table-cell text-nowrap",
			},
			cell: ({ row }) =>
				row?.original?.validUntil
					? format(new Date(row.original.validUntil), "PPPp", {
							locale,
							in: tzDate,
						})
					: "N/A",
		},
		{
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			meta: {
				headerClassName: "hidden md:table-cell",
				cellClassName: "hidden md:table-cell text-nowrap",
			},
			cell: ({ row }) => (
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="border size-8 shadow-none"
								aria-label="Open voucher actions"
							>
								<MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onSelect={(event) => {
									event.preventDefault();
									onEditVoucher(row.original.id);
								}}
							>
								<PencilIcon className="size-4" />
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onSelect={(event) => {
									event.preventDefault();
									onDeleteVoucher(row.original.id);
								}}
							>
								<Trash2Icon className="size-4" />
								Remove
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			),
			enableSorting: false,
		},
	];
}

type VoucherDetailsProps = {
	row: Row<Voucher>;
	selectedVoucher?: Voucher;
	onClose: () => void;
	onEdit: () => void;
	packagesById: Record<string, Package>;
};

function VoucherDetails({
	row,
	selectedVoucher,
	onClose,
	onEdit,
	packagesById,
}: VoucherDetailsProps) {
	const { locale, tzDate } = useDateContext();
	const [showAllPackages, setShowAllPackages] = useState(false);

	const hasSelectedVoucher =
		selectedVoucher && selectedVoucher.id === row.original.id;
	const voucher = hasSelectedVoucher ? selectedVoucher : null;

	useEffect(() => {
		if (!voucher) return;
		setShowAllPackages(false);
	}, [voucher]);

	if (!voucher) {
		return (
			<div className="p-4 space-y-3 rounded-xl border bg-muted/30 text-sm md:p-6">
				<div className="space-y-1">
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						Voucher Details
					</p>
					<h4 className="text-base font-bold tracking-tight">
						{row.original.name ?? row.original.code}
					</h4>
					<Deferred
						data={["selectedVoucher", "packages"]}
						fallback={<Skeleton className="w-full h-4 rounded-sm" />}
					>
						<p className="text-muted-foreground">
							More details for this voucher couldn't be loaded yet.
						</p>
					</Deferred>
				</div>

				<div className="mt-4">
					<Button
						variant="outline"
						size="sm"
						className="w-full md:w-fit"
						onClick={onClose}
					>
						Close
					</Button>
				</div>
			</div>
		);
	}

	const formattedDiscountValue =
		voucher.discountType === "PERCENTAGE"
			? formatPercentage((voucher.discountValue ?? 0) / 100)
			: formatCurrency(voucher.discountValue, { emptyValue: "N/A" });
	const voucherPackages = (voucher.packages ?? []).map((pkg) => {
		const packageDetails = packagesById?.[String(pkg.packageId)];
		return {
			...pkg,
			details: packageDetails,
		};
	});
	const infoBlocks = [
		{ label: "Code", value: voucher.code },
		{
			label: "Discount Type",
			value: voucher.discountType.replaceAll("_", " "),
		},
		{
			label: "Discount Value",
			value: formattedDiscountValue,
		},
		{
			label: "Max Discount",
			value: formatCurrency(voucher.maxDiscountAmount, { emptyValue: "N/A" }),
		},
		{
			label: "Min Order Amount",
			value: formatCurrency(voucher.minOrderAmount, { emptyValue: "N/A" }),
		},
		{
			label: "Valid From",
			value: voucher?.validFrom
				? format(new Date(voucher.validFrom), "PPPp", { locale, in: tzDate })
				: "N/A",
		},
		{
			label: "Valid Until",
			value: voucher?.validUntil
				? format(new Date(voucher.validUntil), "PPPp", { locale, in: tzDate })
				: "N/A",
		},
	];
	const visiblePackages = showAllPackages
		? voucherPackages
		: voucherPackages.slice(0, 2);
	const extraPackagesCount = Math.max(voucherPackages.length - 2, 0);
	const showToggle = extraPackagesCount > 0;

	return (
		<div className="p-4 space-y-4 rounded-xl border bg-card text-card-foreground md:p-6 text-sm">
			<div className="space-y-1">
				<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Voucher Details
				</p>
				<h4 className="text-base font-bold tracking-tight">
					{voucher.name ?? voucher.code}
				</h4>
				<p className="text-muted-foreground">
					{voucher.description || "No additional description provided."}
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
				{infoBlocks.map((item) => (
					<div
						key={item.label}
						className="space-y-1 rounded-lg bg-background p-3"
					>
						<p className="text-xs uppercase text-muted-foreground">
							{item.label}
						</p>
						<p className="font-semibold text-pretty">{item.value ?? "N/A"}</p>
					</div>
				))}
			</div>

			<div className="grid gap-4 md:grid-cols-12">
				<div className="space-y-2 col-span-full md:col-span-4">
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						Usage Summary
					</p>
					<div className="flex flex-wrap gap-4 text-sm">
						<div>
							<p className="text-muted-foreground">Status</p>
							<Badge
								variant="outline"
								className={cn(
									"border rounded-full text-xs font-semibold uppercase mt-1.5",
									row.original.isActive
										? "bg-emerald-50 text-emerald-700 border-emerald-200"
										: "bg-rose-50 text-rose-700 border-rose-200",
								)}
							>
								{voucher.isActive ? "Active" : "Inactive"}
							</Badge>
						</div>
						<div className="space-y-2">
							<p className="text-muted-foreground">
								<span className="font-semibold">{voucher?.usedCount ?? 0}</span>{" "}
								of <span className="font-semibold">{voucher?.quota ?? 0}</span>{" "}
								booking(s) used
							</p>
							<p className="text-muted-foreground">
								Remaining quota:{" "}
								<span className="font-semibold">
									{voucher.quota && voucher.usedCount !== null
										? Math.max(voucher.quota - voucher.usedCount, 0)
										: "N/A"}
								</span>{" "}
								booking(s)
							</p>
						</div>
					</div>
				</div>

				<div className="space-y-2 col-span-full md:col-span-8">
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						Packages
					</p>
					{voucherPackages.length ? (
						<div className="flex flex-col gap-2">
							<div className="flex flex-wrap gap-2 mt-1">
								{visiblePackages.map((item) => (
									<Badge
										key={item.id}
										variant="accent"
										className="flex flex-wrap items-center gap-1 px-3 py-2 text-left leading-tight whitespace-normal break-all"
									>
										<span className="text-sm font-semibold">
											{item.details?.name || `Package #${item.packageId}`}
										</span>
										<span className="text-xs italic text-muted-foreground">
											(
											{item.details?.numberOfVisit
												? `${item.details.numberOfVisit} visit(s)`
												: "N/A visits"}
											)
										</span>
										<span aria-hidden="true" className="mx-1.5">
											&bull;
										</span>
										<span className="text-xs text-muted-foreground">
											{item.details?.service?.name
												? item.details.service.name.replaceAll("_", " ")
												: "N/A service"}
										</span>
									</Badge>
								))}
							</div>

							{showToggle ? (
								<Button
									variant="link"
									size="sm"
									className="self-start px-0 text-xs font-semibold uppercase"
									onClick={() => setShowAllPackages((prev) => !prev)}
								>
									{showAllPackages
										? "Show fewer packages"
										: `Show ${extraPackagesCount} more package(s)`}
								</Button>
							) : null}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							No packages linked to this voucher.
						</p>
					)}
				</div>
			</div>

			<div className="mt-4 flex flex-col md:flex-row gap-4 md:gap-2">
				<Button
					variant="outline"
					size="sm"
					className="w-full md:w-fit"
					onClick={onClose}
				>
					<XIcon />
					Close
				</Button>
				<Button
					variant="primary-outline"
					size="sm"
					className="w-full md:w-fit"
					onClick={onEdit}
				>
					<PencilIcon />
					Edit
				</Button>
				<Button
					variant="destructive"
					size="sm"
					className="w-full md:w-fit"
					onClick={onClose}
				>
					<Trash2Icon />
					Remove
				</Button>
			</div>
		</div>
	);
}

const Pagination = memo(
	({
		table,
		metadata,
		hrefLink,
	}: {
		table: TanstackTable<Voucher>;
		metadata: VouchersMeta | null | undefined;
		hrefLink: string;
	}) => {
		if (!metadata) {
			return <DataTablePagination table={table} />;
		}

		const formattedMetadata: Metadata = formatVouchersMetaToMetadata(
			metadata,
			hrefLink,
		);

		return <PaginationTable table={table} metadata={formattedMetadata} />;
	},
);

// * filters panel component
type FiltersPanelProps = {
	pageURL: string;
	queryParams?: Record<string, unknown>;
	newVoucherHref: string;
};

const FiltersPanel = memo(function FiltersPanel({
	pageURL,
	queryParams,
	newVoucherHref,
}: FiltersPanelProps) {
	const ALL_OPTION = "ALL";
	const [showFilters, setShowFilters] = useState(false);
	const [codeFilter, setCodeFilter] = useState<string>(
		String(queryParams?.code ?? ""),
	);
	const [isActiveFilter, setIsActiveFilter] = useState<string>(
		String(queryParams?.is_active ?? ALL_OPTION),
	);
	const [discountTypeFilter, setDiscountTypeFilter] = useState<string>(
		String(queryParams?.discount_type ?? ALL_OPTION),
	);

	useEffect(() => {
		setCodeFilter(String(queryParams?.code ?? ""));
		setIsActiveFilter(String(queryParams?.is_active ?? ALL_OPTION));
		setDiscountTypeFilter(String(queryParams?.discount_type ?? ALL_OPTION));
	}, [queryParams?.code, queryParams?.is_active, queryParams?.discount_type]);

	const filtersInitializedRef = useRef(false);
	const lastAppliedFiltersRef = useRef<string | null>(null);

	const sanitizedFilters = useMemo(() => {
		const sanitizedCode = codeFilter.trim();
		const sanitizedIsActive =
			isActiveFilter === ALL_OPTION ? "" : isActiveFilter;
		const sanitizedDiscountType =
			discountTypeFilter === ALL_OPTION ? "" : discountTypeFilter;

		return {
			code: sanitizedCode.length ? sanitizedCode : null,
			is_active: sanitizedIsActive.length ? sanitizedIsActive : null,
			discount_type: sanitizedDiscountType.length
				? sanitizedDiscountType
				: null,
		};
	}, [codeFilter, discountTypeFilter, isActiveFilter]);

	useEffect(() => {
		const serializedFilters = JSON.stringify(sanitizedFilters);

		if (!filtersInitializedRef.current) {
			filtersInitializedRef.current = true;
			lastAppliedFiltersRef.current = serializedFilters;
			return;
		}

		if (lastAppliedFiltersRef.current === serializedFilters) {
			return;
		}

		lastAppliedFiltersRef.current = serializedFilters;

		const { fullUrl, queryParams: nextQueryParams } = populateQueryParams(
			pageURL,
			{
				...sanitizedFilters,
				page: 1,
			},
		);

		router.get(fullUrl, nextQueryParams, {
			only: ["flash", "adminPortal", "vouchers", "vouchersMeta"],
			preserveScroll: true,
			preserveState: true,
			replace: true,
		});
	}, [pageURL, sanitizedFilters]);

	return (
		<div className="grid gap-4">
			<div className="z-10 flex flex-col gap-2 md:justify-between md:flex-row items-center">
				<Button
					variant={showFilters ? "default" : "outline"}
					className="w-full md:w-fit"
					onClick={() => setShowFilters((prev) => !prev)}
				>
					<ListFilterIcon />
					{showFilters ? "Close" : "Filters"}
				</Button>

				<Button asChild className="w-full md:w-fit order-first md:order-last">
					<Link
						href={
							populateQueryParams(newVoucherHref, { new: "voucher" }).fullUrl
						}
					>
						<PlusIcon />
						Create Voucher
					</Link>
				</Button>
			</div>

			<AnimatePresence initial={false} mode="wait">
				{showFilters ? (
					<motion.section
						key="voucher-filters"
						initial={{ opacity: 0, y: -20, filter: "blur(8px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
						transition={{ duration: 0.25, ease: "easeOut" }}
					>
						<div className="p-3 border shadow-inner rounded-xl bg-background">
							<div className="grid gap-4 md:grid-cols-12">
								<div className="md:col-span-6">
									<Input
										value={codeFilter}
										onChange={(e) => setCodeFilter(e.target.value)}
										placeholder="Search by code"
										className="bg-input"
									/>
								</div>

								<div className="md:col-span-3">
									<Select
										value={isActiveFilter}
										onValueChange={(value) => {
											setIsActiveFilter(value);
										}}
									>
										<SelectTrigger className="bg-input">
											<SelectValue placeholder="All" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={ALL_OPTION}>All</SelectItem>
											<SelectItem value="true">Active</SelectItem>
											<SelectItem value="false">Inactive</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="md:col-span-3">
									<Select
										value={discountTypeFilter}
										onValueChange={(value) => {
											setDiscountTypeFilter(value);
										}}
									>
										<SelectTrigger className="bg-input">
											<SelectValue placeholder="All" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={ALL_OPTION}>All</SelectItem>
											<SelectItem value="PERCENTAGE">Percentage</SelectItem>
											<SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="mt-4 flex flex-col gap-4 md:gap-2 md:flex-row md:justify-end">
								<Button
									variant="ghost"
									size="sm"
									className="w-full md:w-fit"
									onClick={() => setShowFilters(false)}
								>
									Close
								</Button>
								<Button
									variant="ghost-destructive"
									size="sm"
									className="w-full md:w-fit"
									onClick={() => {
										setCodeFilter("");
										setIsActiveFilter(ALL_OPTION);
										setDiscountTypeFilter(ALL_OPTION);
									}}
								>
									Clear All
								</Button>
							</div>
						</div>
					</motion.section>
				) : null}
			</AnimatePresence>
		</div>
	);
});
