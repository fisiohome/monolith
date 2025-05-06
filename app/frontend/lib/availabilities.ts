import type { Therapist } from "@/types/admin-portal/therapist";
import { z } from "zod";
import { DAY_NAMES } from "./constants";
import { timeSchema } from "./validation";

// the start and end time form schema
const startEndTimeSchema = z
	.object({
		startTime: timeSchema,
		endTime: timeSchema,
	})
	.refine((data) => data.startTime < data.endTime, {
		message: "End time must be after start time",
		path: ["endTime"],
	});

// the overlaps and duplicates validation helper
const createOverlapValidator = (
	_context: "weekly availability" | "adjusted availability",
) => {
	return z.array(startEndTimeSchema).superRefine((items, ctx) => {
		// Check for duplicates first
		const uniqueSlots = new Set(
			items.map((i) => `${i.startTime}-${i.endTime}`),
		);

		if (uniqueSlots.size !== items.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Has a duplicate time slots",
			});

			return;
		}

		// Check for overlaps
		for (let i = 0; i < items.length; i++) {
			for (let j = i + 1; j < items.length; j++) {
				const a = items[i];
				const b = items[j];

				if (a.startTime < b.endTime && a.endTime > b.startTime) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Has a time ranges overlap",
					});
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Overlaps with another slot time: ${a.startTime} - ${a.endTime}`,
						path: [j],
					});
				}
			}
		}
	});
};

// Weekly Availability Schema
const weeklyAvailabilitiesSchema = z.object({
	dayOfWeek: z.enum(DAY_NAMES),
	times: createOverlapValidator("weekly availability").nullable(),
});

// Adjusted Availability Schema
const adjustedAvailabilitiesSchema = z.object({
	specificDate: z.coerce.date().nullable(),
	reason: z.string().optional(),
	times: createOverlapValidator("adjusted availability").nullable(),
});

// Main schema definition
export const AVAILABILITY_FORM_SCHEMA = z
	.object({
		therapistId: z.string(),
		timeZone: z.string(),
		appointmentDurationInMinutes: z.number().int().positive(),
		bufferTimeInMinutes: z.number().int().nonnegative(),
		maxAdvanceBookingInDays: z.number().int().nonnegative(),
		minBookingBeforeInHours: z.number().int().nonnegative(),
		availableNow: z.boolean(),
		startDateWindow: z.coerce.date().optional(),
		endDateWindow: z.coerce.date().optional(),
		weeklyAvailabilities: z.array(weeklyAvailabilitiesSchema).nullable(),
		adjustedAvailabilities: z.array(adjustedAvailabilitiesSchema).nullable(),
	})
	.superRefine((data, ctx) => {
		if (!data.availableNow) {
			if (!data.startDateWindow || !data.endDateWindow) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Date window required when not available now",
					path: ["availableNow"],
				});
			} else if (data.startDateWindow > data.endDateWindow) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "End date must be after start date",
					path: ["endDateWindow"],
				});
			}
		}

		if (data.bufferTimeInMinutes >= data.appointmentDurationInMinutes) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Buffer time must be less than appointment duration",
				path: ["bufferTimeInMinutes"],
			});
		}
	});

export type AvailabilityFormSchema = z.infer<typeof AVAILABILITY_FORM_SCHEMA>;

// get the form default values
export const getDefaultValues = ({
	days,
	therapist,
	serverTimezone,
}: {
	days: (typeof DAY_NAMES)[number][];
	therapist: Therapist | null;
	serverTimezone: string;
}): AvailabilityFormSchema => {
	const availability = therapist?.availability ?? {};

	// Extracting values with proper typings and default values
	// * all of the default values based on the database default
	const {
		timeZone = serverTimezone || "Asia/Jakarta",
		appointmentDurationInMinutes = 90,
		bufferTimeInMinutes = 30,
		maxAdvanceBookingInDays = 60,
		minBookingBeforeInHours = 24,
		isAvailableNow = true,
		startDateWindow,
		endDateWindow,
		weeklyAvailabilities = [],
		adjustedAvailabilities = [],
	}: Partial<Therapist["availability"]> = availability;

	return {
		therapistId: therapist?.id || "",
		timeZone,
		appointmentDurationInMinutes,
		bufferTimeInMinutes,
		maxAdvanceBookingInDays,
		minBookingBeforeInHours,
		availableNow: Boolean(isAvailableNow),
		startDateWindow: startDateWindow
			? new Date(String(startDateWindow))
			: undefined,
		endDateWindow: endDateWindow ? new Date(String(endDateWindow)) : undefined,

		weeklyAvailabilities: days.map((day) => ({
			dayOfWeek: day,
			times: weeklyAvailabilities
				.filter(
					({ dayOfWeek }) => dayOfWeek.toLowerCase() === day.toLowerCase(),
				)
				.map(({ startTime, endTime }) => ({ startTime, endTime })),
		})) satisfies AvailabilityFormSchema["weeklyAvailabilities"],

		adjustedAvailabilities: adjustedAvailabilities.length
			? (Object.values(
					adjustedAvailabilities.reduce(
						(
							acc,
							{ specificDate, startTime, endTime, reason, isUnavailable },
						) => {
							// parse a date to the specific timezone
							// const date = new TZDate(specificDate, serverTimezone);
							const date = new Date(String(specificDate));
							const formattedDate = date.toString();

							acc[formattedDate] ??= {
								specificDate: date,
								times: [],
								reason: undefined,
							};

							if (isUnavailable) {
								acc[formattedDate].reason = reason || "";
								acc[formattedDate].times = null;
							} else if (startTime && endTime) {
								acc[formattedDate].times?.push({ startTime, endTime });
								if (reason) acc[formattedDate].reason = reason;
							}

							return acc;
						},
						{} as Record<
							string,
							NonNullable<
								AvailabilityFormSchema["adjustedAvailabilities"]
							>[number]
						>,
					),
				) satisfies AvailabilityFormSchema["adjustedAvailabilities"])
			: [],
	};
};
