import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { useToast } from "@/hooks/use-toast";
import {
	cn,
	copyToClipboard,
	humanize,
	populateQueryParams,
} from "@/lib/utils";
import type {
	SelectedAdmin,
	TableRowDataProps,
} from "@/pages/AdminPortal/Admin/Index";
import type { AdminTypes } from "@/types/admin-portal/admin";
import type { GlobalPageProps, ResponsiveDialogMode } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import {
	Check,
	ChevronsUpDown,
	Clipboard,
	Eye,
	EyeClosed,
	Info,
	Loader2,
	PartyPopper,
} from "lucide-react";
import type React from "react";
import { type ComponentProps, type Dispatch, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

/* change password feature */
export interface ChangePasswordContentProps extends ComponentProps<"div"> {
	selectedAdmin: SelectedAdmin | null;
	linkGenerated: string;
	setLinkGenerated: Dispatch<React.SetStateAction<string>>;
	handleOpenChange?: (value: boolean) => void;
	forceMode?: ResponsiveDialogMode;
}

export const ChangePasswordContent = ({
	className,
	selectedAdmin,
	linkGenerated,
	setLinkGenerated,
	forceMode,
}: ChangePasswordContentProps) => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const { toast } = useToast();

	const [isLoading, setIsLoading] = useState({
		generate: false,
		form: false,
	});
	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return { isLoading: isLoading.form, forceMode };
	}, [isLoading, forceMode]);
	const handlerGenerated = async (values: SelectedAdmin) => {
		console.log(
			`Generating the change password link for ${values.user.email}...`,
		);
		const { fullUrl } = populateQueryParams(
			globalProps.adminPortal.router.adminPortal.adminManagement
				.generateResetPasswordUrl,
			{ email: values.user.email },
		);
		const response = await fetch(fullUrl, { method: "get" });
		const data = await response.json();

		if (!data?.link && data?.error) {
			console.log(data.error);
			toast({ description: data.error, variant: "destructive" });
			return;
		}

		const successMessage = `Successfully generated the change password link for ${values.user.email}.`;
		setLinkGenerated(data.link);
		toast({ description: successMessage });
		console.log(successMessage);
	};
	const [passwordVisibility, setPasswordVisibility] = useState({
		new: false,
		confirmation: false,
	});
	const formSchema = z
		.object({
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
		})
		.refine((data) => data.password === data.passwordConfirmation, {
			message: "Passwords don't match",
			path: ["passwordConfirmation"],
		});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
			passwordConfirmation: "",
		},
		mode: "onBlur",
	});
	function onSubmit(values: z.infer<typeof formSchema>) {
		const email = selectedAdmin?.user.email;
		console.log(`Submitting form to change password for ${email} ...`);
		router.put(
			globalProps.adminPortal.router.adminPortal.adminManagement.changePassword,
			deepTransformKeysToSnakeCase({
				user: { ...values, email },
			}),
			{
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading({ ...isLoading, form: true });
				},
				onFinish: () => {
					setIsLoading({ ...isLoading, form: false });
				},
			},
		);
		console.log("Password successfully changed...");
	}

	return (
		<div className={cn("grid gap-4", className)}>
			<div className="grid w-full max-w-sm items-center gap-1.5">
				<Label htmlFor="email">Email</Label>
				<Input
					type="email"
					id="email"
					placeholder="Email"
					readOnly
					value={selectedAdmin?.user.email}
				/>
			</div>

			<div className="flex flex-col items-center w-full space-y-6">
				{linkGenerated ? (
					<div className="w-full space-y-2">
						<div className="space-y-0.5">
							<div className="flex space-x-2">
								<PartyPopper className="mb-2 size-6" />
								<PartyPopper className="mb-2 size-6" />
								<PartyPopper className="mb-2 size-6" />
							</div>

							<p className="text-muted-foreground">
								Successfully created link, share the following link to change
								account password.
							</p>
						</div>

						<div className="relative w-full">
							<Input
								placeholder="Enter the new password..."
								readOnly
								value={linkGenerated}
								className="pr-8"
							/>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7"
											onClick={async () => {
												if (await copyToClipboard(linkGenerated)) {
													toast({ description: 'Text copied to clipboard successfully' })
												}
											}}
										>
											<Clipboard className="size-4" />
											<span className="sr-only">
												Toggle Password Visibility
											</span>
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<span>Copy to clipboard</span>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				) : (
					<Button
						className="w-full"
						disabled={isLoading.generate}
						onClick={async () => {
							setIsLoading({ ...isLoading, generate: true });
							setTimeout(async () => {
								if (selectedAdmin) {
									await handlerGenerated(selectedAdmin);
								}
								setIsLoading({ ...isLoading, generate: false });
							}, 250);
						}}
					>
						{isLoading.generate ? (
							<>
								<Loader2 className="animate-spin" />
								Please wait
							</>
						) : (
							<span>Generate Link</span>
						)}
					</Button>
				)}
			</div>

			<div className="flex justify-center align-center !my-2">
				<hr className="w-6/12 mt-2 bg-muted-foreground" />
				<span className="mx-4 text-xs text-center text-nowrap text-muted-foreground">
					or using form
				</span>
				<hr className="w-6/12 mt-2 bg-muted-foreground" />
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
											type={passwordVisibility.new ? "text" : "password"}
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

					<ResponsiveDialogButton {...buttonProps} />
				</form>
			</Form>
		</div>
	);
};

/* delete admin feature */
export interface DeleteAdminAlertProps {
	children: React.ReactNode;
	row: TableRowDataProps;
}

export const DeleteAdminAlert = ({ children, row }: DeleteAdminAlertProps) => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const handler = (row: TableRowDataProps) => {
		console.log(`Deleting the Admin ${row.original.user.email}...`);
		router.delete(
			`${globalProps.adminPortal.router.adminPortal.adminManagement.index}/${row.original.id}`,
			{
				data: row.original,
			},
		);
		console.log(
			`Successfully to deleted the Admin ${row.original.user.email}...`,
		);
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action is irreversible. Deleting your account will permanently
						remove all associated data from our servers and cannot be recovered.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Keep Account</AlertDialogCancel>
					<Button variant="destructive" onClick={() => handler(row)}>
						Delete
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

/* feature edit admin */
export interface EditAdminDialogContentProps extends ComponentProps<"div"> {
	adminTypeList: AdminTypes;
	selectedAdmin: SelectedAdmin | null;
	handleOpenChange?: (value: boolean) => void;
	forceMode?: ResponsiveDialogMode;
}

export const EditAdminDialogContent = ({
	selectedAdmin,
	adminTypeList,
	forceMode,
	className,
}: EditAdminDialogContentProps) => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);
	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return { isLoading, forceMode };
	}, [isLoading, forceMode]);
	const formSchema = z.object({
		name: z.string().min(3),
		email: z.string().email(),
		adminType: z.enum([...adminTypeList]),
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: selectedAdmin?.name,
			email: selectedAdmin?.user.email,
			adminType: selectedAdmin?.adminType,
		},
		mode: "onBlur",
	});
	function onSubmit(values: z.infer<typeof formSchema>) {
		console.log("Submitting form to edit the admin...");
		const routeURL = `${globalProps.adminPortal.router.adminPortal.adminManagement.index}/${selectedAdmin?.id}`;
		router.put(
			routeURL,
			deepTransformKeysToSnakeCase({
				admin: {
					id: selectedAdmin?.id,
					adminType: !globalProps.auth.currentUser?.["isSuperAdmin?"]
						? selectedAdmin?.adminType
						: values.adminType,
					name: values.name,
				},
			}),
			{
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading(true);
				},
				onFinish: () => {
					setIsLoading(false);
				},
			},
		);
		console.log("Admin successfully updated...");
	}

	return (
		<div className={cn("grid gap-4", className)}>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
					{!globalProps.auth.currentUser?.["isSuperAdmin?"] && (
						<Alert variant="warning">
							<Info className="w-4 h-4" />
							<AlertTitle>Heads up!</AlertTitle>
							<AlertDescription>
								Contact the super-admin if you need to change the
								write-protected information.
							</AlertDescription>
						</Alert>
					)}

					<div className="grid space-y-4">
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
											disabled
										/>
									</FormControl>

									<FormDescription>
										The email is write-protected and can't be modified.
									</FormDescription>

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
													disabled={
														!globalProps.auth.currentUser?.["isSuperAdmin?"]
													}
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

									{!globalProps.auth.currentUser?.["isSuperAdmin?"] && (
										<FormDescription>
											The admin type is write-protected and can't be modified.
										</FormDescription>
									)}

									<FormMessage />
								</FormItem>
							)}
						/>

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
					</div>

					<ResponsiveDialogButton {...buttonProps} />
				</form>
			</Form>
		</div>
	);
};

/* suspend admin feature */
export interface SuspendAdminContentProps extends ComponentProps<"div"> {
	selectedAdmin: SelectedAdmin | null;
	handleOpenChange?: (value: boolean) => void;
	forceMode?: ResponsiveDialogMode;
}

export const SuspendAdminContent = ({
	className,
	selectedAdmin,
}: SuspendAdminContentProps) => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState({
		immediately: false,
		date: false,
	});
	const handleSuspendNow = () => {
		console.log(
			`Starting process to suspend the admin account for ${selectedAdmin?.user.email} now...`,
		);
		router.put(
			globalProps.adminPortal.router.adminPortal.adminManagement.suspend,
			deepTransformKeysToSnakeCase({
				user: {
					id: selectedAdmin?.user.id,
					email: selectedAdmin?.user.email,
					suspendAt: new Date().toISOString(),
					suspendEnd: null,
				},
			}),
			{
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading({ ...isLoading, immediately: true });
				},
				onFinish: () => {
					setIsLoading({ ...isLoading, immediately: false });
					console.log("The proccess to suspend admin account finished...");
				},
			},
		);
	};
	const handleActivateNow = () => {
		console.log(
			`Starting process to activate the admin account for ${selectedAdmin?.user.email} now...`,
		);
		router.put(
			globalProps.adminPortal.router.adminPortal.adminManagement.activate,
			deepTransformKeysToSnakeCase({
				user: {
					id: selectedAdmin?.user.id,
					email: selectedAdmin?.user.email,
					suspendAt: null,
					suspendEnd: null,
				},
			}),
			{
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading({ ...isLoading, immediately: true });
				},
				onFinish: () => {
					setIsLoading({ ...isLoading, immediately: false });
					console.log("The proccess to activate admin account finished...");
				},
			},
		);
	};

	return (
		<div className={cn("grid gap-4", className)}>
			<div className="grid w-full max-w-sm items-center gap-1.5">
				<Label htmlFor="email">Email</Label>
				<Input
					type="email"
					id="email"
					placeholder="Email"
					readOnly
					value={selectedAdmin?.user.email}
				/>
				<span className="text-[0.8rem] text-muted-foreground">
					This account is currently{" "}
					{selectedAdmin?.user["suspended?"] ? <b>suspended</b> : <b>active</b>}
				</span>
			</div>

			<div className="flex flex-col items-center w-full space-y-6">
				<Button
					variant={
						selectedAdmin?.user["suspended?"] ? "default" : "destructive"
					}
					className="w-full"
					disabled={isLoading.immediately}
					onClick={
						selectedAdmin?.user["suspended?"]
							? handleActivateNow
							: handleSuspendNow
					}
				>
					{isLoading.immediately ? (
						<>
							<Loader2 className="animate-spin" />
							Please wait
						</>
					) : selectedAdmin?.user["suspended?"] ? (
						<span>Activate</span>
					) : (
						<span>Suspend Now</span>
					)}
				</Button>
			</div>
		</div>
	);
};
