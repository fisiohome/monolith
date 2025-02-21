import type { DAY_NAMES } from "@/lib/constants";

export interface Availability {
	id: number;
	timeZone: string;
	appointmentDurationInMinutes: number;
	maxAdvanceBookingInDays: number;
	minBookingBeforeInHours: number;
	bufferTimeInMinutes: number;
	isAvailableNow: boolean;
	startDateWindow: string;
	endDateWindow: string;
	weeklyAvailabilities: WeeklyAvailability[];
	adjustedAvailabilities: AdjustedAvailability[];
}

export interface WeeklyAvailability {
	id: number;
	dayOfWeek: (typeof DAY_NAMES)[number];
	startTime: string;
	endTime: string;
}

export interface AdjustedAvailability {
	id: number;
	specificDate: string;
	startTime?: string;
	endTime?: string;
	reason?: string;
	isUnavailable: boolean;
}

export interface AvailabilityDetail {
	available: boolean;
	reasons: string[];
}
