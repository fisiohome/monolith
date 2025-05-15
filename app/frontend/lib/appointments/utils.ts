import type { Appointment } from "@/types/admin-portal/appointment";

const BADGE_STYLES: Record<Appointment["status"], string> = {
	pending_patient_approval:
		"text-amber-800 bg-amber-100 border-amber-400 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-500",
	pending_payment:
		"text-amber-800 bg-amber-100 border-amber-400 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-500",
	pending_therapist_assignment:
		"text-amber-800 bg-amber-100 border-amber-400 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-500",
	cancelled:
		"text-red-800 bg-red-100 border-red-400 dark:bg-red-900 dark:text-red-100 dark:border-red-500",
	unscheduled:
		"text-gray-800 bg-gray-100 border-gray-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-500",
	paid: "text-emerald-800 bg-emerald-100 border-emerald-400 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-500",
};
export const getbadgeVariantStatus = (status: Appointment["status"]) =>
	BADGE_STYLES[status] ?? "";
