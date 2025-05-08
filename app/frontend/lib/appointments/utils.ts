import type { Appointment } from "@/types/admin-portal/appointment";

const BADGE_STYLES: Record<Appointment["status"], string> = {
	pending_patient_approval:
		"text-yellow-800 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100",
	pending_payment:
		"text-yellow-800 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100",
	pending_therapist_assignment:
		"text-yellow-800 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100",
	cancelled:
		"text-red-800    bg-red-100    dark:bg-red-900   dark:text-red-100",
	unscheduled:
		"text-gray-800   bg-gray-100   dark:bg-gray-900  dark:text-gray-100",
	paid: "text-emerald-800 bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-100",
};
export const getbadgeVariantStatus = (status: Appointment["status"]) =>
	BADGE_STYLES[status] ?? "";
