import columns from "@/components/admin-portal/admin/data-table-column";
import ExpandSubTable from "@/components/admin-portal/admin/data-table-expand";
import PaginationTable from "@/components/admin-portal/admin/data-table-pagination";
import ToolbarTable from "@/components/admin-portal/admin/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { populateQueryParams } from "@/lib/utils";
import type { Admin } from "@/types/admin-portal/admin";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";
import { Head, Link, router, usePage } from "@inertiajs/react";
import type { Row } from "@tanstack/react-table";
import type { Table as TableTanstack } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Fragment, useMemo } from "react";

export interface PageProps {
	admins: {
		data: Admin[];
		metadata: Metadata;
	};
}
export type TableRowDataProps = Row<PageProps["admins"]["data"][number]>;
export type TableToolbarDataProps = TableTanstack<
	PageProps["admins"]["data"][number]
>;

// TODO: table actions
// TODO: table filter by
// TODO: theme toggle
export default function Index({ admins }: PageProps) {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();

	// tabs management
	const tabActive = useMemo(
		() =>
			globalProps?.adminPortal?.currentQuery?.filterByAccountStatus || "all",
		[globalProps?.adminPortal?.currentQuery?.filterByAccountStatus],
	);
	const tabList = useMemo(() => {
		return [
			{
				text: "All",
				value: "all",
			},
			{
				text: "Active",
				value: "active",
			},
			{
				text: "Suspended",
				value: "suspended",
			},
		] as const;
	}, []);
	const handleTabClick = (value: (typeof tabList)[number]["value"]) => {
		const baseUrl = pageURL.split("?")[0];
		const { fullUrl, queryParams } = populateQueryParams(baseUrl, {
			filter_by_account_status: value,
		});

		router.get(
			fullUrl,
			{ ...queryParams },
			{ replace: true, preserveState: true, only: ["admins"] },
		);
	};

	// data table management
	const isSuperAdmin = useMemo(
		() => globalProps.auth.currentUser?.adminType === "SUPER_ADMIN",
		[globalProps.auth.currentUser?.adminType],
	);
	const handleDelete = (row: TableRowDataProps) => {
		console.log(`Deleting the Admin ${row.original.user.email}...`);
		router.delete(
			`${globalProps.adminPortal.router.adminPortal.adminManagement.index}/${row.original.id}`,
			{
				data: row.original,
			},
		);
		console.log(
			`Successfully to deleted the Admin ${row.original.user.email}...`,
		);
	};
	console.log(globalProps);

	return (
		<>
			<Head title="Admin Management" />
			<article className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6 space-y-4">
				<section className="flex items-center justify-between">
					<h1 className="text-2xl font-bold tracking-tight">Admins</h1>
					{isSuperAdmin && (
						<Button asChild>
							<Link
								href={
									globalProps.adminPortal.router.adminPortal.adminManagement.new
								}
							>
								<Plus />
								Add Admin
							</Link>
						</Button>
					)}
				</section>

				<section className="min-w-full">
					<Tabs defaultValue={tabActive}>
						<TabsList>
							{tabList.map((tab) => (
								<Fragment key={tab.value}>
									<TabsTrigger
										value={tab.value}
										onClick={() => handleTabClick(tab.value)}
									>
										{tab.text}
									</TabsTrigger>
								</Fragment>
							))}
						</TabsList>

						{tabList.map((tab) => (
							<Fragment key={tab.value}>
								<TabsContent value={tab.value}>
									<DataTable
										columns={columns({
											isSuperAdmin,
											handleDelete,
											globalProps,
										})}
										data={admins.data}
										toolbar={(table) => <ToolbarTable table={table} />}
										subComponent={(row) => (
											<ExpandSubTable
												row={row}
												isSuperAdmin={isSuperAdmin}
												handleDelete={handleDelete}
											/>
										)}
										customPagination={(table) => (
											<PaginationTable
												table={table}
												metadata={admins.metadata}
											/>
										)}
									/>
								</TabsContent>
							</Fragment>
						))}
					</Tabs>
				</section>
			</article>
		</>
	);
}
