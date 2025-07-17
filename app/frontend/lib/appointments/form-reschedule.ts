import { z } from "zod";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { PREFERRED_THERAPIST_GENDER } from "../constants";
import { APPOINTMENT_SCHEDULING_SCHEMA } from "./form";

// * define the form schema
const { appointmentDateTime, preferredTherapistGender, therapist } =
	APPOINTMENT_SCHEDULING_SCHEMA.shape;

export const RESCHEDULE_APPOINTMENT_FORM_SCHEMA = z.object({
	preferredTherapistGender,
	appointmentDateTime: appointmentDateTime.nullable(),
	therapist,
	reason: z.string().optional(),
	formOptions: z
		.object({
			findTherapistsAllOfDay: z.boolean().default(false),
		})
		.default({ findTherapistsAllOfDay: false }),
});
export type AppointmentRescheduleSchema = z.infer<
	typeof RESCHEDULE_APPOINTMENT_FORM_SCHEMA
>;

// * define the form default values
export const defineFormDefaultValues = (appointment: Appointment) => {
	const { appointmentDateTime, therapist, preferredTherapistGender } =
		appointment;

	return {
		preferredTherapistGender,
		appointmentDateTime: appointmentDateTime
			? new Date(appointmentDateTime)
			: null,
		therapist,
		reason: "",
		formOptions: { findTherapistsAllOfDay: false },
	} satisfies AppointmentRescheduleSchema;
};

// * define the form payload
export interface AppointmentReschedulePayload {
	appointmentDateTime: Date | null;
	preferredTherapistGender: (typeof PREFERRED_THERAPIST_GENDER)[number];
	therapistId: string | null;
	reason: string | null;
	isAllOfDay?: boolean;
}

export const buildPayload = (values: AppointmentRescheduleSchema) => {
	const {
		preferredTherapistGender,
		appointmentDateTime = null,
		therapist,
		reason = null,
		formOptions,
	} = values;
	const payload = deepTransformKeysToSnakeCase({
		preferredTherapistGender,
		appointmentDateTime,
		therapistId: therapist?.id ? String(therapist.id) : null,
		reason,
		isAllOfDay: formOptions?.findTherapistsAllOfDay ?? false,
	} satisfies AppointmentReschedulePayload);

	return payload;
};
