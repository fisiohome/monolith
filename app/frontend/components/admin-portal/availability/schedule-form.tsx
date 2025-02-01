import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import {
	AVAILABILITY_FORM_SCHEMA,
	type AvailabilityFormSchema,
} from "@/lib/availabilities";
import type { DAY_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { add } from "date-fns";
import { LoaderIcon } from "lucide-react";
import {
	type ComponentProps,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import AdjustedAvailabilityForm from "./adjusted-availability";
import WeeklyAvailabilityForm from "./weekly-availability";

// * for the scheduled form
export interface ScheduleFormProps extends ComponentProps<"div"> {
	selectedTherapist: Therapist | null;
	dayNames: (typeof DAY_NAMES)[number][];
}

export default function ScheduleForm({
	className,
	selectedTherapist,
	dayNames,
}: ScheduleFormProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	// for accordion management state
	const accordions = useMemo(() => {
		return [
			{
				value: "general-availability" as const,
				title: "General Availability",
				description:
					"Specify when the therapist is available for scheduled sessions.",
			},
			{
				value: "adjusted-availability" as const,
				title: "Adjusted Availability",
				description:
					"Find out when the therapist will be available for a specific dates.",
			},
			// {
			// 	value: "appointment-settings" as const,
			// 	title: "Appointment Settings",
			// 	description:
			// 		"Manage the time range limitation and the booked appointments.",
			// },
		];
	}, []);

	// for form management state
	const [isLoading, setIsLoading] = useState(false);
	const getFormDefaultValues = useCallback<() => AvailabilityFormSchema>(() => {
		return {
			therapistId: selectedTherapist?.id || "",
			timeZone: "Asia/Jakarta",
			appointmentDurationInMinutes: 90,
			bufferTimeInMinutes: 30,
			maxAdvanceBookingInDays: 14,
			minBookingBeforeInHours: 24,
			availableNow: true,
			startDateWindow: undefined,
			endDateWindow: undefined,
			weeklyAvailabilities: dayNames.map((day) => {
				let times: NonNullable<
					NonNullable<
						AvailabilityFormSchema["weeklyAvailabilities"]
					>[number]["times"]
				> = [];

				if (day === "Tuesday") {
					times = [{ startTime: "09:00", endTime: "12:00" }];

					// overlap time error example
					// times = [
					// 	{ startTime: "09:00", endTime: "12:00" },
					// 	{ startTime: "10:00", endTime: "11:00" },
					// 	{ startTime: "08:00", endTime: "10:00" },
					// ];
				}

				if (day === "Thursday") {
					times = [
						{ startTime: "09:00", endTime: "12:00" },
						{ startTime: "13:00", endTime: "17:00" },
					];

					// duplicate time error example
					// times = [
					// 	{ startTime: "09:00", endTime: "12:00" },
					// 	{ startTime: "09:00", endTime: "12:00" },
					// ];
				}

				return { dayOfWeek: day, times };
			}) satisfies AvailabilityFormSchema["weeklyAvailabilities"],
			adjustedAvailabilities: [
				{
					specificDate: add(new Date(), { days: 3 }),
					times: null,
					reason: "Holiday",
				},
				{
					specificDate: add(new Date(), { days: 5 }),
					reason: "Morning session",
					times: [
						{ startTime: "09:00", endTime: "12:00" },
						{ startTime: "13:00", endTime: "17:00" },
					],

					// duplicate time error example
					// times: [
					// 	{ startTime: "09:00", endTime: "12:00" },
					// 	{ startTime: "09:00", endTime: "12:00" },
					// ],
				},
				{
					specificDate: add(new Date(), { days: 7 }),
					times: [{ startTime: "09:00", endTime: "12:00" }],

					// overlap time error example
					// times: [
					// 	{ startTime: "09:00", endTime: "12:00" },
					// 	{ startTime: "10:00", endTime: "11:00" },
					// 	{ startTime: "08:00", endTime: "10:00" },
					// ],
				},
			] satisfies AvailabilityFormSchema["adjustedAvailabilities"],
		};
	}, [selectedTherapist, dayNames]);
	const form = useForm<AvailabilityFormSchema>({
		resolver: zodResolver(AVAILABILITY_FORM_SCHEMA),
		defaultValues: getFormDefaultValues(),
		mode: "onBlur",
	});
	const onSubmit = useCallback(
		(values: AvailabilityFormSchema) => {
			console.log(
				"Starting process to saving the therapist appointment schedule...",
			);

			const submitURL =
				globalProps.adminPortal.router.adminPortal.availability.upsert;
			const submitConfig = {
				preserveScroll: true,
				preserveState: true,
				only: [
					"adminPortal",
					"therapists",
					"flash",
					"selectedTherapist",
					"errors",
				],
				onStart: () => setIsLoading(true),
				onFinish: () => setTimeout(() => setIsLoading(false), 250),
			} satisfies Parameters<typeof router.put>["2"];
			const formattedWeeklyAvailabilities =
				values?.weeklyAvailabilities
					?.filter((week) => !!week.times?.length)
					?.flatMap((week) => {
						if (week?.times?.length) {
							return week?.times.map((time) => ({
								dayOfWeek: week.dayOfWeek,
								startTime: time.startTime,
								endTime: time.endTime,
							}));
						}
					}) || null;
			const formattedAdjustedAvailabilities =
				values?.adjustedAvailabilities?.flatMap((date) => {
					if (date?.times?.length) {
						return date?.times.map((time) => ({
							specificDate: date.specificDate,
							startTime: time.startTime,
							endTime: time.endTime,
							reason: date.reason,
						}));
					}

					return [
						{
							specificDate: date.specificDate,
							reason: date.reason,
						},
					];
				}) || null;
			const payload = deepTransformKeysToSnakeCase({
				currentQuery: globalProps?.adminPortal?.currentQuery,
				therapistAppointmentSchedule: {
					...values,
					therapistId: selectedTherapist?.id || "",
					weeklyAvailabilities: formattedWeeklyAvailabilities,
					adjustedAvailabilities: formattedAdjustedAvailabilities,
				},
			}) satisfies Parameters<typeof router.put>["1"];

			router.put(submitURL, payload, submitConfig);

			console.log("Therapist appointment schedule successfully saved...");
		},
		[
			selectedTherapist,
			globalProps.adminPortal.router.adminPortal.availability.upsert,
			globalProps?.adminPortal?.currentQuery,
		],
	);

	// use effect for get the form validation errors
	useEffect(() => {
		const formErrors = form.formState.errors;
		const weeklyAvailabilitiesErrors = formErrors?.weeklyAvailabilities;

		// * get the weekly availability root error
		if (weeklyAvailabilitiesErrors?.root?.message) {
			toast.error(weeklyAvailabilitiesErrors?.root?.message);
			return;
		}

		// * get the time weekly availability errors
		if (
			!!weeklyAvailabilitiesErrors &&
			Array.isArray(weeklyAvailabilitiesErrors)
		) {
			const errorMessages = weeklyAvailabilitiesErrors
				?.map((error, index) => {
					const message = error?.times?.root?.message;
					if (message) {
						const day = dayNames[index];
						return `${message} for ${day} form`;
					}
					return null; // Skip invalid entries
				})
				.filter(Boolean); // Remove null or undefined entries

			if (errorMessages && errorMessages.length > 0) {
				toast.error(errorMessages[0]); // Display only the first error message
			}
		}
	}, [form.formState.errors, dayNames]);

	return (
		<div className={cn("space-y-2 text-sm", className)}>
			<h2 className="text-xs font-semibold tracking-wider uppercase">
				Bookable Appointment schedule
			</h2>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<Accordion
						type="multiple"
						defaultValue={accordions.map((accordion) => accordion.value)}
					>
						{accordions.map((accordion, index) => (
							<AccordionItem
								key={accordion.value}
								value={accordion.value}
								className={cn(
									"border rounded-lg shadow-inner bg-background border-border",
									index !== 0 ? "mt-2" : "",
								)}
							>
								<AccordionTrigger className="p-3">
									<div className="lg:w-6/12">
										<p>{accordion.title}</p>
										<p className="font-light text-pretty">
											{accordion.description}
										</p>
									</div>
								</AccordionTrigger>

								<AccordionContent className="pb-3">
									{accordion.value === "general-availability" && (
										<WeeklyAvailabilityForm
											selectedTherapist={selectedTherapist}
										/>
									)}

									{accordion.value === "adjusted-availability" && (
										<AdjustedAvailabilityForm
											selectedTherapist={selectedTherapist}
										/>
									)}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>

					<div className="!mt-10 lg:!mt-6 gap-4 lg:gap-2 w-full flex flex-col md:flex-row md:justify-end bg-background p-3 rounded-lg shadow-inner border border-border">
						<Button
							type="submit"
							disabled={isLoading || !selectedTherapist}
							className={cn("w-full order-first md:order-last lg:w-auto")}
						>
							{isLoading ? (
								<>
									<LoaderIcon className="animate-spin" />
									<span>Saving...</span>
								</>
							) : (
								<span>Save</span>
							)}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}
