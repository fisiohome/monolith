import { z } from "zod";
import { APPOINTMENT_SCHEDULING_SCHEMA } from "./form";
import type { Appointment } from "@/types/admin-portal/appointment";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import type { PREFERRED_THERAPIST_GENDER } from "../constants";

// * define the form schema
const { appointmentDateTime, preferredTherapistGender, therapist } =
	APPOINTMENT_SCHEDULING_SCHEMA.shape;

export const RESCHEDULE_APPOINTMENT_FORM_SCHEMA = z.object({
	preferredTherapistGender,
	appointmentDateTime: appointmentDateTime.nullable(),
	therapist,
	reason: z.string().optional(),
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
	} satisfies AppointmentRescheduleSchema;
};

// * define the form payload
export interface AppointmentReschedulePayload {
	appointmentDateTime: Date | null;
	preferredTherapistGender: (typeof PREFERRED_THERAPIST_GENDER)[number];
	therapistId: string | null;
	reason: string | null;
}

export const buildPayload = (values: AppointmentRescheduleSchema) => {
	const {
		preferredTherapistGender,
		appointmentDateTime = null,
		therapist,
		reason = null,
	} = values;
	const payload = deepTransformKeysToSnakeCase({
		preferredTherapistGender,
		appointmentDateTime,
		therapistId: therapist?.id ? String(therapist.id) : null,
		reason,
	} satisfies AppointmentReschedulePayload);

	return payload;
};
