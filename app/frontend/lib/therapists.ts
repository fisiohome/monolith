import type { Therapist } from "@/types/admin-portal/therapist";

/**
 * Returns the CSS class for the badge variant based on the therapist's employment status.
 *
 * @param data - The employment status of the therapist.
 * @returns The CSS class for the badge variant.
 */
export const getEmpStatusBadgeVariant = (
	data: Therapist["employmentStatus"][number],
) => {
	if (data === "HOLD") return "bg-amber-500";

	if (data === "INACTIVE") return "bg-rose-500";

	return "bg-emerald-500";
};
