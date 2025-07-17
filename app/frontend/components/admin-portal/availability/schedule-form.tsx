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
	getDefaultValues,
} from "@/lib/availabilities";
import type { DAY_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
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
import AppointmentSettingsForm from "./appointment-settings";
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
	const serverTimezone = useMemo(
		() => globalProps.adminPortal.currentTimezone,
		[globalProps.adminPortal.currentTimezone],
	);

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
			{
				value: "appointment-settings" as const,
				title: "Appointment Settings",
				description:
					"Manage the time range limitation and the booked appointments.",
			},
		];
	}, []);

	// for form management state
	const [isLoading, setIsLoading] = useState(false);
	const form = useForm<AvailabilityFormSchema>({
		resolver: zodResolver(AVAILABILITY_FORM_SCHEMA),
		defaultValues: useMemo(
			() =>
				getDefaultValues({
					days: dayNames,
					therapist: selectedTherapist,
					serverTimezone,
				}),
			[selectedTherapist, dayNames, serverTimezone],
		),
		mode: "onBlur",
	});
	useEffect(() => {
		form.reset(
			getDefaultValues({
				days: dayNames,
				therapist: selectedTherapist,
				serverTimezone,
			}),
		);
	}, [form.reset, dayNames, selectedTherapist, serverTimezone]);
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
				only: ["adminPortal", "therapists", "flash", "selectedTherapist"],
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

			// Convert frontend availability rules format to backend format
			const formattedAvailabilityRules = values?.availabilityRules?.[0]
				? [
						...(values.availabilityRules[0].distanceInMeters &&
						values.availabilityRules[0].distanceInMeters > 0
							? [
									{
										distanceInMeters:
											values.availabilityRules[0].distanceInMeters,
									},
								]
							: []),
						...(values.availabilityRules[0].durationInMinutes &&
						values.availabilityRules[0].durationInMinutes > 0
							? [
									{
										durationInMinutes:
											values.availabilityRules[0].durationInMinutes,
									},
								]
							: []),
						...(values.availabilityRules[0].useLocationRules !== undefined
							? [{ location: values.availabilityRules[0].useLocationRules }]
							: []),
					]
				: null;

			const payload = deepTransformKeysToSnakeCase({
				currentQuery: globalProps?.adminPortal?.currentQuery,
				therapistAppointmentSchedule: {
					...values,
					therapistId: selectedTherapist?.id || "",
					weeklyAvailabilities: formattedWeeklyAvailabilities,
					adjustedAvailabilities: formattedAdjustedAvailabilities,
					availabilityRules: formattedAvailabilityRules,
				},
			}) satisfies Parameters<typeof router.put>["1"];

			// Check the validity of adjusted availabilities
			const invalidAdjustedIndex = formattedAdjustedAvailabilities?.findIndex(
				(item) => !item.specificDate,
			);
			if (invalidAdjustedIndex && invalidAdjustedIndex !== -1) {
				const errorMessage = "Please provide a specific date.";
				form.setError(
					`adjustedAvailabilities.${invalidAdjustedIndex}.specificDate`,
					{
						type: "manual",
						message: errorMessage,
					},
				);
				toast.error(errorMessage);
				return;
			}

			router.put(submitURL, payload, submitConfig);

			console.log("Therapist appointment schedule successfully saved...");
		},
		[
			selectedTherapist,
			globalProps.adminPortal.router.adminPortal.availability.upsert,
			globalProps?.adminPortal?.currentQuery,
			form.setError,
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
			<h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
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
										<p className="font-semibold uppercase tracking-wide">
											{accordion.title}
										</p>
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

									{accordion.value === "appointment-settings" && (
										<AppointmentSettingsForm
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
