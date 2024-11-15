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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn, copyToClipboard } from "@/lib/utils";
import type { TableRowDataProps } from "@/pages/AdminPortal/Admin/Index";
import type { GlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Clipboard, Eye, EyeClosed, Loader2, PartyPopper } from "lucide-react";
import type React from "react";
import { type ComponentProps, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

/* change password feature */
interface ChangePasswordContentProps extends ComponentProps<"div"> {
	row: TableRowDataProps;
	linkGenerated: string;
	handlerGenerated: (row: TableRowDataProps) => void;
}

const ChangePasswordContent = ({
	className,
	row,
	linkGenerated,
	handlerGenerated,
}: ChangePasswordContentProps) => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);
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
		const email = row.original.user.email;
		console.log(`Submitting form to change password for ${email} ...`);
		router.put(
			globalProps.adminPortal.router.adminPortal.adminManagement.changePassword,
			deepTransformKeysToSnakeCase({
				user: { ...values, email },
			}),
			{ only: ["admins"] },
		);
		console.log("Password successfully changed...");
	}

	return (
		<div className="grid gap-4">
			<div className="grid w-full max-w-sm items-center gap-1.5">
				<Label htmlFor="email">Email</Label>
				<Input
					type="email"
					id="email"
					placeholder="Email"
					readOnly
					value={row.original.user.email}
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
						disabled={isLoading}
						onClick={async () => {
							setIsLoading(true);
							setTimeout(async () => {
								await handlerGenerated(row);
								setIsLoading(false);
							}, 250);
						}}
					>
						{isLoading ? (
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

					<div className="flex justify-end !mt-6">
						<Button type="submit">Update</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export interface ChangePasswordPopoverProps {
	children: React.ReactNode;
	row: TableRowDataProps;
	linkGenerated: string;
	handlerGenerated: (row: TableRowDataProps) => void;
	dropdown?: boolean;
}

export const ChangePasswordPopover = ({
	row,
	children,
	linkGenerated,
	handlerGenerated,
	dropdown,
}: ChangePasswordPopoverProps) => {
	const [open, setOpen] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const pageContent = useMemo(() => {
		return {
			title: "Change Password",
			description:
				"Make password changes using the generate the form link or via form.",
		};
	}, []);

	if (isDesktop && !dropdown) {
		return (
			<Dialog open={open} onOpenChange={setOpen} modal>
				<DialogTrigger asChild>{children}</DialogTrigger>
				<DialogContent className="sm:max-w-[380px]">
					<DialogHeader>
						<DialogTitle>{pageContent.title}</DialogTitle>
						<DialogDescription>{pageContent.description}</DialogDescription>
					</DialogHeader>
					<ChangePasswordContent
						{...{ row, linkGenerated, handlerGenerated }}
					/>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={setOpen} modal>
			<DrawerTrigger asChild>{children}</DrawerTrigger>
			<DrawerContent>
				<div className="w-full max-w-sm mx-auto">
					<DrawerHeader className="text-left">
						<DrawerTitle>{pageContent.title}</DrawerTitle>
						<DrawerDescription>{pageContent.description}</DrawerDescription>
					</DrawerHeader>
					<ChangePasswordContent
						{...{ row, linkGenerated, handlerGenerated }}
						className="px-4"
					/>
					<DrawerFooter className="pt-2">
						<DrawerClose asChild>
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
	handler: (row: TableRowDataProps) => void;
}

export const DeleteAdminAlert = ({
	children,
	handler,
	row,
}: DeleteAdminAlertProps) => {
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
