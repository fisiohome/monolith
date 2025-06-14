import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Button } from "@/components/ui/button";
import { Head, router, usePage } from "@inertiajs/react";
import { Ellipsis, IdCard, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";
import type { Patient } from "@/types/admin-portal/patient";
import { Separator } from "@/components/ui/separator";
import { useCallback, useMemo } from "react";
import type { ColumnDef, ExpandedState, Row } from "@tanstack/react-table";
import type { Table as TableTanstack } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import { DataTable } from "@/components/ui/data-table";
import {
	generateInitials,
	populateQueryParams,
	removeWhiteSpaces,
} from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import PaginationTable from "@/components/admin-portal/shared/data-table-pagination";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DetailsContent from "@/components/admin-portal/patient/details-content";
import type { Appointment } from "@/types/admin-portal/appointment";
import ToolbarTable from "@/components/admin-portal/patient/data-table-toolbar";
import type { Location } from "@/types/admin-portal/location";

interface PageProps {
	patients: {
		data: Patient[];
		metadata: Metadata;
	};
	selectedPatient: null | Patient;
	selectedPatientAppts: null | Appointment[];
	filterOptions?: {
		locations: Location[];
	};
}
export interface PatientIndexGlobalPageProps
	extends BaseGlobalPageProps,
		PageProps {
	[key: string]: any;
}
export type TableToolbarDataProps = TableTanstack<
	PageProps["patients"]["data"][number]
>;
type TableColumnDef = ColumnDef<PageProps["patients"]["data"][number]>[];
export type TableRowDataProps = Row<PageProps["patients"]["data"][number]>;

export default function Index({
	patients,
	selectedPatient,
	selectedPatientAppts,
}: PageProps) {
	const { t } = useTranslation("patients");
	const isMobile = useIsMobile();
	const { props: globalProps, url: pageURL } =
		usePage<PatientIndexGlobalPageProps>();

	// * for table state
	const currentExpanded = useMemo<ExpandedState>(() => {
		const { queryParams } = populateQueryParams(pageURL);
		const expandedList = queryParams?.expanded
			? removeWhiteSpaces(queryParams?.expanded)?.split(",")
			: [];
		const adminsIndex = patients.data.reduce(
			(obj, item, index) => {
				if (expandedList.includes(String(item.id))) {
					obj[index] = true;
				}
				return obj;
			},
			{} as Record<number, boolean>,
		);

		return adminsIndex;
	}, [pageURL, patients.data]);
	const routeTo = {
		detail: useCallback(
			(id: string) => {
				router.get(
					pageURL,
					{ details: id },
					{
						preserveScroll: true,
						preserveState: true,
						only: [
							"flash",
							"adminPortal",
							"selectedPatient",
							"selectedPatientAppts",
						],
					},
				);
			},
			[pageURL],
		),
	};
	const formDialog = useMemo(() => {
		const currentQuery = globalProps.adminPortal?.currentQuery;
		const isDetailsMode = !!currentQuery?.details;
		const isOpen = isDetailsMode;
		const mode = { details: isDetailsMode };
		const onOpenChange = (value: boolean) => {
			if (value) return;

			const objQueryParams = { details: null };
			const { fullUrl } = populateQueryParams(pageURL, objQueryParams);
			router.get(
				fullUrl,
				{},
				{
					preserveScroll: true,
					preserveState: true,
					only: [
						"flash",
						"adminPortal",
						"selectedPatient",
						"selectedPatientAppts",
					],
				},
			);
		};

		return { isOpen, mode, onOpenChange };
	}, [globalProps.adminPortal?.currentQuery, pageURL]);
	const columns = useMemo<TableColumnDef>(() => {
		const items: TableColumnDef = [
			{
				accessorKey: "profile",
				enableSorting: false,
				enableHiding: false,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("list.profile")} />
				),
				cell: ({ row }) => {
					const name = row.original.name;
					const initials = generateInitials(name);

					return (
						<div className="flex items-center gap-2 text-sm text-left">
							<Avatar className="border rounded-lg size-8 bg-muted">
								<AvatarImage src="#" alt={name} />
								<AvatarFallback className="text-xs rounded-lg bg-muted">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 space-y-0.5 text-sm leading-tight text-left">
								<p className="font-bold uppercase truncate">{name}</p>
							</div>
						</div>
					);
				},
			},
		];

		if (!isMobile) {
			items.push({
				accessorKey: "contact",
				enableSorting: false,
				enableHiding: false,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("list.contact")} />
				),
				cell: ({ row }) => {
					const contact = row.original.contact;

					return (
						<div className="flex items-center gap-2 text-sm text-left">
							<Avatar className="border rounded-lg size-8 bg-muted">
								<AvatarImage src="#" alt={contact?.contactName} />
								<AvatarFallback className="text-xs rounded-lg bg-muted">
									<IdCard className="size-4 text-muted-foreground" />
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 text-sm leading-tight text-left">
								<p className="font-bold uppercase truncate">
									{contact?.contactName || "N/A"}
								</p>
							</div>
						</div>
					);
				},
			});
		}

		items.push({
			accessorKey: "actions",
			enableSorting: false,
			enableHiding: false,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("list.actions")} />
			),
			cell: ({ row }) => {
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon">
								<Ellipsis />
							</Button>
						</DropdownMenuTrigger>

						<DropdownMenuContent align="end">
							<DropdownMenuLabel>{t("list.actions")}</DropdownMenuLabel>
							<DropdownMenuSeparator />

							<DropdownMenuGroup>
								<DropdownMenuItem
									onSelect={() => routeTo.detail(row.original.id)}
								>
									<Info />
									{t("button.detail")}
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		});

		return items;
	}, [isMobile, t, routeTo.detail]);

	return (
		<>
			<Head title={t("head_title")} />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{t("page_title")}
						</h1>

						<p className="w-full text-sm md:w-8/12 text-pretty text-muted-foreground">
							{t("page_description")}
						</p>
					</div>
				</div>

				<Separator className="bg-border" />

				<DataTable
					columns={columns}
					data={patients.data}
					toolbar={(table) => <ToolbarTable table={table} />}
					customPagination={(table) => (
						<PaginationTable table={table} metadata={patients.metadata} />
					)}
					currentExpanded={currentExpanded}
				/>

				{selectedPatient && (
					<DetailsContent
						open={formDialog.isOpen}
						onOpenChange={formDialog.onOpenChange}
						patient={selectedPatient}
						appts={selectedPatientAppts}
					/>
				)}
			</PageContainer>
		</>
	);
}
