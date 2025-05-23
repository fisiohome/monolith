import type { ComponentProps } from "react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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

								{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
								<span
									aria-label="Remove rest all option"
									aria-roledescription="button to remove rest all option"
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
								</span>
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

							{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
							<span
								aria-label={`Remove ${service.label} option`}
								aria-roledescription="button to remove option"
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
							</span>
						</Badge>
					);
				})
			) : (
				<span>{placeholder}</span>
			)}
		</div>
	);
}
