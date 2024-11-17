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
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
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
import { useMediaQuery } from "@uidotdev/usehooks";
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
import { type ComponentProps, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

/* change password feature */
interface ChangePasswordContentProps extends ComponentProps<"div"> {
	selectedAdmin: SelectedAdmin | null;
	linkGenerated: string;
	handlerGenerated: (values: SelectedAdmin) => Promise<void>;
	handleOpenChange: (value: boolean) => void;
	forceMode: ResponsiveDialogMode;
}

const ChangePasswordContent = ({
	className,
	selectedAdmin,
	linkGenerated,
	handlerGenerated,
	handleOpenChange,
	forceMode,
}: ChangePasswordContentProps) => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isLoading, setIsLoading] = useState({
		generate: false,
		form: false,
	});
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
				only: [],
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading({ ...isLoading, form: true });
				},
				onFinish: () => {
					setIsLoading({ ...isLoading, form: false });
					handleOpenChange(false);
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

			<div
				className={cn("flex flex-col items-center w-full space-y-6", className)}
			>
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
											onClick={() => {
												copyToClipboard(linkGenerated);
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

					<div
						className={cn(
							"w-full flex justify-end !mt-6 space-x-2",
							forceMode === "drawer" ? "w-full" : "",
						)}
					>
						{forceMode === "dialog" && isDesktop && (
							<DialogClose asChild>
								<Button variant="ghost">Cancel</Button>
							</DialogClose>
						)}

						<Button
							type="submit"
							disabled={isLoading.form}
							className={cn(
								"w-full lg:w-auto",
								forceMode === "drawer" ? "w-full lg:w-full" : "",
							)}
						>
							{isLoading.form ? (
								<>
									<Loader2 className="animate-spin" />
									<span>Updating...</span>
								</>
							) : (
								<span>Update</span>
							)}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export interface ChangePasswordDialogProps {
	selectedAdmin: SelectedAdmin | null;
	isOpen: boolean;
	forceMode?: ResponsiveDialogMode;
}

export const ChangePasswordDialog = ({
	selectedAdmin,
	isOpen,
	forceMode = "dialog",
}: ChangePasswordDialogProps) => {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();
	const { toast } = useToast();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const pageContent = useMemo(() => {
		return {
			title: "Change Password",
			description:
				"Make password changes using the generate the form link or via form.",
		};
	}, []);
	const handleOpenChange = (value: boolean) => {
		if (!value) {
			const { fullUrl } = populateQueryParams(pageURL, {
				change_password: null,
			});
			router.get(
				fullUrl,
				{},
				{ only: ["selectedAdmin"], preserveScroll: true },
			);

			// reseting the link generated state
			if (linkGenerated) {
				setLinkGenerated("");
			}
		}
	};

	const [linkGenerated, setLinkGenerated] = useState("");
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

	if (isDesktop && forceMode === "dialog") {
		return (
			<Dialog modal open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent
					onInteractOutside={(event) => {
						event.preventDefault();
					}}
					className="sm:max-w-[380px]"
				>
					<DialogHeader>
						<DialogTitle>{pageContent.title}</DialogTitle>
						<DialogDescription>{pageContent.description}</DialogDescription>
					</DialogHeader>
					<ChangePasswordContent
						{...{
							selectedAdmin,
							linkGenerated,
							handlerGenerated,
							handleOpenChange,
							forceMode,
						}}
					/>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer modal open={isOpen} onOpenChange={handleOpenChange}>
			<DrawerContent
				onInteractOutside={(event) => {
					event.preventDefault();
				}}
			>
				<div className="w-full max-w-sm mx-auto">
					<DrawerHeader className="text-left">
						<DrawerTitle>{pageContent.title}</DrawerTitle>
						<DrawerDescription>{pageContent.description}</DrawerDescription>
					</DrawerHeader>
					<ChangePasswordContent
						{...{
							selectedAdmin,
							linkGenerated,
							handlerGenerated,
							handleOpenChange,
							forceMode,
						}}
					/>
					<DrawerFooter className="px-0 pt-4">
						<DrawerClose asChild className="p-0">
							<Button variant="outline">Cancel</Button>
						</DrawerClose>
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
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
interface EditAdminDialogContentProps extends ComponentProps<"div"> {
	adminTypeList: AdminTypes;
	selectedAdmin: SelectedAdmin | null;
	handleOpenChange: (value: boolean) => void;
	forceMode: ResponsiveDialogMode;
}

const EditAdminDialogContent = ({
	selectedAdmin,
	adminTypeList,
	forceMode,
	handleOpenChange,
	className,
}: EditAdminDialogContentProps) => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isLoading, setIsLoading] = useState(false);
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
					adminType: values.adminType,
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
					handleOpenChange(false);
				},
			},
		);
		console.log("Admin successfully updated...");
	}

	return (
		<div className={cn("grid gap-4", className)}>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
					<Alert variant="warning">
						<Info className="w-4 h-4" />
						<AlertTitle>Heads up!</AlertTitle>
						<AlertDescription>
							Contact the super-admin if you need to change the write-protected
							information.
						</AlertDescription>
					</Alert>

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
													disabled
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

									<FormDescription>
										The admin type is write-protected and can't be modified.
									</FormDescription>

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

					<div
						className={cn(
							"w-full flex justify-end !mt-6 space-x-2",
							forceMode === "drawer" ? "w-full" : "",
						)}
					>
						{forceMode === "dialog" && isDesktop && (
							<DialogClose asChild>
								<Button variant="ghost">Cancel</Button>
							</DialogClose>
						)}

						<Button
							type="submit"
							disabled={isLoading}
							className={cn(
								"w-full lg:w-auto",
								forceMode === "drawer" ? "w-full lg:w-full" : "",
							)}
						>
							{isLoading ? (
								<>
									<Loader2 className="animate-spin" />
									<span>Please wait...</span>
								</>
							) : (
								<span>Save changes</span>
							)}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export interface EditAdminDialogProps {
	adminTypeList: AdminTypes;
	selectedAdmin: SelectedAdmin | null;
	isOpen: boolean;
	forceMode?: ResponsiveDialogMode;
}

export const EditAdminDialog = ({
	selectedAdmin,
	adminTypeList,
	isOpen,
	forceMode = "dialog",
}: EditAdminDialogProps) => {
	const { url: pageURL } = usePage<GlobalPageProps>();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const pageContent = useMemo(() => {
		return {
			title: "Edit Admin Profile",
			description:
				"Make changes to selected admin profile here. Click save when you're done.",
		};
	}, []);
	const handleOpenChange = (value: boolean) => {
		if (!value) {
			const { fullUrl } = populateQueryParams(pageURL, { edit: null });
			router.get(
				fullUrl,
				{},
				{ only: ["selectedAdmin"], preserveScroll: true },
			);
		}
	};

	if (isDesktop && forceMode === "dialog") {
		return (
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent
					onInteractOutside={(event) => {
						event.preventDefault();
					}}
					className="sm:max-w-[425px]"
				>
					<DialogHeader>
						<DialogTitle>{pageContent.title}</DialogTitle>
						<DialogDescription>{pageContent.description}</DialogDescription>
					</DialogHeader>
					<EditAdminDialogContent
						{...{
							selectedAdmin,
							adminTypeList,
							forceMode,
							handleOpenChange,
						}}
					/>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer modal open={isOpen} onOpenChange={handleOpenChange}>
			<DrawerContent
				onInteractOutside={(event) => {
					event.preventDefault();
				}}
			>
				<div className="w-full max-w-sm mx-auto">
					<DrawerHeader className="text-left">
						<DrawerTitle>{pageContent.title}</DrawerTitle>
						<DrawerDescription>{pageContent.description}</DrawerDescription>
					</DrawerHeader>
					<EditAdminDialogContent
						{...{
							selectedAdmin,
							adminTypeList,
							forceMode,
							handleOpenChange,
						}}
					/>
					<DrawerFooter className="px-0 pt-4">
						<DrawerClose asChild className="p-0">
							<Button variant="outline">Cancel</Button>
						</DrawerClose>
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	);
};
