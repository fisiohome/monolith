import { zodResolver } from "@hookform/resolvers/zod";
import { Head, router, usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, Eye, EyeClosed } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn, humanize } from "@/lib/utils";
import type { AdminTypes } from "@/types/admin-portal/admin";
import type { GlobalPageProps } from "@/types/globals";

export interface NewAdminPageProps {
	adminTypeList: AdminTypes;
}

export default function New({ adminTypeList }: NewAdminPageProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	const [passwordVisibility, setPasswordVisibility] = useState(false);
	const [passwordConfirmationVisibility, setPasswordConfirmationVisibility] =
		useState(false);
	const adminTypeOptions = useMemo(() => {
		return adminTypeList.filter((a) => {
			// filtering options data based on the current user role
			if (
				globalProps.auth.currentUser?.["isAdminSupervisor?"] &&
				(a === "SUPER_ADMIN" || a === "ADMIN_SUPERVISOR")
			) {
				return;
			}

			return a;
		});
	}, [adminTypeList, globalProps.auth.currentUser]);
	const formSchema = z
		.object({
			name: z.string().min(3),
			email: z.string().email(),
			adminType: z.enum([...adminTypeList]),
			password: z
				.string()
				.min(8, "Password must be at least 8 characters long")
				.max(64, "Password must be no more than 64 characters")
				.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
				.regex(/\d/, "Password must contain at least one number")
				.regex(/[\W_]/, "Password must contain at least one symbol"),
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
		})
		.refine((data) => data.password === data.passwordConfirmation, {
			message: "Passwords don't match",
			path: ["passwordConfirmation"],
		});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			passwordConfirmation: "",
		},
	});
	function onSubmit(values: z.infer<typeof formSchema>) {
		console.log("Submitting form to create the admin...");
		router.post(
			globalProps.adminPortal.router.adminPortal.adminManagement.index,
			deepTransformKeysToSnakeCase({
				admin: { adminType: values.adminType, name: values.name, userId: "" },
				user: {
					email: values.email,
					password: values.password,
					passwordConfirmation: values.passwordConfirmation,
				},
			}),
			{ preserveState: true },
		);
		console.log("Admin successfully created...");
	}

	return (
		<>
			<Head title="Create Admin" />
			<article className="min-h-[100vh] flex-1 rounded-xl bg-sidebar md:min-h-min p-6 space-y-4">
				<section className="flex flex-col justify-center gap-4 mx-auto w-12/12 lg:w-6/12 xl:w-4/12">
					<div className="flex flex-col space-y-0.5">
						<h1 className="font-bold leading-none tracking-tight">New Admin</h1>
						<span className="text-sm text-muted-foreground">
							Add a new admin account.
						</span>
					</div>

					<Separator />

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="text"
												placeholder="Enter the name..."
											/>
										</FormControl>

										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="adminType"
								render={({ field }) => (
									<FormItem className="grid !my-1">
										<FormLabel className="h-6">Type</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															"w-[200px] justify-between text-muted-foreground font-normal !mt-0 px-3",
															!field.value && "text-muted-foreground",
														)}
													>
														{field.value
															? humanize(
																	adminTypeList.find(
																		(type) => type === field.value,
																	) || "",
																)?.toUpperCase()
															: "Select admin type"}
														<ChevronsUpDown className="opacity-50" />
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent align="start" className="w-[200px] p-0">
												<Command>
													<CommandInput placeholder="Search admin type..." />
													<CommandList>
														<CommandEmpty>No admin type found.</CommandEmpty>
														<CommandGroup>
															{adminTypeOptions.map((type) => (
																<CommandItem
																	value={type}
																	key={type}
																	onSelect={() => {
																		form.setValue("adminType", type);
																	}}
																>
																	{humanize(type).toUpperCase()}
																	<Check
																		className={cn(
																			"ml-auto",
																			type === field.value
																				? "opacity-100"
																				: "opacity-0",
																		)}
																	/>
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>

										<FormMessage />
									</FormItem>
								)}
							/>

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
										<FormLabel>Password</FormLabel>
										<FormControl>
											<div className="relative">
												<Input
													{...field}
													type={passwordVisibility ? "text" : "password"}
													placeholder="Enter the password..."
													autoComplete="current-password"
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7 text-muted-foreground"
													onClick={() => {
														setPasswordVisibility(!passwordVisibility);
													}}
												>
													{!passwordVisibility ? (
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
														passwordConfirmationVisibility ? "text" : "password"
													}
													placeholder="Enter the password confirmation..."
													autoComplete="current-password"
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7 text-muted-foreground"
													onClick={() => {
														setPasswordConfirmationVisibility(
															!passwordConfirmationVisibility,
														);
													}}
												>
													{!passwordConfirmationVisibility ? (
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

							<div className="!mt-10 lg:!mt-6 gap-4 lg:gap-2 w-full flex flex-col md:flex-row lg:col-span-full md:justify-between">
								<Button
									type="button"
									variant="outline"
									className="w-full lg:w-auto"
									onClick={() => {
										window.history.back();
									}}
								>
									Back
								</Button>

								<Button type="submit" className="w-full lg:w-auto">
									Create
								</Button>
							</div>
						</form>
					</Form>
				</section>
			</article>
		</>
	);
}
