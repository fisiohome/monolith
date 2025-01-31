import { z } from "zod";

export const PASSWORD_WITH_CONFIRMATION_SCHEMA = z
	.object({
		password: z
			.string()
			.min(8, "New password must be at least 8 characters long")
			.max(64, "New password must be no more than 64 characters")
			.regex(/[A-Z]/, "New password must contain at least one uppercase letter")
			.regex(/\d/, "New password must contain at least one number")
			.regex(/[\W_]/, "New password must contain at least one symbol"),
		passwordConfirmation: z
			.string()
			.min(8, "Password confirmation must be at least 8 characters long")
			.max(64, "Password confirmation must be no more than 64 characters")
			.regex(
				/[A-Z]/,
				"Password confirmation must contain at least one uppercase letter",
			)
			.regex(/\d/, "Password confirmation must contain at least one number")
			.regex(/[\W_]/, "Password confirmation must contain at least one symbol"),
	})
	.refine((data) => data.password === data.passwordConfirmation, {
		message: "Passwords don't match",
		path: ["passwordConfirmation"],
	});

// Validates time format "HH:mm" using a regex
export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const timeSchema = z
	.string()
	.regex(TIME_REGEX, { message: "Invalid time format (HH:MM)" });
