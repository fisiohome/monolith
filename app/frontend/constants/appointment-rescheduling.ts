/**
 * Constants for appointment rescheduling configuration
 * These constants should match the backend configuration in Appointment model
 *
 * BACKEND MIRROR:
 * - ENABLE_STRICT_RESCHEDULING_DATE_RESTRICTION mirrors Appointment::ENABLE_STRICT_RESCHEDULING_DATE_RESTRICTION
 * - ENABLE_PAST_DATE_RESCHEDULING_BYPASS mirrors Appointment::ENABLE_PAST_DATE_RESCHEDULING_BYPASS
 *
 * USAGE:
 * - When ENABLE_PAST_DATE_RESCHEDULING_BYPASS is true: Allow rescheduling to past dates
 * - When ENABLE_STRICT_RESCHEDULING_DATE_RESTRICTION is true: Use strict min_datetime validation
 * - Both constants provide independent control over different aspects of rescheduling
 */

// Control strict rescheduling date restrictions (mirrors backend ENABLE_STRICT_RESCHEDULING_DATE_RESTRICTION)
export const ENABLE_STRICT_RESCHEDULING_DATE_RESTRICTION = false;

// Control past date rescheduling bypass (mirrors backend ENABLE_PAST_DATE_RESCHEDULING_BYPASS)
export const ENABLE_PAST_DATE_RESCHEDULING_BYPASS = true;

// Helper function to check if past dates are allowed
export const isPastDateReschedulingAllowed = (): boolean => {
	return ENABLE_PAST_DATE_RESCHEDULING_BYPASS;
};

// Helper function to check if strict rescheduling is enabled
export const isStrictReschedulingEnabled = (): boolean => {
	return ENABLE_STRICT_RESCHEDULING_DATE_RESTRICTION;
};
