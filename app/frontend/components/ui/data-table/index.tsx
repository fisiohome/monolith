import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	ColumnDef,
	ColumnFiltersState,
	ExpandedState,
	Row,
	SortingState,
	Table as TableTanstack,
	VisibilityState,
} from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { MousePointerClick } from "lucide-react";
import * as React from "react";
import { DataTablePagination } from "./pagination";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	subComponent?: (row: Row<TData>) => React.ReactNode;
	toolbar?: (table: TableTanstack<TData>) => React.ReactNode;
	customPagination?: (table: TableTanstack<TData>) => React.ReactNode;
	currentExpanded?: ExpandedState;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	subComponent,
	toolbar,
	customPagination,
	currentExpanded = {},
}: DataTableProps<TData, TValue>) {
	const [rowSelection, setRowSelection] = React.useState({});
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [expanded, setExpanded] =
		React.useState<ExpandedState>(currentExpanded);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters,
			expanded,
		},
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		onExpandedChange: setExpanded,
		getExpandedRowModel: getExpandedRowModel(),
		getRowCanExpand: (_row) => true,
	});

	return (
		<div className="space-y-4">
			{toolbar?.(table)}

			<div className="border rounded-xl">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id} colSpan={header.colSpan}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>

					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<React.Fragment key={row.id}>
									<TableRow data-state={row.getIsSelected() && "selected"}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>

									{row.getIsExpanded() && subComponent && (
										<TableRow>
											<TableCell
												colSpan={columns.length}
												className="bg-background/75 hover:backdrop-brightness-125"
											>
												{subComponent(row)}
											</TableCell>
										</TableRow>
									)}
								</React.Fragment>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 space-x-1 text-center"
								>
									<div className="flex items-center justify-center space-x-2 text-muted-foreground">
										<MousePointerClick className="size-6" />
										<span>
											Hey there, let's get started by adding the data first.
										</span>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{customPagination ? (
				customPagination(table)
			) : (
				<DataTablePagination table={table} />
			)}
		</div>
	);
}
