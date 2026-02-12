import {
	ChevronFirstIcon,
	ChevronLastIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "lucide-react";
import { type ComponentProps, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { cn } from "@/lib/utils";
import type { Metadata } from "@/types/pagy";

type PaginationProps = {
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

function PageSelection({ currentPage, totalPages, actions }: PaginationProps) {
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

export interface ApptPaginationProps extends ComponentProps<"div"> {
	metadata: Metadata | null;
	actions: {
		goToPrevpage: () => void;
		goToNextPage: () => void;
		onChangeLimit: (value: string) => void;
		goToPage: (value: string) => void;
		goToFirstPage: () => void;
		goToLastPage: () => void;
	};
}

export default function ApptPagination({
	className,
	metadata,
	actions,
}: ApptPaginationProps) {
	const { t } = useTranslation("appointments");
	const { t: tp } = useTranslation("translation", {
		keyPrefix: "components.pagination",
	});
	const isLimitDisabled = useMemo(
		() => !metadata?.limit || !metadata?.count,
		[metadata?.limit, metadata?.count],
	);

	return (
		<div
			className={cn(
				"flex flex-col md:flex-row justify-between w-full md:w-auto text-muted-foreground gap-6 md:gap-2",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-2 space-x-2 md:justify-end lg:col-end-9 2xl:col-end-10">
				<p className="text-sm text-nowrap">{tp("rows_per_page")}</p>

				<Select
					value={String(metadata?.limit)}
					disabled={isLimitDisabled}
					onValueChange={(value) => {
						actions.onChangeLimit(value);
					}}
				>
					<SelectTrigger className="bg-background h-8 w-[70px]">
						<SelectValue placeholder={metadata?.limit} />
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

			<div className="flex flex-col items-center justify-between w-full gap-4 md:flex-row md:justify-end md:w-auto">
				<span className="text-sm text-nowrap">
					{t("pagination.showing")} {metadata?.from}–{metadata?.to} {tp("of")}{" "}
					{metadata?.count} {t("pagination.appointments")}
				</span>

				{metadata?.page && metadata?.pages && (
					<PageSelection
						currentPage={metadata.page}
						totalPages={metadata.pages}
						actions={actions}
					/>
				)}
			</div>
		</div>
	);
}
