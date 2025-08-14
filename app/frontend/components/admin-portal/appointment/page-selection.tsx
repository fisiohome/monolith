import {
	ChevronFirstIcon,
	ChevronLastIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "lucide-react";

import {
	Pagination,
	PaginationContent,
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

export type PaginationProps = {
	currentPage: number;
	totalPages: number;
	paginationItemsToDisplay?: number;
	actions: {
		goToPrevpage: () => void;
		goToNextPage: () => void;
		goToPage: (value: string) => void;
		goToFirstPage: () => void;
		goToLastPage: () => void;
	};
};

export default function PageSelection({
	currentPage,
	totalPages,
	actions,
}: PaginationProps) {
	return (
		<Pagination>
			<PaginationContent>
				{/* First page button */}
				<PaginationItem>
					<PaginationLink
						className="cursor-pointer bg-background border border-input rounded-md shadow ring-offset-background aria-disabled:pointer-events-none aria-disabled:opacity-50"
						aria-label="Go to first page"
						aria-disabled={currentPage === 1}
						onClick={actions.goToFirstPage}
					>
						<ChevronFirstIcon size={16} aria-hidden="true" />
					</PaginationLink>
				</PaginationItem>

				{/* Previous page button */}
				<PaginationItem>
					<PaginationLink
						className="cursor-pointer bg-background border border-input rounded-md shadow ring-offset-background aria-disabled:pointer-events-none aria-disabled:opacity-50"
						aria-label="Go to previous page"
						aria-disabled={currentPage === 1}
						onClick={actions.goToPrevpage}
					>
						<ChevronLeftIcon size={16} aria-hidden="true" />
					</PaginationLink>
				</PaginationItem>

				{/* Page number select */}
				<PaginationItem>
					<Select
						value={String(currentPage)}
						aria-label="Select page"
						onValueChange={(value) => {
							actions.goToPage(value);
						}}
					>
						<SelectTrigger id="select-page" className="w-fit whitespace-nowrap">
							<SelectValue placeholder="Select page" />
						</SelectTrigger>
						<SelectContent>
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(
								(page) => (
									<SelectItem key={page} value={String(page)}>
										Page {page} of {totalPages}
									</SelectItem>
								),
							)}
						</SelectContent>
					</Select>
				</PaginationItem>

				{/* Next page button */}
				<PaginationItem>
					<PaginationLink
						className="cursor-pointer bg-background border border-input rounded-md shadow ring-offset-background aria-disabled:pointer-events-none aria-disabled:opacity-50"
						aria-label="Go to next page"
						aria-disabled={currentPage === totalPages}
						onClick={actions.goToNextPage}
					>
						<ChevronRightIcon size={16} aria-hidden="true" />
					</PaginationLink>
				</PaginationItem>

				{/* Last page button */}
				<PaginationItem>
					<PaginationLink
						className="cursor-pointer bg-background border border-input rounded-md shadow ring-offset-background aria-disabled:pointer-events-none aria-disabled:opacity-50"
						aria-label="Go to last page"
						aria-disabled={currentPage === totalPages}
						onClick={actions.goToLastPage}
					>
						<ChevronLastIcon size={16} aria-hidden="true" />
					</PaginationLink>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
