import { Deferred, Head, Link, router, usePage } from "@inertiajs/react";
import type {
	ColumnDef,
	ExpandedState,
	Row,
	Table as TanstackTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, PlusIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import PaginationTable from "@/components/admin-portal/shared/data-table-pagination";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import { DataTablePagination } from "@/components/ui/data-table/pagination";
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
	const { t: tv } = useTranslation("vouchers");

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

	const currentExpanded = useMemo<ExpandedState>(() => {
		const { queryParams } = populateQueryParams(pageURL);
		const selectedId = queryParams?.id;
		if (!selectedId) return {};

		const rowIndex = vouchersData.findIndex(
			(voucher) => String(voucher.id) === String(selectedId),
		);

		if (rowIndex < 0) return {};

		return { [rowIndex]: true };
	}, [pageURL, vouchersData]);

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

	const columns = useMemo<ColumnDef<Voucher>[]>(
		() => getColumns(handleRowExpandToggle),
		[handleRowExpandToggle],
	);

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
					<div className="grid gap-4">
						<div className="z-10 flex flex-col gap-2 md:justify-end md:flex-row">
							<div className="flex flex-col items-center gap-2 md:flex-row">
								<Button asChild className="w-full md:w-fit">
									<Link
										href={
											globalProps.adminPortal.router.adminPortal.vouchers.new
										}
									>
										<PlusIcon />
										Create Voucher
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</Deferred>

				<Deferred
					data={["vouchers"]}
					fallback={
						<div className="flex flex-col self-end gap-6 mt-6">
							<Skeleton className="relative w-full h-32 rounded-xl" />
						</div>
					}
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
			</PageContainer>
		</>
	);
}

function getColumns(
	handleRowExpandToggle: (row: Row<Voucher>) => void,
): ColumnDef<Voucher>[] {
	return [
		{
			id: "expander",
			header: () => null,
			cell: ({ row }) => (
				<Button
					variant="ghost"
					size="icon"
					className="border size-8 shadow-none"
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
			size: 48,
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
				headerClassName: "hidden md:table-cell",
				cellClassName: "hidden md:table-cell text-nowrap",
			},
			cell: ({ row }) =>
				row?.original?.validFrom
					? format(new Date(row.original.validFrom), "PPP")
					: "N/A",
		},
		{
			accessorKey: "validUntil",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Valid Until" />
			),
			meta: {
				headerClassName: "hidden md:table-cell",
				cellClassName: "hidden md:table-cell text-nowrap",
			},
			cell: ({ row }) =>
				row?.original?.validUntil
					? format(new Date(row.original.validUntil), "PPP")
					: "N/A",
		},
	];
}

type VoucherDetailsProps = {
	row: Row<Voucher>;
	selectedVoucher?: Voucher;
	onClose: () => void;
	packagesById: Record<string, Package>;
};

function VoucherDetails({
	row,
	selectedVoucher,
	onClose,
	packagesById,
}: VoucherDetailsProps) {
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
				? format(new Date(voucher.validFrom), "PPP")
				: "N/A",
		},
		{
			label: "Valid Until",
			value: voucher?.validUntil
				? format(new Date(voucher.validUntil), "PPP")
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
						<p className="font-semibold">{item.value ?? "—"}</p>
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
