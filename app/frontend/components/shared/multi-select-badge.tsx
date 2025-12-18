import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

type WithLabel = {
	label: string;
	[key: string]: any; // Additional properties allowed
};

export interface MultiSelectBadgesProps extends ComponentProps<"div"> {
	items: WithLabel[];
	placeholder: string;
	maxShows: number;
	onRemoveRestAll: (values: WithLabel[]) => void;
	onRemoveSingle: (values: WithLabel[]) => void;
}

export default function MultiSelectBadges({
	items,
	placeholder,
	maxShows = 1,
	onRemoveRestAll,
	onRemoveSingle,
}: MultiSelectBadgesProps) {
	return (
		<div className="flex w-full gap-1 truncate">
			{items?.length ? (
				items?.map((service, index) => {
					if (index > maxShows && maxShows !== -1) return;

					if (index === maxShows && maxShows !== -1) {
						return (
							<Badge
								key={`${service.label}-rest-badge`}
								className={cn(
									"px-1 rounded-sm flex items-center gap-1",
									items?.length === index + maxShows && "mr-3",
								)}
								variant={"outline"}
							>
								<span className="text-xs">
									+ {items.length - maxShows} items
								</span>

								<button
									type="button"
									aria-label="Remove rest all option"
									className="inline-flex"
									onClick={(event) => {
										event.preventDefault();
										event.stopPropagation();

										const values = [...items]
											.slice(0, maxShows)
											.filter(Boolean);
										onRemoveRestAll(values);
									}}
								>
									<span className="sr-only">Remove rest all option</span>
									<X className="w-4 h-4 hover:stroke-destructive" />
								</button>
							</Badge>
						);
					}

					return (
						<Badge
							key={`${service.label}-badge`}
							className={cn(
								"px-1 rounded-sm flex items-center gap-1",
								items?.length === index + maxShows && "mr-3",
							)}
							variant={"outline"}
						>
							<span className="text-xs">{service.label}</span>

							<button
								type="button"
								aria-label={`Remove ${service.label} option`}
								className="inline-flex"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();

									const values = [...items]
										.filter((_, fIndex) => index !== fIndex)
										.filter(Boolean);
									onRemoveSingle(values);
								}}
							>
								<span className="sr-only">Remove {service.label} option</span>
								<X className="w-4 h-4 hover:stroke-destructive" />
							</button>
						</Badge>
					);
				})
			) : (
				<span>{placeholder}</span>
			)}
		</div>
	);
}
