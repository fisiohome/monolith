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
import { zodResolver } from "@hookform/resolvers/zod";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
	Check,
	ChevronLeft,
	ChevronsUpDown,
	Eye,
	EyeClosed,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export interface NewAdminPageProps {
	adminTypeList: AdminTypes;
}

export default function New({ adminTypeList }: NewAdminPageProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	const [passwordVisibility, setPasswordVisibility] = useState(false);
	const [passwordConfirmationVisibility, setPasswordConfirmationVisibility] =
		useState(false);
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
			<article className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6 space-y-4">
				<div className="space-y-6 lg:w-6/12">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Link href={globalProps.adminPortal.router.authenticatedRootPath}>
								<ChevronLeft />
							</Link>
							<Separator
								orientation="vertical"
								className="h-5 bg-muted-foreground/50"
							/>
						</div>

						<h1 className="text-xl font-bold tracking-tight">
							<span>Create Admin</span>
						</h1>
					</div>

					<Separator className="bg-muted-foreground/50" />

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="grid space-y-4 lg:w-8/12"
						>
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
									<FormItem className="flex flex-col">
										<FormLabel className="mt-1 mb-1">Type</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															"justify-between px-3 py-1 w-[200px]",
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
													<CommandInput
														placeholder="Search admin type..."
														className="my-1 -mr-2 border-0 h-9"
													/>
													<CommandList>
														<CommandEmpty>No admin type found.</CommandEmpty>
														<CommandGroup>
															{adminTypeList.map((type) => (
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

							<div className="flex !mt-6">
								<Button type="submit">Create</Button>
							</div>
						</form>
					</Form>
				</div>
			</article>
		</>
	);
}
