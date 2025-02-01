import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import {
	cn,
	debounce,
	generateInitials,
	populateQueryParams,
} from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import { router, usePage } from "@inertiajs/react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { type ComponentProps, useCallback, useMemo, useState } from "react";

interface TherapistListCardProps {
	therapist: Therapist;
	isSelected: boolean;
	index: number;
}

function TherapistListCard({
	therapist,
	isSelected,
	index,
}: TherapistListCardProps) {
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
			preserveScroll: true,
			preserveState: true,
			only: ["selectedTherapist", "adminPortal", "flash", "errors"],
		});
	}, [pageURL, therapist.id]);

	return (
		<motion.button
			initial={{ opacity: 0, y: 0 }}
			animate={{ opacity: 1, y: 0, scale: isSelected ? 1.05 : 1 }}
			whileInView={{ opacity: 1 }}
			exit={{ opacity: 0, y: 0 }}
			transition={{ delay: index * 0.1 }}
			whileHover={{ scale: 1.05, transition: { duration: 0.1, delay: 0 } }}
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
		</motion.button>
	);
}

export interface TherapistListProps extends ComponentProps<"div"> {
	therapists: Therapist[];
}

export function TherapistList({ className, therapists }: TherapistListProps) {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();

	// for search therapist
	const [search, setSearch] = useState(
		globalProps?.adminPortal?.currentQuery?.search || "",
	);
	const [isSearching, setIsSearching] = useState(false);
	const updateQueryParams = useCallback(
		debounce((value) => {
			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				...value,
			});

			router.get(
				fullUrl,
				{ ...queryParams },
				{
					preserveScroll: true,
					preserveState: true,
					only: [
						"therapists",
						"selectedTherapist",
						"adminPortal",
						"flash",
						"errors",
					],
					onStart: () => {
						setIsSearching(true);
					},
					onFinish: () => {
						setTimeout(() => {
							setIsSearching(false);
						}, 250);
					},
				},
			);
		}, 500),
		[],
	);
	const onSearch = useCallback(
		(value: string) => {
			setSearch(value);
			updateQueryParams(
				deepTransformKeysToSnakeCase({ search: value, therapist: "" }),
			);
		},
		[updateQueryParams],
	);

	return (
		<div className={cn("space-y-2", className)}>
			<h2 className="text-xs font-semibold tracking-wider uppercase">
				Therapists
			</h2>

			<Input
				type="text"
				placeholder="Search therapist..."
				value={search}
				StartIcon={{ icon: Search }}
				isLoading={isSearching}
				EndIcon={
					search
						? {
								icon: X,
								isButton: true,
								handleOnClick: () => {
									onSearch("");
								},
							}
						: undefined
				}
				onChange={(event) => {
					event.preventDefault();
					onSearch(event.target.value);
				}}
			/>

			<ScrollArea className="w-full max-h-[75dvh] overflow-y-auto">
				<div className="grid gap-2 mx-3">
					{therapists?.length ? (
						therapists.map((therapist, therapistIndex) => (
							<TherapistListCard
								key={therapist.id}
								therapist={therapist}
								index={therapistIndex}
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
