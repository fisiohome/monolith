import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
} from "@/components/ui/pagination";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { populateQueryParams } from "@/lib/utils";
import type { Metadata } from "@/types/pagy";
import { router } from "@inertiajs/react";
import type { Table } from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface DataTablePaginationProps<TData> {
	table: Table<TData>;
	metadata: Metadata;
}

export default function PaginationTable<TData>({
	table,
	metadata,
}: DataTablePaginationProps<TData>) {
	const { t } = useTranslation("translation", {
		keyPrefix: "components.pagination",
	});

	return (
		<div className="grid items-center grid-cols-2 gap-6 lg:grid-cols-12 text-muted-foreground">
			<div className="text-nowrap">
				{table.getFilteredSelectedRowModel().rows.length ? (
					<div className="flex-1 text-sm">
						{table.getFilteredSelectedRowModel().rows.length} {t("of")}{" "}
						{metadata.count} {t("row_selected")}
					</div>
				) : (
					<div className="flex-1 text-sm">
						<div>
							{metadata.count} {t("records_found")}
						</div>
					</div>
				)}
			</div>

			<div className="flex items-center justify-end space-x-2 lg:col-end-9 2xl:col-end-10">
				<p className="text-sm text-nowrap">{t("rows_per_page")}</p>
				<Select
					value={`${metadata.limit}`}
					onValueChange={(value) => {
						const { fullUrl } = populateQueryParams(metadata.pageUrl, {
							limit: value,
						});
						router.get(fullUrl, {}, { preserveState: true });
					}}
				>
					<SelectTrigger className="bg-background h-8 w-[70px]">
						<SelectValue placeholder={metadata.limit} />
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

			<div className="flex items-center justify-center col-span-2 gap-2 lg:col-end-13 lg:justify-end">
				<div className="lg:flex w-[100px] items-center text-sm hidden whitespace-nowrap">
					{t("page")} {metadata.page} {t("of")} {metadata.pages}
				</div>

				<div className="flex items-center space-x-2">
					<Pagination>
						<PaginationContent>
							<PaginationItem className="flex space-x-1">
								{/* <PaginationPrevious href="#" /> */}
								<Button
									variant="outline"
									className="w-8 h-8 p-0"
									onClick={() =>
										router.get(metadata.firstUrl, {}, { preserveState: true })
									}
									disabled={!metadata.prev}
								>
									<span className="sr-only">{t("go_to_first")}</span>
									<ChevronsLeft />
								</Button>
								<Button
									variant="outline"
									className="w-8 h-8 p-0"
									onClick={() =>
										router.get(metadata.prevUrl, {}, { preserveState: true })
									}
									disabled={!metadata.prev}
								>
									<span className="sr-only">{t("go_to_previous")}</span>
									<ChevronLeft />
								</Button>
							</PaginationItem>

							<PaginationItem>
								<Popover>
									<PopoverTrigger asChild disabled={metadata.pages <= 1}>
										<Button variant="outline" size="icon">
											{metadata.pages <= 1 ? (
												<PaginationLink href="#" isActive>
													1
												</PaginationLink>
											) : (
												<PaginationEllipsis />
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-full">
										<div className="grid gap-4">
											<div className="grid gap-2">
												<div className="flex items-center w-[180px] gap-4">
													<Label htmlFor="goto" className="text-nowrap">
														{t("go_to_page")}
													</Label>
													<Input
														id="goto"
														type="number"
														defaultValue={metadata.page}
														min={metadata.from}
														max={metadata.last}
														className="h-8"
														onChange={(event) => {
															event.preventDefault();

															const value = event.target.value;

															if (!value) return;
															router.get(
																metadata.pageUrl,
																{ page: Number(value) },
																{ preserveState: true },
															);
														}}
													/>
												</div>
											</div>
										</div>
									</PopoverContent>
								</Popover>
							</PaginationItem>

							<PaginationItem className="flex space-x-1">
								{/* <PaginationNext href="#" /> */}
								<Button
									variant="outline"
									className="w-8 h-8 p-0"
									onClick={() =>
										router.get(metadata.nextUrl, {}, { preserveState: true })
									}
									disabled={!metadata.next}
								>
									<span className="sr-only">{t("go_to_next")}</span>
									<ChevronRight />
								</Button>
								<Button
									variant="outline"
									className="w-8 h-8 p-0"
									onClick={() =>
										router.get(metadata.lastUrl, {}, { preserveState: true })
									}
									disabled={!metadata.next}
								>
									<span className="sr-only">{t("go_to_last")}</span>
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
