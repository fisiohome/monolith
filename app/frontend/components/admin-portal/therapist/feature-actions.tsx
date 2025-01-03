import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
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
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn, copyToClipboard, populateQueryParams } from "@/lib/utils";
import { PASSWORD_WITH_CONFIRMATION_SCHEMA } from "@/lib/validation";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps, ResponsiveDialogMode } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { Clipboard, Eye, EyeClosed, Loader2, PartyPopper } from "lucide-react";
import { type ComponentProps, type Dispatch, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

/* change password feature */
export interface ChangePasswordContentProps extends ComponentProps<"div"> {
	selectedTherapistAccount: Therapist["user"];
	linkGenerated: string;
	setLinkGenerated: Dispatch<React.SetStateAction<string>>;
	handleOpenChange?: (value: boolean) => void;
	forceMode?: ResponsiveDialogMode;
}

export const ChangePasswordContent = ({
	className,
	selectedTherapistAccount,
	linkGenerated,
	setLinkGenerated,
	forceMode,
}: ChangePasswordContentProps) => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState({
		generate: false,
		form: false,
	});

	// for generated link reset password
	const generateResetPasswordLink = async (email: string) => {
		const { fullUrl } = populateQueryParams(
			globalProps.adminPortal.router.adminPortal.therapistManagement
				.generateResetPasswordUrl,
			{ email },
		);

		try {
			setIsLoading({ ...isLoading, generate: true });
			const res = await fetch(fullUrl, { method: "get" });
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data?.error);
			}

			return data?.link || null;
		} catch (error) {
			console.error(error);
			throw error;
		} finally {
			setTimeout(() => {
				setIsLoading({ ...isLoading, generate: false });
			}, 250);
		}
	};
	const handlerGenerated = async (
		values: ChangePasswordContentProps["selectedTherapistAccount"],
	) => {
		console.log(`Generating the change password link for ${values.email}...`);

		toast.promise(generateResetPasswordLink(values.email), {
			loading: "Loading...",
			success: (data) => {
				const successMessage = `Successfully generated the change password link for ${values.email}.`;

				setLinkGenerated(data);
				console.log(successMessage);

				return successMessage;
			},
			error: (error) => error?.message,
		});
	};

	// for form change password
	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return { isLoading: isLoading.form, forceMode };
	}, [isLoading, forceMode]);
	const [passwordVisibility, setPasswordVisibility] = useState({
		new: false,
		confirmation: false,
	});
	const form = useForm<z.infer<typeof PASSWORD_WITH_CONFIRMATION_SCHEMA>>({
		resolver: zodResolver(PASSWORD_WITH_CONFIRMATION_SCHEMA),
		defaultValues: {
			password: "",
			passwordConfirmation: "",
		},
		mode: "onBlur",
	});
	function onSubmit(values: z.infer<typeof PASSWORD_WITH_CONFIRMATION_SCHEMA>) {
		const email = selectedTherapistAccount.email;
		console.log(`Submitting form to change password for ${email} ...`);
		router.put(
			globalProps.adminPortal.router.adminPortal.therapistManagement
				.changePassword,
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
					setTimeout(() => {
						setIsLoading({ ...isLoading, form: false });
					}, 250);
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
					value={selectedTherapistAccount.email}
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
													toast.success(
														"Text copied to clipboard successfully",
													);
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
							await handlerGenerated(selectedTherapistAccount);
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
				<hr className="w-6/12 mt-2 bg-muted" />
				<span className="mx-4 text-xs text-center text-nowrap text-muted-foreground/50">
					or using form
				</span>
				<hr className="w-6/12 mt-2 bg-muted" />
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
