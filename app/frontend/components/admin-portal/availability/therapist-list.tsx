import { router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { motion } from "framer-motion";
import { Info, Search, X } from "lucide-react";
import {
	type ComponentProps,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { IS_DEKSTOP_MEDIA_QUERY, IS_TABLET_MEDIA_QUERY } from "@/lib/constants";
import {
	cn,
	debounce,
	generateInitials,
	populateQueryParams,
} from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

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
	const isTablet = useMediaQuery(IS_TABLET_MEDIA_QUERY);
	const isDekstop = useMediaQuery(IS_DEKSTOP_MEDIA_QUERY);

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
			only: ["selectedTherapist", "adminPortal", "flash"],
		});
	}, [pageURL, therapist.id]);

	return (
		<motion.button
			initial={{ opacity: 0, y: 0 }}
			animate={{
				opacity: 1,
				y: 0,
				scale:
					isSelected && (isTablet || isDekstop)
						? 1.02
						: isSelected && (!isTablet || !isDekstop)
							? 1.05
							: 1,
			}}
			exit={{ opacity: 0, y: 0 }}
			transition={{ delay: index * 0.025 }}
			whileTap={{
				scale: isTablet || isDekstop ? 0.97 : 0.95,
				transition: { duration: 0.1, delay: 0 },
			}}
			whileHover={{
				scale: isTablet || isDekstop ? 1.02 : 1.05,
				transition: { duration: 0.1, delay: 0 },
			}}
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
					#{therapist.registrationNumber} | {therapist.employmentType} |{" "}
					{therapist.service.name.replaceAll("_", " ")}
				</p>
			</div>
		</motion.button>
	);
}

export interface TherapistListProps extends ComponentProps<"div"> {
	therapists: Therapist[];
	metadata?: Metadata;
}

export function TherapistList({
	className,
	therapists,
	metadata,
}: TherapistListProps) {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();

	// Accumulated therapists from all loaded pages
	const [allTherapists, setAllTherapists] = useState<Therapist[]>(therapists);
	const [currentMeta, setCurrentMeta] = useState<Metadata | undefined>(
		metadata,
	);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	// Ref for tracking search changes to reset accumulated list
	const lastSearchRef = useRef(
		globalProps?.adminPortal?.currentQuery?.search || "",
	);

	// Sync when props change (initial load, search, or page navigation)
	useEffect(() => {
		const currentSearch = globalProps?.adminPortal?.currentQuery?.search || "";

		if (currentSearch !== lastSearchRef.current) {
			// Search changed — reset the accumulated list
			setAllTherapists(therapists);
			lastSearchRef.current = currentSearch;
		} else if (currentMeta?.page === 1 && metadata?.page === 1) {
			// Fresh load (page 1) — reset
			setAllTherapists(therapists);
		}
		setCurrentMeta(metadata);
	}, [
		therapists,
		metadata,
		currentMeta?.page,
		globalProps?.adminPortal?.currentQuery?.search,
	]);

	// Intersection Observer for infinite scroll
	const sentinelRef = useRef<HTMLDivElement>(null);

	const loadMore = useCallback(() => {
		if (isLoadingMore || !currentMeta?.next) return;

		setIsLoadingMore(true);
		const { fullUrl, queryParams } = populateQueryParams(pageURL, {
			page: String(currentMeta?.next),
		});

		router.get(
			fullUrl,
			{ ...queryParams },
			{
				preserveScroll: true,
				preserveState: true,
				only: ["therapists", "adminPortal"],
				onSuccess: (page) => {
					const newData = (
						page.props as unknown as {
							therapists: { data: Therapist[]; metadata: Metadata };
						}
					).therapists;
					setAllTherapists((prev) => [...prev, ...newData.data]);
					setCurrentMeta(newData.metadata);
				},
				onFinish: () => {
					setIsLoadingMore(false);
				},
			},
		);
	}, [isLoadingMore, currentMeta?.next, pageURL]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && currentMeta?.next) {
					loadMore();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [loadMore, currentMeta?.next]);

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
				deepTransformKeysToSnakeCase({
					search: value,
					therapist: "",
					page: "",
				}),
			);
		},
		[updateQueryParams],
	);

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex gap-1.5">
				<h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
					Therapists
				</h2>
				<TooltipProvider>
					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<Info className="align-top cursor-pointer size-3" />
						</TooltipTrigger>
						<TooltipContent>
							<p>Only displays active therapists</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			<Input
				type="text"
				placeholder="Search by name or reg number..."
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

			<ScrollArea className="w-full max-h-[40dvh] xl:max-h-[100dvh] overflow-y-auto">
				<div className="grid gap-2 mx-3">
					{allTherapists?.length ? (
						<>
							{allTherapists.map((therapist, therapistIndex) => (
								<TherapistListCard
									key={therapist.id}
									therapist={therapist}
									index={therapistIndex}
									isSelected={
										globalProps.adminPortal.currentQuery?.therapist ===
										therapist.id
									}
								/>
							))}

							{/* Sentinel element for infinite scroll */}
							{currentMeta?.next && (
								<div
									ref={sentinelRef}
									className="flex items-center justify-center py-3"
								>
									{isLoadingMore && (
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<div className="w-4 h-4 border-2 rounded-full animate-spin border-primary border-t-transparent" />
											<span>Loading more...</span>
										</div>
									)}
								</div>
							)}
						</>
					) : (
						<p className="mx-auto mt-2 text-sm text-center text-muted-foreground">
							There are no active therapists yet. Let's start by activating an
							existing therapist or adding a new one.
						</p>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
