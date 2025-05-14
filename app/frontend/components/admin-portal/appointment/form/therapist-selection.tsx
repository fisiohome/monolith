import { LoadingBasic } from "@/components/shared/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/extended/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TherapistOption } from "@/hooks/admin-portal/appointment/use-appointment-utils";
import { getGenderIcon } from "@/hooks/use-gender";
import { DEFAULT_VALUES_THERAPIST } from "@/lib/appointments/form";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { Therapist } from "@/types/admin-portal/therapist";
import { useDebounce } from "@uidotdev/usehooks";
import {
	ChevronsRight,
	Search,
	Sparkles,
	Stethoscope,
	User,
} from "lucide-react";
import {
	forwardRef,
	Fragment,
	memo,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ComponentProps,
} from "react";

// * button selection list
type TherapistSelectButtonProps = {
	selected: boolean;
	onSelect: () => void;
	regNumbers?: string[];
	className?: string;
	children: React.ReactNode;
} & React.ComponentPropsWithoutRef<"button">;

const TherapistSelectButton = forwardRef<
	HTMLButtonElement,
	TherapistSelectButtonProps
>(({ selected, onSelect, regNumbers, className, children, ...props }, ref) => (
	<button
		ref={ref}
		type="button"
		className={cn(
			"w-full border rounded-lg bg-background border-border transition-all relative",
			selected &&
				"border-primary-foreground bg-primary text-primary-foreground",
			className,
		)}
		onClick={(event) => {
			event.preventDefault();
			event.stopPropagation();
			onSelect();
		}}
		{...props}
	>
		{!!regNumbers?.length && (
			<div
				className={cn(
					"absolute top-0 left-0 z-10 flex items-center p-0 px-1 rounded-br-md text-[10px] lowercase border-b border-r",
					"text-yellow-900",
				)}
				style={{
					background: "linear-gradient(90deg, #fef08a 0%, #fde047 100%)",
					borderColor: "#fde047",
				}}
			>
				<Sparkles className="flex-shrink-0 size-3 text-yellow-700 mt-0.5 mr-1" />
				{regNumbers.map((reg, idx) => (
					<span
						key={reg}
						className={cn(
							"font-semibold uppercase",
							idx > 0 && "before:content-['/'] before:mx-0.5",
						)}
					>
						{reg}
					</span>
				))}
			</div>
		)}

		{children}
	</button>
));

// * card therapist component
interface CardTherapistProps extends ComponentProps<"div"> {
	therapist: Pick<
		Therapist,
		"registrationNumber" | "id" | "gender" | "name" | "employmentType"
	>;
}

function CardTherapist({ className, therapist }: CardTherapistProps) {
	return (
		<div className={cn("p-2 text-left", className)}>
			<div className="flex gap-2">
				<Avatar className="border rounded-lg border-border bg-muted size-12">
					<AvatarImage src="#" />
					<AvatarFallback className="flex flex-col">
						<User className="flex-shrink-0 size-5 text-muted-foreground/75" />
						<span className="text-[10px] leading-none mt-1 text-muted-foreground">
							{therapist.registrationNumber}
						</span>
					</AvatarFallback>
				</Avatar>

				<div>
					<div className="flex gap-1">
						<Badge
							variant="outline"
							className="font-light text-[10px] text-inherit p-0 px-1 mb-1"
						>
							{therapist?.gender &&
								getGenderIcon(
									therapist.gender,
									"flex-shrink-0 size-2.5 text-inherit/75 mr-0.5",
								)}

							<span>{therapist?.gender || "N/A"}</span>
						</Badge>

						<Badge
							variant="outline"
							className="font-light text-[10px] text-inherit p-0 px-1 mb-1 uppercase"
						>
							<span>{therapist?.employmentType || "N/A"}</span>
						</Badge>
					</div>

					<p className="tracking-wide uppercase line-clamp-1">
						{therapist.name}
					</p>
				</div>
			</div>
		</div>
	);
}

// * empty therapist component
function EmptyTherapists() {
	return (
		<div>
			<p className="flex items-center gap-1.5 justify-center">
				<Stethoscope className="text-muted-foreground/75 size-4" />
				There are no therapists available
			</p>
		</div>
	);
}

// * core component
export interface TherapistSelectionProps extends ComponentProps<"div"> {
	value: string | undefined;
	isLoading: boolean;
	therapists: TherapistOption[];
	isDisabledFind: boolean;
	appt?: Appointment;
	height?: number;
	onFindTherapists: () => void;
	onSelectTherapist: (value: { id: string; name: string }) => void;
}

const TherapistSelection = memo(function Component({
	className,
	value,
	isLoading,
	therapists,
	isDisabledFind,
	appt,
	height = 430,
	onFindTherapists,
	onSelectTherapist,
}: TherapistSelectionProps) {
	const [search, setSearch] = useState("");
	const debouncedSearchTerm = useDebounce(search, 300);
	// Filter by search term first
	const filteredTherapists = therapists.filter((t) => {
		if (debouncedSearchTerm) {
			return t.name.includes(debouncedSearchTerm);
		}
		return true;
	});
	const allVisitIds = new Set(appt?.allVisits?.map((v) => v.id) || []);

	// Use a single loop to split therapists into suggested (onSeries) and other
	const { suggestedTherapists, otherTherapists } = filteredTherapists.reduce(
		(acc, therapist) => {
			const isSuggested = therapist.appointments?.some((ap) =>
				allVisitIds.has(ap.id),
			);
			if (isSuggested) {
				acc.suggestedTherapists.push(therapist);
			} else {
				acc.otherTherapists.push(therapist);
			}

			return acc;
		},
		{ suggestedTherapists: [], otherTherapists: [] } as {
			suggestedTherapists: TherapistOption[];
			otherTherapists: TherapistOption[];
		},
	);
	// Helper to get appointemnt registration numbers for a therapist assigned in this appointment's series
	const getAssignedRegistrationNumbers = useCallback(
		(therapist: TherapistOption, appt?: Appointment) => {
			if (!therapist?.appointments || !appt?.allVisits) return [];

			const assigned = therapist.appointments.filter((ap) =>
				appt?.allVisits?.some((v) => v.id === ap.id),
			);
			// Collect unique appointemnt registration numbers
			const regNumbers = Array.from(
				new Set(assigned.map((ap) => ap.registrationNumber).filter(Boolean)),
			);
			return regNumbers.length > 0 ? regNumbers : [];
		},
		[],
	);

	// Track a ref for each therapist button by therapist.id
	const therapistRefs = useRef<{ [id: string]: HTMLButtonElement | null }>({});
	// Auto-scroll effect for selected therapist
	useEffect(() => {
		if (!value) return;
		// Find the therapist by name
		const therapist = therapists.find((t) => t.name === value);
		if (therapist && therapistRefs.current[therapist.id]) {
			therapistRefs.current[therapist.id]?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		}
	}, [value, therapists]);

	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<Button
				type="button"
				effect="shine"
				iconPlacement="right"
				className="w-full"
				icon={ChevronsRight}
				disabled={isDisabledFind}
				onClick={(event) => {
					event.preventDefault();
					onFindTherapists();
				}}
			>
				Find the Available Therapists
			</Button>

			<ScrollArea
				className="relative p-3 text-sm border rounded-md border-borderder bg-sidebar text-muted-foreground"
				style={{ height: height }}
			>
				{!isLoading && therapists?.length > 0 && (
					<div className="sticky top-0 z-10 pb-2 bg-sidebar mb-[0.5rem]">
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							type="text"
							placeholder="Search by name..."
							className="mb-0 shadow-none"
						>
							<Input.Group>
								<Input.LeftIcon>
									<Search />
								</Input.LeftIcon>
							</Input.Group>
						</Input>
					</div>
				)}

				<div className="grid gap-2 ">
					{isLoading ? (
						<LoadingBasic columnBased />
					) : therapists?.length ? (
						<Fragment>
							{suggestedTherapists.length > 0 && (
								<div>
									<p className="mb-1 text-xs font-semibold tracking-wide uppercase">
										Suggested Therapist
									</p>

									<div className="grid gap-2">
										{suggestedTherapists.map((t) => {
											const regNumbers = getAssignedRegistrationNumbers(
												t,
												appt,
											);

											return (
												<TherapistSelectButton
													key={t.id}
													ref={(el) => {
														therapistRefs.current[t.id] = el;
													}}
													selected={value === t.name}
													onSelect={() =>
														value === t.name
															? onSelectTherapist(DEFAULT_VALUES_THERAPIST)
															: onSelectTherapist({ id: t.id, name: t.name })
													}
													regNumbers={regNumbers}
												>
													<CardTherapist
														therapist={{
															name: t.name,
															gender: t.gender,
															id: t.id,
															registrationNumber: t.registrationNumber,
															employmentType: t.employmentType,
														}}
														className={cn(!!regNumbers?.length && "mt-5")}
													/>
												</TherapistSelectButton>
											);
										})}
									</div>
								</div>
							)}

							{otherTherapists.length > 0 && (
								<div className={cn(!!suggestedTherapists?.length && "mt-1")}>
									{!!suggestedTherapists?.length && (
										<p className="mb-1 text-xs font-semibold tracking-wide uppercase">
											Other
										</p>
									)}

									<div className="grid gap-2">
										{otherTherapists.map((t) => (
											<TherapistSelectButton
												key={t.id}
												ref={(el) => {
													therapistRefs.current[t.id] = el;
												}}
												selected={value === t.name}
												onSelect={() =>
													value === t.name
														? onSelectTherapist(DEFAULT_VALUES_THERAPIST)
														: onSelectTherapist({ id: t.id, name: t.name })
												}
											>
												<CardTherapist
													therapist={{
														name: t.name,
														gender: t.gender,
														id: t.id,
														registrationNumber: t.registrationNumber,
														employmentType: t.employmentType,
													}}
												/>
											</TherapistSelectButton>
										))}
									</div>
								</div>
							)}
						</Fragment>
					) : value ? (
						<div className="p-2 border rounded-lg border-primary-foreground bg-primary text-primary-foreground">
							{appt?.therapist && (
								<CardTherapist
									therapist={{
										name: appt.therapist.name,
										gender: appt.therapist.gender,
										id: appt.therapist.id,
										registrationNumber: appt.therapist.registrationNumber,
										employmentType: appt.therapist.employmentType,
									}}
								/>
							)}
						</div>
					) : (
						<EmptyTherapists />
					)}
				</div>
			</ScrollArea>
		</div>
	);
});
export default TherapistSelection;
