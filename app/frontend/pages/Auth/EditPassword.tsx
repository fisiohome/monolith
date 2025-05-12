import {
	SettingLayout,
	SettingSectionLayout,
} from "@/components/admin-portal/settings/layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { IS_DEKSTOP_MEDIA_QUERY } from "@/lib/constants";
import type { User } from "@/types/auth";
import type { GlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { Head, router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Eye, EyeClosed, Info } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

export interface EditPasswordPageProps {
	user: Pick<User, "id" | "email">;
}

export default function EditPassword({ user }: EditPasswordPageProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const isDekstop = useMediaQuery(IS_DEKSTOP_MEDIA_QUERY);
	const { t } = useTranslation("settings", {
		keyPrefix: "account_security",
	});
	const { t: tcpf } = useTranslation("settings", {
		keyPrefix: "account_security.change_password.form",
	});

	// form state group
	const [passwordVisibility, setPasswordVisibility] = useState({
		new: false,
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
			<Head title={t("title")} />

			<SettingLayout>
				<SettingSectionLayout
					title={t("change_password.title")}
					description={t("change_password.description")}
				>
					<Alert variant="warning">
						<Info className="w-4 h-4" />
						<AlertTitle>Info</AlertTitle>
						<AlertDescription className="text-pretty">
							{t("change_password.alert")}
						</AlertDescription>
					</Alert>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8">
							<div className="grid w-full gap-4 lg:w-6/12">
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{tcpf("email.label")}</FormLabel>
											<FormControl>
												<Input
													{...field}
													readOnly
													type="email"
													placeholder={`${tcpf("email.placeholder")}...`}
													className="shadow-inner bg-sidebar"
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
											<FormLabel>{tcpf("new_password.label")}</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														{...field}
														type={passwordVisibility.new ? "text" : "password"}
														placeholder={`${tcpf("new_password.placeholder")}...`}
														autoComplete="new-password"
														className="shadow-inner bg-sidebar"
													/>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7 text-muted-foreground"
														onClick={() => {
															setPasswordVisibility({
																...passwordVisibility,
																new: !passwordVisibility.new,
															});
														}}
													>
														{!passwordVisibility.new ? (
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
											<FormLabel>
												{tcpf("password_confirmation.label")}
											</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														{...field}
														type={
															passwordVisibility.confirmation
																? "text"
																: "password"
														}
														placeholder={`${tcpf("password_confirmation.placeholder")}...`}
														autoComplete="new-password"
														className="shadow-inner bg-sidebar"
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
											<FormLabel>{tcpf("current_password.label")}</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														{...field}
														type={
															passwordVisibility.current ? "text" : "password"
														}
														placeholder={`${tcpf("current_password.placeholder")}...`}
														autoComplete="current-password"
														className="shadow-inner bg-sidebar"
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
							</div>

							<div className="flex justify-end">
								<Button
									size={!isDekstop ? "default" : "sm"}
									type="submit"
									className="w-full md:w-auto"
								>
									Update
								</Button>
							</div>
						</form>
					</Form>
				</SettingSectionLayout>
			</SettingLayout>
		</>
	);
}
