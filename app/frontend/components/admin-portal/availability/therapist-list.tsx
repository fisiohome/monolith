import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, generateInitials, populateQueryParams } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import { router, usePage } from "@inertiajs/react";
import { type ComponentProps, useCallback, useMemo } from "react";

interface TherapistListCardProps {
	therapist: Therapist;
	isSelected: boolean;
}

function TherapistListCard({ therapist, isSelected }: TherapistListCardProps) {
	const { url: pageURL } = usePage<GlobalPageProps>();

	const initials = useMemo(
		() => generateInitials(therapist.name),
		[therapist.name],
	);
	const setSelectedTherapist = useCallback(() => {
		const { queryParams } = populateQueryParams(pageURL, {
			therapist: therapist.id,
		});
		router.get(pageURL, queryParams, {
			only: ["selectedTherapist", "adminPortal"],
		});
	}, [pageURL, therapist.id]);

	return (
		<button
			type="button"
			className={cn(
				"flex items-center gap-2 p-2 font-semibold border rounded-md shadow-inner cursor-pointer text-muted-foreground bg-background border-border hover:shadow-xl hover:text-primary-foreground hover:bg-primary hover:ring-1 hover:ring-primary first:mt-2 last:mb-2 hover:no-underline hover:ring-offset-2 hover:ring-offset-background hover:scale-105 transition-all",
				isSelected
					? "shadow-xl text-primary-foreground bg-primary scale-105"
					: "",
			)}
			onClick={setSelectedTherapist}
		>
			<Avatar className="w-8 h-8 border rounded-lg">
				<AvatarImage src="#" alt={therapist.name} />
				<AvatarFallback className="text-xs rounded-lg text-accent-foreground bg-accent">
					{initials}
				</AvatarFallback>
			</Avatar>

			<div className="flex-1 space-y-0.5 text-sm leading-tight text-left">
				<p className="font-semibold uppercase truncate">{therapist.name}</p>
				<p className="text-[10px] font-light">
					{therapist.employmentType} |{" "}
					{therapist.service.name.replaceAll("_", " ")}
				</p>
			</div>
		</button>
	);
}

export interface TherapistListProps extends ComponentProps<"div"> {
	therapists: Therapist[];
}

export function TherapistList({ className, therapists }: TherapistListProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	return (
		<div className={cn("space-y-2", className)}>
			<h2 className="text-xs font-semibold tracking-wider uppercase">
				Therapists
			</h2>

			<ScrollArea className="w-full max-h-[85dvh] overflow-y-auto">
				<div className="grid gap-2 mx-3">
					{therapists?.length ? (
						therapists.map((therapist) => (
							<TherapistListCard
								key={therapist.id}
								therapist={therapist}
								isSelected={
									globalProps.adminPortal.currentQuery?.therapist ===
									therapist.id
								}
							/>
						))
					) : (
						<p className="mx-auto text-sm text-center text-muted-foreground">
							There are no active therapists yet. Let's start by activating an
							existing therapist or adding a new one.
						</p>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
