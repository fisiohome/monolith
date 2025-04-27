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
	appointmentDateTime,
	therapist,
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
		appointmentDateTime: new Date(appointmentDateTime),
		therapist,
	} satisfies AppointmentRescheduleSchema;
};

// * define the form payload
export interface AppointmentReschedulePayload {
	appointmentDateTime: Date;
	preferredTherapistGender: (typeof PREFERRED_THERAPIST_GENDER)[number];
	therapistId: string | null;
}

export const buildPayload = (values: AppointmentRescheduleSchema) => {
	const { preferredTherapistGender, appointmentDateTime, therapist } = values
	const payload = deepTransformKeysToSnakeCase({
		preferredTherapistGender,
		appointmentDateTime,
		therapistId: therapist?.id ? String(therapist.id) : null
	} satisfies AppointmentReschedulePayload)

	return payload
}