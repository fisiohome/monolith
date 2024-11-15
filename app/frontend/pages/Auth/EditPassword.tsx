import SettingsLayout from "@/components/admin-portal/settings/layout";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import type { User } from "@/types/auth";
import type { GlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { Head, router, usePage } from "@inertiajs/react";
import { Eye, EyeClosed } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export interface EditPasswordPageProps {
	user: Pick<
		User,
		| "id"
		| "email"
		| "lastOnlineAt"
		| "suspendAt"
		| "suspendEnd"
		| "createdAt"
		| "updatedAt"
	>;
}

export default function EditPassword({ user }: EditPasswordPageProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	console.log(globalProps);

	const [passwordVisibility, setPasswordVisibility] = useState({
		old: false,
		confirmation: false,
		current: false,
	});
	const formSchema = z
		.object({
			email: z.string().optional(),
			password: z
				.string()
				.min(8, "New password must be at least 8 characters long")
				.max(64, "New password must be no more than 64 characters")
				.regex(
					/[A-Z]/,
					"New password must contain at least one uppercase letter",
				)
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
				.regex(
					/[\W_]/,
					"Password confirmation must contain at least one symbol",
				),
			currentPassword: z
				.string()
				.min(8, "Current password must be at least 8 characters long")
				.max(64, "Current password must be no more than 64 characters")
				.regex(
					/[A-Z]/,
					"Current password must contain at least one uppercase letter",
				)
				.regex(/\d/, "Current password must contain at least one number")
				.regex(/[\W_]/, "Current password must contain at least one symbol"),
		})
		.refine((data) => data.password === data.passwordConfirmation, {
			message: "Passwords don't match",
			path: ["passwordConfirmation"],
		})
		.refine((data) => data.password !== data.currentPassword, {
			message: "Your current and previous passwords cannot be the same",
			path: ["currentPassword"],
		});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: user.email,
			password: "",
			passwordConfirmation: "",
			currentPassword: "",
		},
		mode: "onBlur",
	});
	function onSubmit(values: z.infer<typeof formSchema>) {
		console.log("Submitting form to create the admin...");
		router.put(
			globalProps.adminPortal.router.auth.registration.index,
			deepTransformKeysToSnakeCase({
				user: { ...values },
			}),
		);
		console.log("Admin successfully created...");
	}

	return (
		<>
			<Head title="Change Password" />

			<SettingsLayout
				featureTitle="Change Password"
				featureDescription="Update your account password settings."
			>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid space-y-4 lg:w-8/12"
					>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="email"
											placeholder="Enter the email..."
											readOnly
										/>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Password</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												{...field}
												type={passwordVisibility.old ? "text" : "password"}
												placeholder="Enter the new password..."
												autoComplete="new-password"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7 text-muted-foreground"
												onClick={() => {
													setPasswordVisibility({
														...passwordVisibility,
														old: !passwordVisibility.old,
													});
												}}
											>
												{!passwordVisibility.old ? (
													<Eye className="size-4" />
												) : (
													<EyeClosed className="size-4" />
												)}
												<span className="sr-only">
													Toggle Password Visibility
												</span>
											</Button>
										</div>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="passwordConfirmation"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password Confirmation</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												{...field}
												type={
													passwordVisibility.confirmation ? "text" : "password"
												}
												placeholder="Enter the password confirmation..."
												autoComplete="new-password"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7 text-muted-foreground"
												onClick={() => {
													setPasswordVisibility({
														...passwordVisibility,
														confirmation: !passwordVisibility.confirmation,
													});
												}}
											>
												{!passwordVisibility.confirmation ? (
													<Eye className="size-4" />
												) : (
													<EyeClosed className="size-4" />
												)}
												<span className="sr-only">
													Toggle Password Visibility
												</span>
											</Button>
										</div>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="currentPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Current Password</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												{...field}
												type={passwordVisibility.current ? "text" : "password"}
												placeholder="Enter the current password..."
												autoComplete="current-password"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7 text-muted-foreground"
												onClick={() => {
													setPasswordVisibility({
														...passwordVisibility,
														current: !passwordVisibility.current,
													});
												}}
											>
												{!passwordVisibility.current ? (
													<Eye className="size-4" />
												) : (
													<EyeClosed className="size-4" />
												)}
												<span className="sr-only">
													Toggle Password Visibility
												</span>
											</Button>
										</div>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex !mt-6">
							<Button type="submit">Update</Button>
						</div>
					</form>
				</Form>
			</SettingsLayout>
		</>
	);
}
