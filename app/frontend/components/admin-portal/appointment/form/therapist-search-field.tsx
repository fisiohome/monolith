import { useDebounce } from "@uidotdev/usehooks";
import {
	ChevronDown,
	InfoIcon,
	LoaderIcon,
	Search,
	User,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/extended/input";
import { FormLabel } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TherapistOption } from "@/hooks/admin-portal/appointment/use-appointment-utils";
import { getGenderIcon } from "@/hooks/use-gender";
import { cn } from "@/lib/utils";
import { TimeSlotButton } from "./date-time";

type FormMode = "reschedule" | "new" | "series";

interface TherapistSearchFieldProps {
	formHooks: {
		form: UseFormReturn<any>;
		watchAllOfDayValue: boolean;
		onSelectTherapist?: (
			value: Partial<{ id: string | number; name: string }> | null,
		) => void;
		// Optional properties for reschedule mode
		appointment?: any;
		formSelections?: any;
		setFormSelections?: (value: any) => void;
		selectedTimeSlot?: string | null;
		onSelectTimeSlot?: (timeSlot: string) => void;
	};
	mode?: FormMode;
	locationId?: string;
	serviceId?: string;
	appointmentDateTime?: Date | null;
	// Optional field path for series mode
	fieldPath?: string;
}

export const TherapistSearchField = ({
	formHooks,
	mode = "reschedule",
	locationId,
	serviceId,
	appointmentDateTime,
	fieldPath,
}: TherapistSearchFieldProps) => {
	const { t } = useTranslation("appointments-form");
	const [search, setSearch] = useState("");
	const [employmentType, setEmploymentType] = useState<
		"KARPIS" | "FLAT" | "ALL"
	>("ALL");
	const [therapists, setTherapists] = useState<TherapistOption[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [expandedTimeSlots, setExpandedTimeSlots] = useState<Set<string>>(
		new Set(),
	);
	const [selectedTimeSlotLocal, setSelectedTimeSlotLocal] = useState<
		string | null
	>(null);
	const debouncedSearchTerm = useDebounce(search, 500);

	// Helper function to validate and convert appointmentDateTime to Date
	const getValidDate = useCallback((date: any): Date | null => {
		if (!date) return null;

		if (date instanceof Date) {
			return Number.isNaN(date.getTime()) ? null : date;
		}

		if (typeof date === "string") {
			const parsedDate = new Date(date);
			return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
		}

		return null;
	}, []);

	// Extract watch value to avoid dependency issues
	const watchAllOfDayValue = formHooks.watchAllOfDayValue;

	// Get the correct field path for preferred therapist gender based on mode
	const getPreferredTherapistGenderField = useCallback(() => {
		if (mode === "reschedule") {
			return "preferredTherapistGender";
		} else if (mode === "series") {
			// For series mode, gender is at appointment level
			return "appointmentScheduling.preferredTherapistGender";
		} else {
			// For new appointment mode
			return "appointmentScheduling.preferredTherapistGender";
		}
	}, [mode]);

	const watchPreferredTherapistGender = formHooks.form.watch(
		getPreferredTherapistGenderField(),
	);

	// Fetch therapists from backend when search term changes
	const searchTherapists = useCallback(
		async (query: string, empType: string) => {
			if (query.trim() === "") {
				setTherapists([]);
				return;
			}

			setIsSearching(true);
			try {
				// Build unified search URL for API v1
				const urlParams = new URLSearchParams({
					search_query: query,
					employment_type: empType,
					is_all_of_day: watchAllOfDayValue ? "true" : "false",
				});

				// Add preferred therapist gender if available and valid
				if (watchPreferredTherapistGender) {
					urlParams.set(
						"preferred_therapist_gender",
						watchPreferredTherapistGender,
					);
				}

				if (mode === "reschedule") {
					// For reschedule mode, add appointment_id
					const appointmentId = (formHooks as any).appointment?.id;
					if (!appointmentId) {
						const message = "Appointment ID is required for therapist search";
						console.warn(message);
						toast.error(message);
						setTherapists([]);
						return;
					}
					urlParams.set("appointment_id", appointmentId);
				} else {
					// For new appointment and series modes, validate all required fields
					if (!locationId || !serviceId) {
						const message =
							"Location and Service are required for therapist search";
						console.warn(message);
						toast.error(message);
						setTherapists([]);
						return;
					}

					// Require appointment date/time for search
					if (!appointmentDateTime) {
						const message =
							"Appointment date and time are required for therapist search";
						console.warn(message);
						toast.error(message);
						setTherapists([]);
						return;
					}

					// Add location_id and service_id
					urlParams.set("location_id", locationId);
					urlParams.set("service_id", serviceId);

					// Add appointment_date_time for time slot generation
					const validDate = getValidDate(appointmentDateTime);

					if (!validDate) {
						const message =
							"Invalid appointment date/time. Please select a valid date and time first.";
						console.error("Invalid appointmentDateTime:", appointmentDateTime);
						toast.error(message);
						setTherapists([]);
						return;
					}
					urlParams.set("appointment_date_time", validDate.toISOString());
				}

				const searchUrl = `/api/v1/therapists/search?${urlParams.toString()}`;

				const response = await fetch(searchUrl, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						"X-CSRF-Token":
							document
								.querySelector('meta[name="csrf-token"]')
								?.getAttribute("content") || "",
					},
				});

				if (!response.ok) {
					throw new Error("Failed to search therapists");
				}

				const data = await response.json();
				setTherapists(data.therapists || []);
			} catch (error) {
				console.error("Error searching therapists:", error);

				// Show user-friendly error message
				if (error instanceof Error) {
					if (error.message.includes("toISOString")) {
						toast.error(
							"Invalid appointment date/time. Please select a valid date and time first.",
						);
					} else {
						toast.error(`Failed to search therapists: ${error.message}`);
					}
				} else {
					toast.error("Failed to search therapists. Please try again.");
				}

				setTherapists([]);
			} finally {
				setIsSearching(false);
			}
		},
		[
			mode,
			locationId,
			serviceId,
			watchAllOfDayValue,
			appointmentDateTime,
			formHooks,
			getValidDate,
			watchPreferredTherapistGender,
		],
	);

	// Trigger search when debounced term, employment type, or all of day changes
	useEffect(() => {
		if (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") {
			// Validate appointment date/time (common for all modes)
			if (!appointmentDateTime) {
				const message = t(
					"appt_schedule.therapist_search.select_datetime_first",
				);
				console.warn(message);
				toast.error(message, { id: "therapist-search-datetime" });
				return;
			}

			const validDate = getValidDate(appointmentDateTime);
			if (!validDate) {
				const message = t("appt_schedule.therapist_search.invalid_datetime");
				console.warn(message);
				toast.error(message, { id: "therapist-search-invalid-date" });
				return;
			}

			// Validate mode-specific requirements
			if (mode === "reschedule") {
				const appointmentId = (formHooks as any).appointment?.id;
				if (!appointmentId) {
					const message = t(
						"appt_schedule.therapist_search.appointment_id_required",
					);
					console.warn(message);
					toast.error(message, { id: "therapist-search-appointment-id" });
					return;
				}
			} else {
				// For new appointment and series modes, validate location and service
				if (!locationId || !serviceId) {
					const message = t(
						"appt_schedule.therapist_search.location_service_required",
					);
					console.warn(message);
					toast.error(message, { id: "therapist-search-location-service" });
					return;
				}
			}

			searchTherapists(debouncedSearchTerm, employmentType);
		} else {
			setTherapists([]);
		}
	}, [
		debouncedSearchTerm,
		employmentType,
		searchTherapists,
		locationId,
		serviceId,
		appointmentDateTime,
		mode,
		formHooks,
		getValidDate,
		t,
	]);

	const handleSelectTherapist = (therapist: TherapistOption) => {
		if (mode === "reschedule") {
			// Update form selection state for UI
			if (formHooks?.setFormSelections) {
				formHooks.setFormSelections({
					...formHooks.formSelections,
					therapist,
				});
			}
			// Also update the actual form field
			if ((formHooks as any)?.onSelectTherapist) {
				(formHooks as any).onSelectTherapist(therapist);
			}
			return;
		} else if (mode === "new" && (formHooks as any)?.onSelectTherapist) {
			// For new appointment mode, use the onSelectTherapist callback for auto-save
			(formHooks as any).onSelectTherapist(therapist);
			return;
		} else if (mode === "series" && formHooks?.onSelectTherapist) {
			// For series mode, use the onSelectTherapist callback
			formHooks.onSelectTherapist(therapist);
			return;
		}
	};

	const handleUnselectTherapist = () => {
		if (mode === "reschedule") {
			// Clear form selection state for UI
			if (formHooks?.setFormSelections) {
				formHooks.setFormSelections({
					...formHooks.formSelections,
					therapist: null,
				});
			}
			// Also clear the actual form field
			if ((formHooks as any)?.onSelectTherapist) {
				(formHooks as any).onSelectTherapist(null);
			}
			return;
		} else if (mode === "new" && (formHooks as any)?.onSelectTherapist) {
			// For new appointment mode, use the onSelectTherapist callback with null
			(formHooks as any).onSelectTherapist(null);
			return;
		} else if (mode === "series" && formHooks?.onSelectTherapist) {
			// For series mode, pass null to the onSelectTherapist callback
			formHooks.onSelectTherapist(null);
			return;
		}
	};

	const toggleTimeSlots = (therapistId: string) => {
		setExpandedTimeSlots((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(therapistId)) {
				newSet.delete(therapistId);
			} else {
				newSet.add(therapistId);
			}
			return newSet;
		});
	};

	const isTimeSlotsExpanded = (therapistId: string) => {
		return expandedTimeSlots.has(therapistId);
	};

	// Group therapists by city
	const groupTherapistsByCity = (therapists: TherapistOption[]) => {
		const grouped = therapists.reduce(
			(acc, therapist) => {
				const city = therapist.activeAddress?.location?.city || "Unknown";
				if (!acc[city]) {
					acc[city] = [];
				}
				acc[city].push(therapist);
				return acc;
			},
			{} as Record<string, TherapistOption[]>,
		);

		// Sort cities alphabetically
		const sortedCities = Object.keys(grouped).sort((a, b) => {
			if (a === "Unknown") return 1;
			if (b === "Unknown") return -1;
			return a.localeCompare(b);
		});

		return sortedCities.map((city) => ({
			city,
			therapists: grouped[city],
		}));
	};

	const groupedTherapists = groupTherapistsByCity(therapists);

	const handleSelectTimeSlot = (timeSlot: string) => {
		if (mode === "reschedule") {
			const rescheduleHooks = formHooks as any;
			rescheduleHooks.onSelectTimeSlot(timeSlot);
		} else if (mode === "new") {
			// For new appointment mode, update the appointment date time with selected time slot
			if (!appointmentDateTime) return;

			const validDate = getValidDate(appointmentDateTime);

			if (!validDate) {
				console.error(
					"Invalid appointmentDateTime in handleSelectTimeSlot:",
					appointmentDateTime,
				);
				toast.error(
					"Invalid appointment date/time. Please select a valid date and time first.",
				);
				return;
			}

			// Parse time slot (format: "HH:mm" like "09:00")
			const [hours, minutes] = timeSlot.split(":").map(Number);

			// Create new date with the selected time slot
			const newDateTime = new Date(validDate);
			newDateTime.setHours(hours, minutes, 0, 0);

			// Update the form with new date time
			const form = formHooks.form;
			form.setValue("appointmentScheduling.appointmentDateTime", newDateTime, {
				shouldValidate: true,
			});

			// Update local state to show selected time slot
			setSelectedTimeSlotLocal(timeSlot);
		} else if (mode === "series" && formHooks?.onSelectTimeSlot) {
			// For series mode, use the onSelectTimeSlot callback
			formHooks.onSelectTimeSlot(timeSlot);
		}
		// Update local state to show selected time slot
		setSelectedTimeSlotLocal(timeSlot);
	};

	// Watch therapist field reactively (form.watch is already used at line 100 for gender)
	// form.getValues() is NOT reactive to form.reset() - therapist won't show after draft load
	const watchedTherapistValue = formHooks.form.watch(
		mode === "series" && fieldPath
			? (`${fieldPath}.therapist` as any)
			: "appointmentScheduling.therapist",
	);

	const selectedTherapist = useMemo(() => {
		if (mode === "reschedule") {
			// For reschedule mode, prioritize formSelections, fallback to appointment.therapist
			return (formHooks as any)?.formSelections?.therapist || null;
		}

		if (mode === "new" || mode === "series") {
			return watchedTherapistValue;
		}

		return null;
	}, [formHooks, watchedTherapistValue, mode]);

	return (
		<div className="col-span-full flex flex-col gap-4">
			{/* Employment Type Filter */}
			<div className="flex flex-col gap-2">
				<div className="flex flex-col md:flex-row items-start justify-between gap-4 p-3 border rounded-md border-border bg-sidebar">
					<div>
						<p className="text-sm font-semibold">Employment Type Filter</p>
						<p className="text-xs text-muted-foreground text-pretty">
							Filter therapists by employment type (KARPIS or MITRA)
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							type="button"
							variant={employmentType === "ALL" ? "default" : "outline"}
							size="sm"
							onClick={() => setEmploymentType("ALL")}
						>
							All
						</Button>
						<Button
							type="button"
							variant={employmentType === "KARPIS" ? "default" : "outline"}
							size="sm"
							onClick={() => setEmploymentType("KARPIS")}
						>
							KARPIS
						</Button>
						<Button
							type="button"
							variant={employmentType === "FLAT" ? "default" : "outline"}
							size="sm"
							onClick={() => setEmploymentType("FLAT")}
						>
							MITRA
						</Button>
					</div>
				</div>
			</div>

			{/* Info alert for missing required fields */}
			{(mode === "new" || mode === "series") &&
				(!locationId || !serviceId || !appointmentDateTime) && (
					<div className="rounded-md border border-blue-500/50 px-4 py-3 text-blue-600">
						<p className="text-sm">
							<InfoIcon
								aria-hidden="true"
								className="-mt-0.5 me-3 inline-flex opacity-60"
							/>
							{!locationId || !serviceId
								? t("appt_schedule.therapist_search.location_service_required")
								: t("appt_schedule.therapist_search.select_datetime_first")}
						</p>
					</div>
				)}

			{/* Selected Therapist Display - shown when no search results */}
			{selectedTherapist?.name ? (
				<div className="w-full border rounded-lg bg-sidebar border-border p-2 text-left">
					<div className="flex gap-2">
						<Avatar className="border rounded-lg border-border bg-muted size-10">
							<AvatarImage src="#" />
							<AvatarFallback className="flex flex-col">
								<User className="flex-shrink-0 size-6 opacity-50" />
							</AvatarFallback>
						</Avatar>

						<div className="flex-1 min-w-0 flex">
							<div className="min-w-0 flex-1">
								<p
									title={selectedTherapist.name}
									className="truncate font-bold tracking-wide uppercase line-clamp-1"
								>
									{selectedTherapist.name}
								</p>
								<p className="flex items-center text-xs opacity-75 uppercase line-clamp-1 text-nowrap truncate">
									<span>#{selectedTherapist.registrationNumber}</span>
									<span className="mx-1">&bull;</span>
									<span>{selectedTherapist.employmentType || "N/A"}</span>
									<span className="mx-1">&bull;</span>
									<span className="flex flex-initial items-center">
										{selectedTherapist.gender &&
											getGenderIcon(
												selectedTherapist.gender,
												"flex-shrink-0 size-3 text-inherit opacity-75 mr-0.5",
											)}
										{selectedTherapist.gender || "N/A"}
									</span>
								</p>
							</div>

							<div className="flex items-center gap-2">
								<Badge
									variant="outline"
									className="px-1 text-xs uppercase text-primary border border-primary/50"
								>
									Selected
								</Badge>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={handleUnselectTherapist}
									className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
									title="Cancel therapist selection"
								>
									<X className="h-3 w-3" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			) : null}

			{/* Search Input */}
			<div>
				<FormLabel className="sr-only mb-2">Search Therapist</FormLabel>
				<Input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Type therapist name or reg number to search..."
					className="shadow-inner bg-sidebar"
					disabled={
						(mode === "new" || mode === "series") && (!locationId || !serviceId)
					}
				>
					<Input.Group>
						<Input.LeftIcon>
							{isSearching ? (
								<LoaderIcon className="animate-spin" />
							) : (
								<Search />
							)}
						</Input.LeftIcon>
					</Input.Group>
				</Input>
				{therapists.length > 0 && (
					<p className="mt-1 text-xs text-muted-foreground/75">
						Showing {therapists.length} therapists across{" "}
						{groupedTherapists.length} cities
					</p>
				)}
			</div>

			{/* Therapist List */}
			{therapists.length > 0 ? (
				<ScrollArea className="h-[400px] rounded-md border border-border bg-sidebar px-3">
					<div className="space-y-4">
						{groupedTherapists.map(({ city, therapists: cityTherapists }) => (
							<div key={city}>
								{/* City Header */}
								<div className="sticky top-0 bg-sidebar backdrop-blur-sm z-10 py-1 border-b">
									<div className="flex items-center gap-2">
										<h3 className="text-sm font-semibold text-muted-foreground/75 uppercase tracking-wide">
											{city}
										</h3>
										<Badge
											variant="outline"
											className="text-xs p-1 rounded-full shrink-0 text-muted-foreground/75"
										>
											{cityTherapists?.length || 0}
										</Badge>
									</div>
								</div>

								{/* Therapists in this city */}
								<div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
									{cityTherapists.map((therapist: TherapistOption) => {
										const isSelected =
											mode === "reschedule"
												? (formHooks as any).formSelections?.therapist?.id ===
													therapist.id
												: mode === "series" && fieldPath
													? (formHooks as any).form?.getValues(
															`${fieldPath}.therapist.id`,
														) === therapist.id
													: (formHooks as any).form?.getValues(
															"appointmentScheduling.therapist.id",
														) === therapist.id;

										return (
											<button
												key={therapist.id}
												type="button"
												disabled={!appointmentDateTime}
												className={cn(
													"w-full border rounded-lg bg-background border-border transition-all p-2 text-left hover:border-primary",
													isSelected &&
														"border-primary/25 bg-primary/5 text-primary",
													!appointmentDateTime &&
														"opacity-50 cursor-not-allowed hover:border-border",
												)}
												onClick={() => handleSelectTherapist(therapist)}
											>
												<div>
													<div className="flex gap-2">
														<Avatar className="border rounded-lg border-border bg-muted size-10">
															<AvatarImage src="#" />
															<AvatarFallback className="flex flex-col">
																<User className="flex-shrink-0 size-6 opacity-50" />
															</AvatarFallback>
														</Avatar>

														<div className="min-w-0 flex-1">
															<p
																title={therapist.name}
																className="truncate font-bold tracking-wide uppercase line-clamp-1"
															>
																{therapist.name}
															</p>
															<p className="flex items-center text-xs opacity-75 uppercase line-clamp-1 text-nowrap truncate">
																<span>#{therapist.registrationNumber}</span>
																<span className="mx-1">&bull;</span>
																<span>{therapist.employmentType || "N/A"}</span>
																<span className="mx-1">&bull;</span>
																<span className="flex flex-initial items-center">
																	{therapist.gender &&
																		getGenderIcon(
																			therapist.gender,
																			"flex-shrink-0 size-3 text-inherit opacity-75 mr-0.5",
																		)}
																	{therapist.gender || "N/A"}
																</span>
															</p>
														</div>
													</div>

													{/* Time slots for all of day */}
													{!!therapist.availabilityDetails?.availableSlots
														?.length &&
														!!formHooks.watchAllOfDayValue && (
															<div className="border-t mt-1 pt-1">
																{/** biome-ignore lint/a11y/noStaticElementInteractions: as a button */}
																<div
																	onKeyDown={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																	}}
																	onClick={(e) => {
																		e.stopPropagation();
																		toggleTimeSlots(therapist.id);
																	}}
																	className="w-full flex justify-center items-center gap-2"
																>
																	<span className="text-xs uppercase text-muted-foreground/75">
																		{
																			therapist.availabilityDetails
																				.availableSlots.length
																		}{" "}
																		Suggested Time Slots
																	</span>
																	<ChevronDown
																		className={cn(
																			"size-4 transition-transform duration-200 text-muted-foreground/75",
																			isTimeSlotsExpanded(therapist.id) &&
																				"rotate-180",
																		)}
																	/>
																</div>

																{isTimeSlotsExpanded(therapist.id) && (
																	<div className="grid grid-cols-3 gap-2 mt-2 md:grid-cols-6 xl:grid-cols-7">
																		{therapist.availabilityDetails.availableSlots.map(
																			(slot) => (
																				<TimeSlotButton
																					key={slot}
																					time={slot}
																					isSelected={
																						mode === "reschedule"
																							? (formHooks as any)
																									.selectedTimeSlot === slot
																							: selectedTimeSlotLocal === slot
																					}
																					onSelect={() => {
																						handleSelectTherapist(therapist);
																						handleSelectTimeSlot(slot);
																					}}
																				/>
																			),
																		)}
																	</div>
																)}
															</div>
														)}
												</div>
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
				</ScrollArea>
			) : null}

			{/* No results message */}
			{!isSearching && search.trim() !== "" && therapists.length === 0 && (
				<p className="text-center text-sm text-muted-foreground py-4 border rounded-md border-border bg-sidebar">
					No therapists found matching your search
				</p>
			)}
		</div>
	);
};
