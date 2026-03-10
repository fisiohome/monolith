import { Head, router, usePage } from "@inertiajs/react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
	AlertCircle,
	CalendarDays,
	CheckIcon,
	ChevronDownIcon,
	ExternalLink,
	FilterIcon,
	HashIcon,
	Info,
	Loader2Icon,
	MapPinIcon,
	MoreHorizontal,
	RefreshCw,
	Search,
	SearchIcon,
	X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { useDateContext } from "@/components/providers/date-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn, generateInitials, populateQueryParams } from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";

interface TherapistDiagnosis {
	therapist: TherapistInfo;
	diagnosis: {
		available: boolean;
		reasons: string[];
		priority: number;
		category: string;
		recommendation: string;
	};
}

interface TherapistInfo {
	id: string;
	name: string;
	registrationNumber: string;
	employmentType: string;
	employmentStatus: string;
	userStatus: string;
	serviceName: string;
	scheduleConfigured: boolean;
}

interface TherapistDiagnosisData {
	selectedTherapistsAnalysis: TherapistDiagnosis[];
	availableTherapists: TherapistInfo[];
}

type AppointmentOption = Pick<
	Appointment,
	| "id"
	| "appointmentDateTime"
	| "registrationNumber"
	| "status"
	| "visitNumber"
	| "patient"
	| "service"
	| "package"
> & {
	visitLocation: {
		id: number | null;
		addressLine: string | null;
		latitude: number | null;
		longitude: number | null;
		notes: string | null;
		postalCode: string | null;
		locationId: number | null;
		country: string | null;
		city: string | null;
		countryCode: string | null;
		state: string | null;
	};
	visitProgress: string;
};

type TherapistOption = Pick<
	Therapist,
	| "id"
	| "name"
	| "registrationNumber"
	| "gender"
	| "employmentStatus"
	| "employmentType"
	| "service"
	| "user"
>;

interface PageProps {
	selectedAppt: AppointmentOption | null;
	appointmentOptions: AppointmentOption[];
	appointmentSearchError: string | null;
	therapistOptions: {
		data: TherapistOption[] | null;
	};
	selectedTherapists: TherapistOption[];
}

type DiagnosisGlobalPageProps = GlobalPageProps &
	PageProps & {
		[key: string]: unknown;
	};

export default function TherapistDiagnosisPage() {
	const { t: tappt } = useTranslation("appointments");
	const { props: globalProps, url: pageURL } =
		usePage<DiagnosisGlobalPageProps>();
	const { locale, tzDate } = useDateContext();
	console.log(globalProps);
	const selectedAppt = useMemo(
		() => globalProps.selectedAppt ?? null,
		[globalProps.selectedAppt],
	);
	const formattedSelectedAppt = useMemo(() => {
		const apptDate = selectedAppt?.appointmentDateTime
			? format(selectedAppt.appointmentDateTime, "PP", {
					locale,
					in: tzDate,
				})
			: "N/A";
		const apptTime = selectedAppt?.appointmentDateTime
			? format(
					selectedAppt.appointmentDateTime,
					locale.code === "id" ? "HH:mm" : "hh:mm a",
					{
						locale,
						in: tzDate,
					},
				)
			: "N/A";
		const serviceName = selectedAppt?.service?.name
			? selectedAppt.service.name.replaceAll("_", " ")
			: "N/A";
		const packageName = selectedAppt?.package?.name ?? "N/A";
		const numberOfVisits = selectedAppt?.package?.numberOfVisit
			? `${selectedAppt.package.numberOfVisit} visit(s)`
			: "N/A";
		const visitRegion =
			[
				selectedAppt?.visitLocation?.city,
				selectedAppt?.visitLocation?.state,
				selectedAppt?.visitLocation?.country,
			]?.join(", ") || "N/A";
		const visitAddress = selectedAppt?.visitLocation?.addressLine || "N/A";
		const visitNotes = selectedAppt?.visitLocation?.notes || "N/A";
		const visitMapsURL =
			selectedAppt?.visitLocation?.latitude &&
			selectedAppt?.visitLocation?.longitude
				? `https://www.google.com/maps/search/?api=1&query=${selectedAppt.visitLocation.latitude},${selectedAppt.visitLocation.longitude}`
				: "";
		const visitProgress = selectedAppt?.visitProgress
			? `Visit ${selectedAppt?.visitProgress}`
			: "N/A";
		const patientName = selectedAppt?.patient?.name || "N/A";
		const patientInitials = patientName ? generateInitials(patientName) : "N/A";
		const patientAge = selectedAppt?.patient?.age || "N/A";

		return {
			apptDate,
			apptTime,
			serviceName,
			packageName,
			numberOfVisits,
			visitRegion,
			visitAddress,
			visitNotes,
			visitMapsURL,
			visitProgress,
			patientName,
			patientInitials,
			patientAge,
		};
	}, [selectedAppt, locale, tzDate]);
	const appointmentOptions = useMemo(
		() => globalProps.appointmentOptions ?? [],
		[globalProps.appointmentOptions],
	);
	const appointmentSearchError = useMemo(
		() => globalProps.appointmentSearchError ?? "",
		[globalProps.appointmentSearchError],
	);
	const therapistOptions = useMemo(
		() => globalProps.therapistOptions ?? null,
		[globalProps.therapistOptions],
	);
	const therapistOptionsMetadata = useMemo(() => {
		const totalCount = therapistOptions?.data?.length || 0;

		return {
			isExist: !!totalCount,
			totalCount: totalCount,
		};
	}, [therapistOptions?.data?.length]);
	const searchRegistrationNumber = useMemo(
		() => globalProps.adminPortal?.currentQuery?.apptReg ?? "",
		[globalProps.adminPortal?.currentQuery?.apptReg],
	);
	const selectedTherapistIds = useMemo(() => {
		const therapistIds = globalProps.adminPortal?.currentQuery?.therapistIds;
		if (!therapistIds) return [];
		// Ensure array and remove duplicates
		const ids = Array.isArray(therapistIds) ? therapistIds : [therapistIds];
		return [...new Set(ids)]; // Remove duplicates
	}, [globalProps.adminPortal?.currentQuery?.therapistIds]);

	// Use real data dari backend, tidak ada mock data
	const [diagnosisData, setDiagnosisData] =
		useState<TherapistDiagnosisData | null>();
	const [registrationNumberInput, setRegistrationNumberInput] = useState(
		() => searchRegistrationNumber || selectedAppt?.registrationNumber || "",
	);
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [isLoadingAppointment, setIsLoadingAppointment] = useState(false);
	const [appointmentError, setAppointmentError] = useState("");
	const [analysisError, setAnalysisError] = useState("");

	// State untuk therapist selection
	const [selectedTherapists, setSelectedTherapists] =
		useState<string[]>(selectedTherapistIds);
	const [isTherapistPopoverOpen, setIsTherapistPopoverOpen] = useState(false);

	// State untuk semua therapists dari database
	const [isLoadingTherapists, setIsLoadingTherapists] = useState(false);

	// Fetch all therapists from Inertia optional prop
	const fetchAllTherapists = useCallback(() => {
		if (therapistOptions) {
			setIsLoadingTherapists(false);
			return;
		}

		setIsLoadingTherapists(true);

		router.reload({
			only: ["therapistOptions"],
			onSuccess: (_props) => {},
			onFinish: () => {
				setTimeout(() => {
					setIsLoadingTherapists(false);
				}, 250);
			},
		});
	}, [therapistOptions]);

	useEffect(() => {
		setAppointmentError(appointmentSearchError);
	}, [appointmentSearchError]);

	// Filter therapists berdasarkan search query
	const filteredTherapists = useMemo(
		() =>
			therapistOptions?.data?.filter(
				(therapist) => !selectedTherapists.includes(therapist.id),
			) || [],
		[therapistOptions?.data, selectedTherapists],
	);

	const handleAddTherapist = useCallback(
		(therapistId: string) => {
			setSelectedTherapists((prev) => {
				// Ensure no duplicates in the array
				const updated = prev.includes(therapistId)
					? prev
					: [...prev, therapistId];
				// Remove any duplicates before sending to URL (extra safety)
				const deduplicated = [...new Set(updated)];
				// Update URL query parameter using populateQueryParams with proper array handling
				const params: any = {
					appt_reg: searchRegistrationNumber || undefined,
				};

				// Handle array parameters properly for Rails - use empty brackets
				if (deduplicated.length > 0) {
					// Build URL manually for array parameters
					const baseUrl = pageURL.split("?")[0];
					const existingParams = new URLSearchParams(
						pageURL.split("?")[1] || "",
					);

					// Add or update appt_reg
					if (searchRegistrationNumber) {
						existingParams.set("appt_reg", searchRegistrationNumber);
					} else {
						existingParams.delete("appt_reg");
					}

					// Remove existing therapist_ids
					existingParams.delete("therapist_ids[]");

					// Add therapist_ids as array
					deduplicated.forEach((id) => {
						existingParams.append("therapist_ids[]", id);
					});

					const fullUrl = `${baseUrl}?${existingParams.toString()}`;

					router.get(
						fullUrl,
						{},
						{
							preserveState: true,
							only: ["selectedTherapists"],
						},
					);
				} else {
					// No therapists, just use populateQueryParams
					const { fullUrl, queryParams } = populateQueryParams(pageURL, params);
					router.get(
						fullUrl,
						{ ...queryParams },
						{
							preserveState: true,
							only: ["selectedTherapists"],
						},
					);
				}

				return deduplicated;
			});
		},
		[searchRegistrationNumber, pageURL],
	);

	const handleRemoveTherapist = useCallback(
		(therapistId: string) => {
			setSelectedTherapists((prev) => {
				const updated = prev.filter((id) => id !== therapistId);
				// Remove any duplicates before sending to URL (extra safety)
				const deduplicated = [...new Set(updated)];

				// Build URL manually for array parameters
				const baseUrl = pageURL.split("?")[0];
				const existingParams = new URLSearchParams(pageURL.split("?")[1] || "");

				// Add or update appt_reg
				if (searchRegistrationNumber) {
					existingParams.set("appt_reg", searchRegistrationNumber);
				} else {
					existingParams.delete("appt_reg");
				}

				// Remove existing therapist_ids
				existingParams.delete("therapist_ids[]");

				// Add therapist_ids as array only if there are therapists selected
				if (deduplicated.length > 0) {
					deduplicated.forEach((id) => {
						existingParams.append("therapist_ids[]", id);
					});
				}

				const fullUrl = `${baseUrl}?${existingParams.toString()}`;

				router.get(
					fullUrl,
					{},
					{ preserveState: true, only: ["selectedTherapists"] },
				);

				return deduplicated; // Return deduplicated array to keep state consistent
			});
		},
		[searchRegistrationNumber, pageURL],
	);

	const categories = useMemo(() => {
		if (!diagnosisData) return [];

		const cats = new Set<string>();
		diagnosisData.selectedTherapistsAnalysis.forEach(
			(item: TherapistDiagnosis) => {
				cats.add(item.diagnosis.category);
			},
		);
		return Array.from(cats).sort();
	}, [diagnosisData]);

	const filteredSelectedTherapists = useMemo(() => {
		if (!diagnosisData) return [];

		let filtered = diagnosisData.selectedTherapistsAnalysis;

		if (selectedCategory !== "all") {
			filtered = filtered.filter(
				(item: TherapistDiagnosis) =>
					item.diagnosis.category === selectedCategory,
			);
		}

		return filtered;
	}, [diagnosisData, selectedCategory]);

	const handleSearchAppointments = useCallback(async () => {
		const registrationNumber = registrationNumberInput.trim();

		if (!registrationNumber) {
			setAppointmentError("Enter appointment registration number.");
			setDiagnosisData(null);
			setAnalysisError("");
			return;
		}

		setIsLoadingAppointment(true);
		setAppointmentError("");
		setDiagnosisData(null);
		setAnalysisError("");

		router.reload({
			only: ["appointmentOptions", "appointmentSearchError", "selectedAppt"],
			data: { appt_reg: registrationNumber },
			onError: () => {
				setAppointmentError("Failed to search appointments.");
			},
			onFinish: () => {
				setTimeout(() => {
					setIsLoadingAppointment(false);
				}, 250);
			},
		});
	}, [registrationNumberInput]);

	const handleSelectAppointment = useCallback(
		(appointmentId: string) => {
			if (!appointmentId) {
				return;
			}

			setIsLoadingAppointment(true);
			setAppointmentError("");
			setDiagnosisData(null);
			setAnalysisError("");

			router.reload({
				only: ["selectedAppt"],
				data: {
					appt_reg: registrationNumberInput.trim() || undefined,
					appt_id: appointmentId,
					therapist_ids:
						selectedTherapists.length > 0 ? selectedTherapists : undefined,
				},
				onSuccess: (_props) => {},
				onError: () => {
					setAppointmentError("Failed to load selected appointment.");
				},
				onFinish: () => {
					setTimeout(() => {
						setIsLoadingAppointment(false);
					}, 250);
				},
			});
		},
		[registrationNumberInput, selectedTherapists],
	);

	const handleAnalyze = useCallback(async () => {
		if (!selectedAppt || selectedTherapists.length === 0 || isAnalyzing) {
			return;
		}

		setIsAnalyzing(true);
		setAnalysisError("");

		router.reload({
			only: ["analyzeReport"],
			onSuccess: (page) => {
				const analyzeReport = (page.props as any)?.analyzeReport;
				if (analyzeReport?.success) {
					setDiagnosisData(analyzeReport.data);
				} else {
					setDiagnosisData(null);
					setAnalysisError(
						analyzeReport?.error || "Failed to analyze therapist availability.",
					);
				}
			},
			onError: () => {
				setDiagnosisData(null);
				setAnalysisError("Failed to analyze therapist availability.");
			},
			onFinish: () => {
				setTimeout(() => {
					setIsAnalyzing(false);
				}, 250);
			},
		});
	}, [selectedAppt, selectedTherapists, isAnalyzing]);

	const getCategoryColor = (category: string) => {
		switch (category) {
			case "Account Issue":
				return "bg-red-100 text-red-800 border-red-200";
			case "Employment Issue":
				return "bg-orange-100 text-orange-800 border-orange-200";
			case "Schedule Conflict":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "Service Mismatch":
				return "bg-blue-100 text-blue-800 border-blue-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const scheduleUrls = useMemo(() => {
		if (!selectedAppt) return {};

		const appointmentDate = new Date(selectedAppt.appointmentDateTime);
		const dateFrom = appointmentDate
			.toLocaleDateString("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			})
			.replace(/\//g, "-");

		const dateTo = new Date(appointmentDate);
		const dateToStr = dateTo
			.toLocaleDateString("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			})
			.replace(/\//g, "-");

		const baseUrl = `/admin-portal/therapist-schedules?date_from=${dateFrom}&date_to=${dateToStr}`;

		// Create URLs for all therapists in diagnosis data
		const urls: Record<string, string> = {};

		if (diagnosisData?.availableTherapists) {
			diagnosisData.availableTherapists.forEach((therapist: TherapistInfo) => {
				urls[therapist.registrationNumber] =
					`${baseUrl}&therapists=${therapist.registrationNumber}`;
			});
		}

		return urls;
	}, [selectedAppt, diagnosisData?.availableTherapists]);

	const buildScheduleUrl = useCallback(
		(registrationNumber: string) => {
			return scheduleUrls[registrationNumber] || "#";
		},
		[scheduleUrls],
	);

	const TherapistDiagnosisCard = ({
		diagnosis,
	}: {
		diagnosis: TherapistDiagnosis;
	}) => {
		const initials = generateInitials(diagnosis.therapist.name);

		const handleRedirectToSchedule = () => {
			const url = buildScheduleUrl(diagnosis.therapist.registrationNumber);
			window.open(url, "_blank");
		};

		return (
			<motion.div
				initial={false}
				className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<Avatar className="h-10 w-10">
							<AvatarImage src="" alt={diagnosis.therapist.name} />
							<AvatarFallback className="text-xs">{initials}</AvatarFallback>
						</Avatar>
						<div>
							<h4 className="font-medium text-sm">
								{diagnosis.therapist.name}
							</h4>
							<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
								<span>{diagnosis.therapist.registrationNumber}</span>
								<span>•</span>
								<span>{diagnosis.therapist.serviceName}</span>
							</div>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<div
							className={cn(
								"px-2 py-1 rounded-full text-xs font-medium border",
								getCategoryColor(diagnosis.diagnosis.category),
							)}
						>
							{diagnosis.diagnosis.category}
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={handleRedirectToSchedule}>
									<ExternalLink className="h-4 w-4 mr-2" />
									View Schedule
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div className="space-y-2">
					{diagnosis.diagnosis.reasons.map((reason, reasonIndex) => (
						<div
							key={String(reasonIndex)}
							className="flex items-start space-x-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
						>
							<AlertCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
							<span className="text-gray-700">{reason}</span>
						</div>
					))}
				</div>

				{diagnosis.diagnosis.recommendation && (
					<div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs">
						<div className="flex items-start space-x-2">
							<Info className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
							<span className="text-blue-700">
								{diagnosis.diagnosis.recommendation}
							</span>
						</div>
					</div>
				)}

				<div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-gray-500">
					<span>
						{diagnosis.therapist.employmentType} •{" "}
						{diagnosis.therapist.userStatus}
					</span>
					<span>
						{diagnosis.therapist.scheduleConfigured
							? "✓ Schedule"
							: "✗ No Schedule"}
					</span>
				</div>
			</motion.div>
		);
	};

	return (
		<Fragment>
			<Head title="Therapist Availability Diagnosis" />

			<PageContainer className="space-y-4 relative">
				<section>
					<h1 className="text-lg font-bold tracking-tight uppercase">
						Therapist Availability Diagnosis
					</h1>

					<p className="w-full text-sm md:w-8/12 text-pretty text-muted-foreground">
						Review why selected therapists are unavailable and see bookable
						alternatives for the same visit in one place.
					</p>
				</section>

				<Separator className="bg-border" />

				<section className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="md:col-span-1 space-y-4">
						<div className="p-3 lg:p-4 border shadow-inner rounded-xl bg-background space-y-4">
							<div>
								<p
									id="appointment-details"
									className="text-sm uppercase font-medium tracking-wide text-muted-foreground/75"
								>
									Select Appointment
								</p>
							</div>

							<div className="space-y-2">
								<Label className="sr-only" htmlFor="appt_reg">
									Search Appointment
								</Label>
								<div className="flex gap-2">
									<Input
										className="flex-1 bg-input shadow-inner"
										id="appt_reg"
										placeholder="Enter by appointment reg number"
										value={registrationNumberInput}
										onChange={(e) => setRegistrationNumberInput(e.target.value)}
									/>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className="bg-input shadow-inner size-9"
										disabled={isLoadingAppointment}
										onClick={handleSearchAppointments}
									>
										{isLoadingAppointment ? (
											<Loader2Icon className="h-4 w-4 animate-spin shrink-0" />
										) : (
											<SearchIcon className="shrink-0" />
										)}
									</Button>
								</div>
							</div>

							<div>
								<Select
									value={selectedAppt?.id?.toString() || ""}
									onValueChange={handleSelectAppointment}
									disabled={
										appointmentOptions.length === 0 || isLoadingAppointment
									}
								>
									<SelectTrigger className="w-full bg-input shadow-inner">
										<SelectValue placeholder="Select appointment" />
									</SelectTrigger>
									<SelectContent>
										{appointmentOptions.map((appointment) => {
											const apptDate = appointment?.appointmentDateTime
												? format(appointment.appointmentDateTime, "PP", {
														locale,
														in: tzDate,
													})
												: "N/A";
											const apptTime = appointment?.appointmentDateTime
												? format(
														appointment.appointmentDateTime,
														locale.code === "id" ? "HH:mm" : "hh:mm a",
														{
															locale,
															in: tzDate,
														},
													)
												: "N/A";

											return (
												<SelectItem
													key={appointment.id}
													value={appointment.id.toString()}
												>
													<span>
														Visit {appointment?.visitNumber || 0}/
														{appointment.package?.numberOfVisit || 0}
													</span>
													<span className="mx-1">&bull;</span>
													<span>
														{`${apptDate} 
													@${apptTime}
												`}
													</span>
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="p-3 lg:p-4 border shadow-inner rounded-xl bg-background space-y-4">
							<div>
								<p
									id="appointment-details"
									className="text-sm uppercase font-medium tracking-wide text-muted-foreground/75"
								>
									Select Therapist
								</p>
							</div>

							<div>
								<Label htmlFor="therapist" className="sr-only mb-2">
									Select therapist
								</Label>
								<Popover
									open={isTherapistPopoverOpen}
									onOpenChange={setIsTherapistPopoverOpen}
								>
									<PopoverTrigger asChild>
										<Button
											id="therapist-selection"
											variant="outline"
											className="w-full justify-between rounded-xl border-input bg-input shadow-inner px-3 font-normal outline-none outline-offset-0 focus-visible:outline-[3px]"
											aria-expanded={isTherapistPopoverOpen}
											disabled={isLoadingTherapists}
											onClick={() => fetchAllTherapists()}
										>
											{isLoadingTherapists ? (
												<>
													<span className="truncate text-left text-muted-foreground">
														Loading...
													</span>
													<Loader2Icon className="h-4 w-4 animate-spin shrink-0" />
												</>
											) : (
												<>
													<span
														className={cn(
															"truncate text-left",
															selectedTherapists.length === 0 &&
																"text-muted-foreground",
														)}
													>
														{selectedTherapists.length === 0
															? "Select therapists"
															: `${selectedTherapists.length} therapist${selectedTherapists.length === 1 ? "" : "s"} selected`}
													</span>
													<ChevronDownIcon
														aria-hidden="true"
														className="shrink-0 text-muted-foreground/80"
														size={16}
													/>
												</>
											)}
										</Button>
									</PopoverTrigger>

									<PopoverContent
										align="start"
										className="min-w-[var(--radix-popover-trigger-width)] border-input p-0"
									>
										<Command>
											<CommandInput placeholder="Search therapist..." />
											<CommandList>
												<CommandEmpty>
													{filteredTherapists.length === 0
														? "All therapists selected"
														: "No therapist found."}
												</CommandEmpty>
												<CommandGroup>
													{therapistOptionsMetadata.isExist ? (
														<div className="z-10 py-1 border-b">
															<p className="text-xs font-medium text-muted-foreground">
																Total: {therapistOptionsMetadata.totalCount}{" "}
																{`therapist${therapistOptionsMetadata.totalCount === 1 ? "" : "s"}`}
															</p>
														</div>
													) : null}

													{filteredTherapists.map((therapist) => (
														<CommandItem
															key={therapist.id}
															value={`${therapist.name} ${therapist.registrationNumber} ${therapist.employmentType}`}
															onSelect={() => handleAddTherapist(therapist.id)}
														>
															<div className="flex min-w-0 flex-1 flex-col uppercase">
																<span className="truncate font-medium text-sm">
																	{therapist.name}
																</span>

																<div className="text-xs text-muted-foreground">
																	<span>#{therapist.registrationNumber}</span>
																	<span className="mx-1">&bull;</span>
																	<span>{therapist.employmentType}</span>
																</div>
															</div>
															<CheckIcon
																className={cn(
																	"ml-auto",
																	selectedTherapists.includes(therapist.id)
																		? "opacity-100"
																		: "opacity-0",
																)}
																size={16}
															/>
														</CommandItem>
													))}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							</div>

							{globalProps.selectedTherapists?.length > 0 && (
								<div className="mt-3 flex flex-wrap gap-2">
									{globalProps.selectedTherapists?.map((therapist) => {
										const therapistId = String(therapist.id);

										return (
											<div
												key={therapistId}
												className="flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-sm text-primary"
											>
												<span>
													{therapist?.name || therapist?.registrationNumber}
												</span>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemoveTherapist(therapistId)}
													className="h-4 w-4 p-0 hover:bg-primary/10"
												>
													<X className="h-3 w-3" />
												</Button>
											</div>
										);
									})}
								</div>
							)}
						</div>

						<div>
							<Button
								onClick={handleAnalyze}
								disabled={
									isAnalyzing ||
									!selectedAppt ||
									selectedTherapists.length === 0
								}
								className="w-full"
							>
								{isAnalyzing ? (
									<>
										<RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
										Analyzing...
									</>
								) : (
									<>
										<Search className="h-4 w-4 shrink-0" />
										Analyze
									</>
								)}
							</Button>
						</div>
					</div>

					<div className="md:col-span-2 p-3 lg:p-4 border shadow-inner rounded-xl bg-background space-y-6">
						<div className="space-y-4">
							<div>
								<p
									id="appointment-details"
									className="text-sm uppercase font-medium tracking-wide text-muted-foreground/75"
								>
									Matching Appointments
								</p>
							</div>

							{isLoadingAppointment && (
								<div className="flex items-center space-x-2 rounded-lg text-sm text-muted-foreground">
									<RefreshCw className="mt-0.5 h-4 w-4 animate-spin flex-shrink-0 opacity-60" />
									<span>Loading appointments...</span>
								</div>
							)}

							{!isLoadingAppointment && appointmentError && (
								<div className="flex items-center space-x-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
									<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" />
									<span>{appointmentError}</span>
								</div>
							)}

							{!isLoadingAppointment &&
								!appointmentError &&
								registrationNumberInput.trim() &&
								!selectedAppt && (
									<div className="flex items-center space-x-2 rounded-lg text-sm text-muted-foreground">
										<CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" />
										<span>
											No appointments found yet. Search a registration number to
											load matches.
										</span>
									</div>
								)}

							{!isLoadingAppointment && !appointmentError && !selectedAppt && (
								<div className="flex items-center space-x-2 rounded-lg text-sm text-muted-foreground">
									<CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" />
									<span>
										Enter an appointment registration number and click Search
										Appointments.
									</span>
								</div>
							)}

							{!isLoadingAppointment && !appointmentError && selectedAppt && (
								<div className="grid gap-4 md:grid-cols-2">
									<div>
										<p className="font-light mb-1">
											{tappt("list.patient_details")}
										</p>
										<div>
											<div className="flex items-center gap-2">
												<Avatar className="text-xs border rounded-lg border-border bg-sidebar size-10">
													<AvatarImage
														src="#"
														alt={formattedSelectedAppt.patientName}
													/>
													<AvatarFallback className="bg-sidebar">
														{formattedSelectedAppt.patientInitials}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="font-semibold uppercase line-clamp-1">
														{formattedSelectedAppt.patientName}
													</p>
													<p className="text-xs text-muted-foreground capitalize">
														{formattedSelectedAppt.patientAge}{" "}
														{tappt("list.years")},{" "}
														{selectedAppt?.patient?.gender
															? tappt(
																	`list.gender_${selectedAppt.patient.gender.toLowerCase()}`,
																)
															: "N/A"}
													</p>
												</div>
											</div>
										</div>
									</div>

									<div>
										<p className="font-light">Visit No.</p>
										<p className="font-semibold capitalize">
											{formattedSelectedAppt.visitProgress}
										</p>
									</div>

									<div>
										<p className="font-light">
											{tappt("list.booked_appointment_date")}:
										</p>
										<p className="font-semibold capitalize">
											{formattedSelectedAppt.apptDate}
										</p>
									</div>

									<div>
										<p className="font-light">
											{tappt("list.booked_appointment_time")}:
										</p>
										<div className="font-semibold uppercase">
											<span>{formattedSelectedAppt.apptTime}</span>
										</div>
									</div>

									<div>
										<p className="font-light">{tappt("list.reg_number")}:</p>
										<div className="font-semibold uppercase">
											<p className="flex items-center justify-start gap-1 text-pretty">
												<HashIcon className="size-3 text-muted-foreground/75" />
												{selectedAppt?.registrationNumber || "N/A"}
											</p>
										</div>
									</div>

									<div className="col-span-full md:col-span-1">
										<p className="font-light">{tappt("list.visit_service")}:</p>
										<p className="font-semibold">
											<span>{formattedSelectedAppt.serviceName}</span>
											<span className="mx-2">&#x2022;</span>
											<span>{formattedSelectedAppt.packageName}</span>
											<span className="mx-1">-</span>
											<span className="italic font-light">
												{formattedSelectedAppt.numberOfVisits}
											</span>
										</p>
									</div>

									<div className="col-span-full">
										<p className="font-light">{tappt("list.visit_region")}:</p>
										<p className="font-semibold uppercase">
											{formattedSelectedAppt.visitRegion}
										</p>
									</div>

									<div className="col-span-full">
										<p className="font-light">{tappt("list.visit_address")}:</p>
										<p className="font-semibold capitalize">
											{formattedSelectedAppt.visitAddress}
										</p>
										<p className="italic font-normal">
											{tappt("list.notes")}: {formattedSelectedAppt.visitNotes}
										</p>
										{!!formattedSelectedAppt.visitMapsURL && (
											<Button
												type="button"
												variant="primary-outline"
												size="sm"
												className="mt-2"
												onClick={(event) => {
													event.preventDefault();
													event.stopPropagation();
													window.open(formattedSelectedAppt.visitMapsURL);
												}}
											>
												<MapPinIcon />
												{tappt("list.view_on_google_maps")}
											</Button>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</section>

				{analysisError && (
					<section className="flex items-start space-x-2 p-3 lg:p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
						<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
						<span>{analysisError}</span>
					</section>
				)}

				{diagnosisData?.selectedTherapistsAnalysis?.length && (
					<section className="border shadow-inner rounded-xl bg-background p-3">
						<div className="flex flex-col gap-3 md:flex-row items-center mb-4">
							<Select
								value={selectedCategory}
								onValueChange={setSelectedCategory}
							>
								<SelectTrigger className="w-full md:w-48 bg-input shadow-inner">
									<FilterIcon className="h-4 w-4" />
									<SelectValue placeholder="Filter by category" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Categories</SelectItem>
									{categories.map((category) => (
										<SelectItem key={category} value={category}>
											{category}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<ScrollArea className="h-[420px]">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								{filteredSelectedTherapists.map(
									(diagnosis: TherapistDiagnosis) => (
										<TherapistDiagnosisCard
											key={diagnosis.therapist.id}
											diagnosis={diagnosis}
										/>
									),
								)}
							</div>
						</ScrollArea>
					</section>
				)}

				{/* Recommended Therapists Section */}
				{/* {diagnosisData.selectedTherapistsAnalysis.length > 0 && (
							<Card className="border-emerald-200/80 shadow-sm">
								<CardContent className="space-y-4">
									<div>
										<p className="text-sm uppercase font-medium tracking-wide text-muted-foreground/75">
											Recommended Therapists
										</p>
									</div>

									<ScrollArea className="h-[420px]">
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
											{diagnosisData.availableTherapists.map(
												(therapist: TherapistInfo) => {
													const initials = generateInitials(therapist.name);
													const handleViewSchedule = () => {
														window.open(
															buildScheduleUrl(therapist.registrationNumber),
															"_blank",
														);
													};

													return (
														<motion.div
															key={therapist.id}
															initial={false}
															className="space-y-4 rounded-xl border border-green-200 bg-gradient-to-b from-green-50 to-white p-4 shadow-sm"
														>
															<div className="flex items-start justify-between gap-3">
																<div className="flex items-center space-x-3">
																	<Avatar className="h-10 w-10">
																		<AvatarImage src="" alt={therapist.name} />
																		<AvatarFallback className="text-xs">
																			{initials}
																		</AvatarFallback>
																	</Avatar>
																	<div>
																		<h4 className="text-sm font-medium text-slate-900">
																			{therapist.name}
																		</h4>
																		<p className="text-xs text-slate-500">
																			{therapist.registrationNumber}
																		</p>
																	</div>
																</div>

																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<Button
																			variant="ghost"
																			size="sm"
																			className="h-8 w-8 p-0"
																		>
																			<MoreHorizontal className="h-4 w-4" />
																		</Button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<DropdownMenuItem
																			onClick={handleViewSchedule}
																		>
																			<ExternalLink className="mr-2 h-4 w-4" />
																			View Schedule
																		</DropdownMenuItem>
																	</DropdownMenuContent>
																</DropdownMenu>
															</div>

															<div className="flex items-center space-x-2">
																<CheckCircle className="h-4 w-4 text-green-500" />
																<span className="text-xs font-medium text-green-700">
																	Available for booking
																</span>
															</div>

															<div className="space-y-2 text-xs text-gray-600">
																<div className="flex justify-between gap-3">
																	<span>Type:</span>
																	<span>{therapist.employmentType}</span>
																</div>
																<div className="flex justify-between gap-3">
																	<span>Status:</span>
																	<span className="text-green-600">
																		{therapist.userStatus}
																	</span>
																</div>
																<div className="flex justify-between gap-3">
																	<span>Service:</span>
																	<span className="text-right">
																		{therapist.serviceName}
																	</span>
																</div>
																<div className="flex justify-between gap-3">
																	<span>Schedule:</span>
																	<span>
																		{therapist.scheduleConfigured
																			? "✓ Configured"
																			: "✗ Not set"}
																	</span>
																</div>
															</div>
														</motion.div>
													);
												},
											)}
										</div>
									</ScrollArea>
								</CardContent>
							</Card>
						)} */}

				{diagnosisData?.selectedTherapistsAnalysis.length === 0 &&
					diagnosisData?.availableTherapists.length === 0 && (
						<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-gray-500">
							<Search className="mx-auto mb-4 h-16 w-16 text-gray-300" />
							<h3 className="mb-2 text-lg font-medium text-gray-600">
								No Therapist Data Available
							</h3>
							<p className="text-sm text-gray-500">
								No analysis results found for the selected criteria
							</p>
						</div>
					)}
			</PageContainer>
		</Fragment>
	);
}
