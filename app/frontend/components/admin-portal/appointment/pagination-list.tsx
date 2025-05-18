import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Metadata } from "@/types/pagy";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ComponentProps, useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface ApptPaginationProps extends ComponentProps<"div"> {
	metadata: Metadata | null;
	actions: {
		goToPrevpage: () => void;
		goToNextPage: () => void;
		onChangeLimit: (value: string) => void;
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
	const isPrevDisabled = useMemo(() => !metadata?.prev, [metadata?.prev]);
	const isNextDisabled = useMemo(() => !metadata?.next, [metadata?.next]);
	const isLimitDisabled = useMemo(
		() => !metadata?.limit || !metadata?.count,
		[metadata?.limit, metadata?.count],
	);

	return (
		<div
			className={cn(
				"flex flex-col md:flex-row justify-between w-full md:w-auto text-muted-foreground gap-4 md:gap-2",
				className,
			)}
		>
			<div className="flex items-center justify-between w-full gap-4 md:justify-end md:w-auto">
				<span className="text-sm text-nowrap">
					{t("pagination.showing")} {metadata?.from}–{metadata?.to} {tp("of")}{" "}
					{metadata?.count} {t("pagination.appointments")}
				</span>

				<div className="flex gap-2">
					<Button
						variant="outline"
						className="p-0 size-8"
						disabled={isPrevDisabled}
						onClick={actions.goToPrevpage}
					>
						<ChevronLeft />
					</Button>

					<Button
						variant="outline"
						className="p-0 size-8"
						disabled={isNextDisabled}
						onClick={actions.goToNextPage}
					>
						<ChevronRight />
					</Button>
				</div>
			</div>

			<div className="flex items-center justify-end space-x-2 lg:col-end-9 2xl:col-end-10">
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
		</div>
	);
}
