import type { FormMode } from "@/pages/AdminPortal/Therapist/Upsert";
import type { Therapist } from "@/types/admin-portal/therapist";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES, GENDERS } from "./constants";

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

/**
 * Generates a Zod schema for validating therapist form data based on the provided mode.
 *
 * @param mode - The form mode, either "create" or "update".
 *
 * @returns A Zod schema for validating therapist form data.
 *
 * The schema includes the following fields:
 * - `user`: An object containing:
 *   - `email`: A required string that must be a valid email address.
 *   - `password`: A required string that must be between 8 and 64 characters long, and contain at least one uppercase letter, one number, and one symbol.
 *   - `passwordConfirmation`: A required string that must match the password and follow the same validation rules.
 * - `name`: A required string with a minimum length of 3 characters.
 * - `batch`: A nullable number with a minimum value of 1.
 * - `phoneNumber`: A required string that must be a valid phone number.
 * - `gender`: A nullable enum value from `GENDERS`.
 * - `employmentStatus`: A nullable enum value from `EMPLOYMENT_STATUSES`.
 * - `employmentType`: A nullable enum value from `EMPLOYMENT_TYPES`.
 * - `modalities`: A non-empty array of strings.
 * - `specializations`: A non-empty array of strings.
 * - `bankDetails`: A non-empty array of objects containing:
 *   - `bankName`: A required string.
 *   - `accountNumber`: A required string.
 *   - `accountHolderName`: A required string.
 *   - `active`: A boolean with a default value of false.
 * - `service`: An object containing:
 *   - `id`: A required number.
 *   - `name`: A required string.
 *   - `code`: A required string.
 * - `addresses`: A non-empty array of objects containing:
 *   - `id`: An optional string or number.
 *   - `country`: A required string.
 *   - `countryCode`: A required string.
 *   - `state`: A required string.
 *   - `city`: A required string.
 *   - `postalCode`: A required string.
 *   - `address`: A required string.
 *   - `active`: A boolean with a default value of false.
 *
 * The schema also includes the following refinements:
 * - Ensures that the password and password confirmation match.
 * - In "create" mode, ensures that email, password, and password confirmation are provided.
 */
export const getFormSchema = (mode: FormMode) => {
	const user =
		mode === "create"
			? z
					.object({
						email: z.string().email().min(1, { message: "Email is required" }),
						password: z
							.string()
							.min(8, "Password must be at least 8 characters long")
							.max(64, "Password must be no more than 64 characters")
							.regex(
								/[A-Z]/,
								"Password must contain at least one uppercase letter",
							)
							.regex(/\d/, "Password must contain at least one number")
							.regex(/[\W_]/, "Password must contain at least one symbol"),
						passwordConfirmation: z
							.string()
							.min(
								8,
								"Password confirmation must be at least 8 characters long",
							)
							.max(
								64,
								"Password confirmation must be no more than 64 characters",
							)
							.regex(
								/[A-Z]/,
								"Password confirmation must contain at least one uppercase letter",
							)
							.regex(
								/\d/,
								"Password confirmation must contain at least one number",
							)
							.regex(
								/[\W_]/,
								"Password confirmation must contain at least one symbol",
							),
					})
					.refine((data) => data.password === data.passwordConfirmation, {
						message: "Passwords don't match",
						path: ["passwordConfirmation"],
					})
			: z.any();
	const TherapistSchema = z.object({
		user,
		name: z.string().min(3, { message: "Therapist name is required" }),
		batch: z.coerce
			.number({ message: "Invalid batch number" })
			.min(1, { message: "Batch number is required" })
			.nullable(),
		phoneNumber: z
			.string()
			.min(1, { message: "Phone Number is required" })
			.refine(isValidPhoneNumber, { message: "Invalid phone number" }),
		gender: z.enum(GENDERS).nullable(),
		employmentStatus: z.enum(EMPLOYMENT_STATUSES).nullable(),
		employmentType: z.enum(EMPLOYMENT_TYPES).nullable(),
		modalities: z.array(z.string()).nonempty("At least input one modality"),
		specializations: z
			.array(z.string())
			.nonempty("At least input one specialization"),
		bankDetails: z
			.array(
				z.object({
					id: z.union([z.string(), z.number()]).optional(),
					bankName: z.string().min(1, { message: "Bank name is required" }),
					accountNumber: z
						.string()
						.min(1, { message: "Account number is required" }),
					accountHolderName: z
						.string()
						.min(1, { message: "Account holder name is required" }),
					active: z.boolean().default(false),
				}),
			)
			.nonempty("At least input one bank detail"),
		service: z.object({
			id: z.number(),
			name: z.string().min(1, { message: "Service name is required" }),
			code: z.string().min(1, { message: "Service code is required" }),
		}),
		addresses: z
			.array(
				z.object({
					id: z.union([z.string(), z.number()]).optional(),
					country: z.string().min(1, { message: "Country is required" }),
					countryCode: z
						.string()
						.min(1, { message: "Country code is required" }),
					state: z.string().min(1, { message: "State is required" }),
					city: z.string().min(1, { message: "City is required" }),
					postalCode: z.string().min(1, { message: "Postal code is required" }),
					address: z.string().min(1, { message: "Address is required" }),
					active: z.boolean().default(false),
				}),
			)
			.nonempty("At least input one address"),
	});

	return TherapistSchema;
};
export type TherapistFormSchema = z.infer<ReturnType<typeof getFormSchema>>;
