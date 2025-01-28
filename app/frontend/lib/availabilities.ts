import { z } from "zod";
import { DAY_NAMES } from "./constants";

// Utility: Validates time format "HH:mm" using a regex
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Utility: Converts time in "HH:mm" format to total minutes since midnight
const toMinutes = (time: string) => {
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
};

// Utility: Validates that for each time slot, startTime < endTime
const validateTimeRange = (
	times: Array<{ startTime: string; endTime: string }> | null,
) => {
	if (!times) return true; // If times are null, it's valid
	return times.every(
		({ startTime, endTime }) => toMinutes(startTime) < toMinutes(endTime),
	);
};
const validateTimeRangeErrMessage =
	"Each time slot's end-time must be after its start-time";

// Utility: Ensures that there are no overlapping time slots in a day
const hasNoOverlaps = (
	times: Array<{ startTime: string; endTime: string }> | null,
) => {
	if (!times) return true; // If times are null, it's valid

	// Convert each time slot to its start and end in total minutes
	const sortedTimes = times
		.map(({ startTime, endTime }) => ({
			start: toMinutes(startTime),
			end: toMinutes(endTime),
		}))
		// Sort by start time to make overlap checks easier
		.sort((a, b) => a.start - b.start);

	// Check if any time slot overlaps with the next one
	for (let i = 0; i < sortedTimes.length - 1; i++) {
		if (sortedTimes[i].end > sortedTimes[i + 1].start) {
			return false;
		}
	}

	return true;
};

// Shared schema for a single time slot
const timeSlotSchema = z.object({
	startTime: z.string().regex(timeRegex, "Invalid time format"), // Start time must match "HH:mm"
	endTime: z.string().regex(timeRegex, "Invalid time format"), // End time must match "HH:mm"
});

// Main schema definition
export const AVAILABILITY_FORM_SCHEMA = z.object({
	// Weekly availabilities for each day of the week
	weeklyAvailabilities: z
		.array(
			z.object({
				dayOfWeek: z.enum(DAY_NAMES), // Must be a valid day of the week (e.g., "Monday")
				times: z
					.array(timeSlotSchema) // An array of time slots
					.nullable() // Times can be null (no availability for the day)
					.refine(validateTimeRange, {
						message: validateTimeRangeErrMessage, // Ensure valid time ranges
					}),
			}),
		)
		.refine(
			(weeklyAvailabilities) =>
				// Check that there are no overlapping time slots for each day
				weeklyAvailabilities.every(({ times }) => hasNoOverlaps(times)),
			{
				message: "Time slots must not overlap within the same day",
			},
		),
	// Adjusted availabilities for a specific date
	adjustedAvailabilities: z
		.object({
			specificDate: z.coerce.date(), // Specific date for the availability
			times: z
				.array(
					z
						.object({
							reason: z.string().optional(),
						})
						.merge(timeSlotSchema),
				) // An array of time slots
				.nullable() // Times can be null (no availability for the specific date)
				.refine(validateTimeRange, {
					message: validateTimeRangeErrMessage, // Ensure valid time ranges
				})
				.refine(hasNoOverlaps, {
					message: "Time slots must not overlap on the specific date", // Ensure no overlapping time slots
				}),
		})
		.nullable(),
});

// Type inference for the form schema
export type AvailabilityFormSchema = z.infer<typeof AVAILABILITY_FORM_SCHEMA>;
