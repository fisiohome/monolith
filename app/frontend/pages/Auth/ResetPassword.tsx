import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import type { GlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { ChevronLeft, Eye, EyeClosed, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z
	.object({
		"reset_password_token": z.string(),
		"password": z
			.string()
			.min(8, "New password must be at least 8 characters long")
			.max(64, "New password must be no more than 64 characters")
			.regex(/[A-Z]/, "New password must contain at least one uppercase letter")
			.regex(/\d/, "New password must contain at least one number")
			.regex(/[\W_]/, "New password must contain at least one symbol"),
		'password_confirmation': z
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
	.refine((data) => data["password"] === data["password_confirmation"], {
		message: "Passwords don't match",
		path: ["password_confirmation"],
	});

const ResetPassword = () => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);
	const [passwordVisibility, setPasswordVisibility] = useState({
		new: false,
		confirmation: false,
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			"reset_password_token": globalProps.adminPortal.currentQuery?.['resetPasswordToken'],
			"password": '',
			"password_confirmation": ''
		},
		mode: "onBlur"
	});
	function onSubmit(values: z.infer<typeof formSchema>) {
		console.log("Submitting form to set a new password...");
		router.put(
			globalProps.adminPortal.router.auth.password.index,
			deepTransformKeysToSnakeCase({
				user: { ...values },
			}),
			{
				onStart: () => {
					setIsLoading(true);
				},
				onFinish: () => {
					setIsLoading(false);
				},
			}
		);
		console.log("Account password successfully changed...");
	}

	return (
		<>
			<Head title="Set a New Password" />

			<article className="flex items-center justify-center w-full h-screen p-4">
				<Card className="w-full mx-auto md:w-6/12 lg:w-3/12 bg-muted/50">
					<CardHeader>
						<Link
							href={globalProps.adminPortal.router.root}
							className="flex items-center text-sm hover:underline text-muted-foreground"
						>
							<ChevronLeft className="mr-1 size-4" />
							to Login
						</Link>
						<CardTitle className="text-xl">Set a new password</CardTitle>

						<CardDescription>
							Your new password must be different from previous used passwords.
						</CardDescription>
					</CardHeader>

					<CardContent>
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="grid space-y-4"
							>
								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>New Password</FormLabel>
											<FormControl>
												<Input
													{...field}
													type={passwordVisibility.new ? "text" : "password"}
													placeholder="Enter the new password..."
													autoComplete="new-password"
													EndIcon={{
														icon: passwordVisibility.new ? Eye : EyeClosed,
														isButton: true,
														handleOnClick: () => {
															setPasswordVisibility({
																...passwordVisibility,
																new: !passwordVisibility.new,
															});
														},
													}}
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="password_confirmation"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password Confirmation</FormLabel>
											<FormControl>
												<Input
													{...field}
													type={
														passwordVisibility.confirmation
															? "text"
															: "password"
													}
													placeholder="Enter the password confirmation..."
													autoComplete="new-password"
													EndIcon={{
														icon: passwordVisibility.confirmation
															? Eye
															: EyeClosed,
														isButton: true,
														handleOnClick: () => {
															setPasswordVisibility({
																...passwordVisibility,
																confirmation: !passwordVisibility.confirmation,
															});
														},
													}}
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="flex !mt-6">
									<Button type="submit" disabled={isLoading} className="w-full">
										{isLoading && <Loader2 />}
										{isLoading ? "Please Wait..." : "Reset Password"}
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</Card>
			</article>
		</>
	);
};

export default ResetPassword;
