import type { VariantDotBadge } from "@/components/shared/dot-badge";
import type { Appointment } from "@/types/admin-portal/appointment";

const BADGE_STYLES: Record<Appointment["status"], string> = {
	unscheduled:
		"text-gray-800 bg-gray-100 border-gray-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-500",
	on_hold:
		"text-blue-800 bg-blue-100 border-blue-400 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-500",
	pending_patient_approval:
		"text-amber-800 bg-amber-100 border-amber-400 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-500",
	pending_payment:
		"text-amber-800 bg-amber-100 border-amber-400 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-500",
	pending_therapist_assignment:
		"text-amber-800 bg-amber-100 border-amber-400 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-500",
	cancelled:
		"text-red-800 bg-red-100 border-red-400 dark:bg-red-900 dark:text-red-100 dark:border-red-500",
	paid: "text-emerald-800 bg-emerald-100 border-emerald-400 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-500",
	completed:
		"text-emerald-800 bg-emerald-100 border-emerald-400 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-500",
};
export const getBadgeVariantStatus = (status: Appointment["status"]) =>
	BADGE_STYLES[status] ?? "";

const DOT_STYLES: Record<Appointment["status"], VariantDotBadge["variant"]> = {
	cancelled: "destructive",
	unscheduled: "outline",
	on_hold: "blue",
	pending_patient_approval: "warning",
	pending_payment: "warning",
	pending_therapist_assignment: "warning",
	paid: "success",
	completed: "success",
};
export const getDotVariantStatus = (
	status: Appointment["status"],
): VariantDotBadge["variant"] => DOT_STYLES[status] ?? "default";
