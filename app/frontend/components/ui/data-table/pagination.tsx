import { Button } from "@/components/ui/button";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
} from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Table } from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";

interface DataTablePaginationProps<TData> {
	table: Table<TData>;
}

export function DataTablePagination<TData>({
	table,
}: DataTablePaginationProps<TData>) {
	return (
		<div className="flex items-center justify-between text-muted-foreground">
			{table.getFilteredSelectedRowModel().rows.length ? (
				<div className="flex-1 text-sm">
					{table.getFilteredSelectedRowModel().rows.length} of{" "}
					{table.getFilteredRowModel().rows.length} row(s) selected.
				</div>
			) : (
				<div className="flex-1 text-sm">
					<div>{table.getFilteredRowModel().rows.length} records found</div>
				</div>
			)}

			<div className="flex items-center space-x-6 lg:space-x-8">
				<div className="flex items-center space-x-2">
					<p className="text-sm">Rows per page</p>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
					>
						<SelectTrigger className="bg-background h-8 w-[70px]">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{[5, 10, 25, 50, 100].map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex w-[100px] items-center justify-center text-sm">
					Page {table.getState().pagination.pageIndex + 1} of{" "}
					{table.getPageCount()}
				</div>

				<div className="flex items-center space-x-2">
					<Pagination>
						<PaginationContent>
							<PaginationItem className="flex space-x-1">
								{/* <PaginationPrevious href="#" /> */}
								<Button
									variant="outline"
									className="hidden w-8 h-8 p-0 lg:flex"
									onClick={() => table.setPageIndex(0)}
									disabled={!table.getCanPreviousPage()}
								>
									<span className="sr-only">Go to first page</span>
									<ChevronsLeft />
								</Button>
								<Button
									variant="outline"
									className="w-8 h-8 p-0"
									onClick={() => table.previousPage()}
									disabled={!table.getCanPreviousPage()}
								>
									<span className="sr-only">Go to previous page</span>
									<ChevronLeft />
								</Button>
							</PaginationItem>

							<PaginationItem>
								<PaginationLink href="#" isActive>
									1
								</PaginationLink>
							</PaginationItem>

							{table.getPageCount() > 1 && (
								<PaginationItem>
									<PaginationEllipsis />
								</PaginationItem>
							)}

							<PaginationItem className="flex space-x-1">
								{/* <PaginationNext href="#" /> */}
								<Button
									variant="outline"
									className="w-8 h-8 p-0"
									onClick={() => table.nextPage()}
									disabled={!table.getCanNextPage()}
								>
									<span className="sr-only">Go to next page</span>
									<ChevronRight />
								</Button>
								<Button
									variant="outline"
									className="hidden w-8 h-8 p-0 lg:flex"
									onClick={() => table.setPageIndex(table.getPageCount() - 1)}
									disabled={!table.getCanNextPage()}
								>
									<span className="sr-only">Go to last page</span>
									<ChevronsRight />
								</Button>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			</div>
		</div>
	);
}
