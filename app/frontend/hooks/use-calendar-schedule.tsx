import {
	type ContextFn,
	differenceInCalendarDays,
	differenceInMinutes,
	format,
	isPast,
	type Locale,
	parse,
	startOfDay,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
	DEFAULT_TIME_FORMAT_24_DATE_FNS,
	type TimeFormat,
	type TimeFormatDateFns,
} from "@/lib/constants";
import type { AdjustedAvailability } from "@/types/admin-portal/availability";
import type { Therapist } from "@/types/admin-portal/therapist";

export const SLOT_HEIGHT = 48; // Height of each time slot row in pixels (for UI rendering)
export const INTERVAL_MINUTES = 60; // Default interval between time slots
export const START_HOUR = 6; // Default start hour of the calendar (midnight)
export const END_HOUR = 24; // Default end hour of the calendar (end of day)

/**
 * Generates an array of time strings based on interval and time range.
 * Example: generateTimeSlots(15) → ["00:00", "00:15", "00:30", ...] (generate for every 15 minutes)
 * Example: generate for every 30 minutes but only 9 AM to 5 PM: generateTimeSlots(30, 9, 17)
 *
 * @param intervalMinutes - Interval between time slots in minutes
 * @param startHour - Start hour for the time slot generation
 * @param endHour - End hour for the time slot generation
 * @returns An array of time strings in "HH:mm" format
 */
export const generateTimeSlots = (
	intervalMinutes = INTERVAL_MINUTES,
	startHour = START_HOUR,
	endHour = END_HOUR,
): string[] => {
	const slots: string[] = [];

	for (let hour = startHour; hour < endHour; hour++) {
		for (let min = 0; min < 60; min += intervalMinutes) {
			const h = hour.toString().padStart(2, "0");
			const m = min.toString().padStart(2, "0");
			slots.push(`${h}:${m}`);
		}
	}

	return slots;
};

/**
 * Checks if a given time (with date, locale, and timezone context) is in the past.
 *
 * @param time - Time string in "HH:mm" format
 * @param date - Base date to associate with the time
 * @param locale - Locale for parsing/formatting
 * @param tzDate - Timezone context function from date-fns
 * @returns Boolean indicating whether the time slot is in the past
 */
export const checkPastTimeSlot = ({
	time,
	date,
	dateOpt,
}: {
	time: string;
	date: Date;
	dateOpt: {
		locale: Locale;
		in: ContextFn<Date>;
	};
}): boolean => {
	const dateTimeParsed = parse(time, "HH:mm", date, {
		locale: dateOpt.locale,
		in: dateOpt.in,
	});

	return isPast(dateTimeParsed);
};

/**
 * Checks if the time difference between two time strings is under or equal to 2 hours.
 *
 * @param startTimeStr - Start time string in "HH:mm"
 * @param endTimeStr - End time string in "HH:mm"
 * @returns Boolean indicating if the time difference is 2 hours or less
 */
export function checkUnder2Hours({
	startTimeStr,
	endTimeStr,
	dateOpt,
}: {
	startTimeStr: string;
	endTimeStr: string;
	dateOpt: {
		locale: Locale;
		in: ContextFn<Date>;
	};
}) {
	const today = new Date();

	// Parse time strings using 24-hour format
	const startTime = parse(startTimeStr, "HH:mm", today, {
		locale: dateOpt.locale,
		in: dateOpt.in,
	});
	const endTime = parse(endTimeStr, "HH:mm", today, {
		locale: dateOpt.locale,
		in: dateOpt.in,
	});

	if (endTime < startTime) {
		// Handle cases where endTime is after midnight (i.e. next day)
		endTime.setDate(endTime.getDate() + 1);
	}

	const diffInMinutes = differenceInMinutes(endTime, startTime);
	return diffInMinutes <= 120;
}

/**
 * Formats a time string into a human-readable label, depending on usage context.
 *
 * @param time - Time string in "HH:mm" format
 * @param type - Type of label format ("time-block" → "h aaa", "appointment-block" → "hh:mm aaa")
 * @param locale - Locale for formatting
 * @param tzDate - Timezone context function from date-fns
 * @returns Formatted time string for display
 */
export const formatTimeLabel = ({
	time,
	type: _type = "time-block",
	dateOpt,
}: {
	time: string;
	type?: "time-block" | "appointment-block";
	dateOpt: {
		locale: Locale;
		in: ContextFn<Date>;
		timeFormat: TimeFormat;
		timeFormatDateFns: TimeFormatDateFns;
	};
}) => {
	// Parse the string into a Date object using the format "HH:mm"
	const date = parse(time, "HH:mm", new Date(), {
		locale: dateOpt.locale,
		in: dateOpt.in,
	});
	// Format the Date object into "h aaa" where "h" is the hour (1-12) and "aaa" is the lowercase AM/PM.
	const timeFormat =
		dateOpt.timeFormat === "12-hours"
			? "h aaa"
			: DEFAULT_TIME_FORMAT_24_DATE_FNS;
	return format(date, timeFormat, { locale: dateOpt.locale, in: dateOpt.in });
};

// --- New: Helper to determine a therapist’s availability for a given date ---
// This checks for an adjusted availability first (which can mark the therapist as unavailable),
// and if none exists, falls back to the weekly availability (based on the day name).
export const getTherapistAvailabilityForDate = ({
	therapist,
	date,
	dateOpt,
}: {
	therapist: Therapist;
	date: Date;
	dateOpt: {
		locale: Locale;
		in: ContextFn<Date>;
	};
}) => {
	const { availability } = therapist;

	// Check maximum booking availability for the given date
	const maxAdvance = availability?.maxAdvanceBookingInDays;
	if (typeof maxAdvance === "number") {
		const today = startOfDay(new Date(), { in: dateOpt.in });
		const targetDate = startOfDay(date, { in: dateOpt.in });
		const diff = differenceInCalendarDays(targetDate, today, {
			in: dateOpt.in,
		});
		if (diff > maxAdvance) {
			return null;
		}
	}

	// Check adjusted availabilities first (can have multiple entries per date)
	const formattedDate = format(date, "yyyy-MM-dd", {
		locale: dateOpt.locale,
		in: dateOpt.in,
	});
	const adjustedForDate =
		availability?.adjustedAvailabilities?.filter(
			(a) => a.specificDate === formattedDate,
		) ?? [];

	const hasTimeWindow = (
		availability: AdjustedAvailability,
	): availability is AdjustedAvailability & {
		startTime: string;
		endTime: string;
	} => Boolean(availability.startTime && availability.endTime);

	if (adjustedForDate.length) {
		// Any entry without times represents a full-day unavailability override
		const hasFullDayBlock = adjustedForDate.some(
			(a) => a.isUnavailable || !a.startTime || !a.endTime,
		);
		if (hasFullDayBlock) {
			return null;
		}

		const adjustedSlots = adjustedForDate.filter(hasTimeWindow).map((a) => ({
			startTime: a.startTime,
			endTime: a.endTime,
		}));

		if (adjustedSlots.length) {
			return adjustedSlots;
		}
	}

	// Fallback to weekly availabilities based on day name
	const dayName = format(date, "EEEE"); // e.g. "Tuesday"
	const weekly =
		availability?.weeklyAvailabilities?.filter(
			(a) => a.dayOfWeek === dayName,
		) || null;

	return weekly;
};

/**
 * React hook for generating and managing calendar time slots.
 *
 * @param intervalMinutes - Interval between time slots (default is 60)
 * @returns Object with:
 *  - timeSlots: array of available time slots
 *  - currentTimeSlot: rounded-down current time based on interval
 *  - currentDateTime: current Date object (auto-updated every minute)
 */
export const useCalendarSchedule = (
	{ intervalMinutes = INTERVAL_MINUTES }: { intervalMinutes?: number } = {
		intervalMinutes: INTERVAL_MINUTES,
	},
) => {
	const timeSlots = useMemo(
		() => generateTimeSlots(intervalMinutes),
		[intervalMinutes],
	);

	const [now, setNow] = useState(new Date());
	useEffect(() => {
		const update = () => setNow(new Date());
		update(); // initial call

		const interval = setInterval(update, 60 * 1000); // every minute
		return () => clearInterval(interval);
	}, []);

	const currentTimeSlot = useMemo(() => {
		const hours = now.getHours();
		const minutes = now.getMinutes();

		const roundedMinutes =
			Math.floor(minutes / intervalMinutes) * intervalMinutes;
		const h = hours.toString().padStart(2, "0");
		const m = roundedMinutes.toString().padStart(2, "0");

		return `${h}:${m}`;
	}, [now, intervalMinutes]);

	return {
		timeSlots,
		currentTimeSlot,
		currentDateTime: now,
	};
};

// Type for what `useCalendarSchedule` returns
export type CalendarScheduleHooks = ReturnType<typeof useCalendarSchedule>;
