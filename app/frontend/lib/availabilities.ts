import { z } from "zod";
import type { Therapist } from "@/types/admin-portal/therapist";
import { DAY_NAMES, DEFAULT_TIMEZONE } from "./constants";
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

// Availability Rules Schema
const availabilityRulesSchema = z.object({
	distanceInMeters: z.number().int().nonnegative().optional(),
	durationInMinutes: z.number().int().nonnegative().optional(),
	useLocationRules: z.boolean().optional(),
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
		availabilityRules: z.array(availabilityRulesSchema).optional(),
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
		timeZone = serverTimezone || DEFAULT_TIMEZONE,
		appointmentDurationInMinutes = 90,
		bufferTimeInMinutes = 30,
		maxAdvanceBookingInDays = 60,
		minBookingBeforeInHours = 24,
		isAvailableNow = true,
		startDateWindow,
		endDateWindow,
		weeklyAvailabilities = [],
		adjustedAvailabilities = [],
		availabilityRules = [],
	}: Partial<Therapist["availability"]> = availability;

	// Convert backend availability rules format to frontend format
	const convertedAvailabilityRules =
		availabilityRules &&
		Array.isArray(availabilityRules) &&
		availabilityRules.length > 0
			? [
					availabilityRules.reduce(
						(
							acc: {
								distanceInMeters?: number;
								durationInMinutes?: number;
								useLocationRules?: boolean;
							},
							rule: {
								distanceInMeters?: number;
								durationInMinutes?: number;
								location?: boolean;
							},
						) => {
							if (rule && typeof rule === "object") {
								if (rule.distanceInMeters)
									acc.distanceInMeters = rule.distanceInMeters;
								if (rule.durationInMinutes)
									acc.durationInMinutes = rule.durationInMinutes;
								if (rule.location !== undefined)
									acc.useLocationRules = rule.location;
							}
							return acc;
						},
						{} as {
							distanceInMeters?: number;
							durationInMinutes?: number;
							useLocationRules?: boolean;
						},
					),
				]
			: [
					{
						distanceInMeters: 0,
						durationInMinutes: 0,
						useLocationRules: false,
					},
				];

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

		weeklyAvailabilities: Array.isArray(weeklyAvailabilities)
			? days.map((day) => ({
					dayOfWeek: day,
					times: weeklyAvailabilities
						.filter(
							({ dayOfWeek }) =>
								dayOfWeek && dayOfWeek.toLowerCase() === day.toLowerCase(),
						)
						.map(({ startTime, endTime }) => ({ startTime, endTime })),
				}))
			: (days.map((day) => ({
					dayOfWeek: day,
					times: [],
				})) satisfies AvailabilityFormSchema["weeklyAvailabilities"]),

		adjustedAvailabilities: Array.isArray(adjustedAvailabilities)
			? adjustedAvailabilities.map((adj) => ({
					specificDate: adj.specificDate
						? new Date(String(adj.specificDate))
						: null,
					reason: adj.reason || "",
					times:
						adj.times?.map((time: { startTime: string; endTime: string }) => ({
							startTime: time.startTime,
							endTime: time.endTime,
						})) || null,
				}))
			: ([] satisfies AvailabilityFormSchema["adjustedAvailabilities"]),

		availabilityRules: convertedAvailabilityRules,
	};
};
