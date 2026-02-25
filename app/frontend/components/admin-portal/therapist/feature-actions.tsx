import { zodResolver } from "@hookform/resolvers/zod";
import { Deferred, router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { format, formatDistanceToNow } from "date-fns";
import {
	Activity,
	AtSignIcon,
	BriefcaseMedical,
	CalendarDays,
	Clipboard,
	Dot,
	Eye,
	EyeClosed,
	Fingerprint,
	Group,
	Hospital,
	InfinityIcon,
	Loader2,
	LoaderIcon,
	Mail,
	MapPinIcon,
	Microscope,
	PartyPopper,
	Phone,
	Stethoscope,
	Users,
} from "lucide-react";
import {
	type ComponentProps,
	Fragment,
	Suspense,
	useMemo,
	useState,
} from "react";
import { useForm } from "react-hook-form";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import { toast } from "sonner";
import { z } from "zod";
import ApptCard from "@/components/shared/appt-card";
import { LoadingBasic } from "@/components/shared/loading";
import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { getGenderIcon } from "@/hooks/use-gender";
import i18n from "@/lib/i18n";
import { getEmpStatusBadgeVariant } from "@/lib/therapists";
import {
	cn,
	copyToClipboard,
	generateInitials,
	populateQueryParams,
} from "@/lib/utils";
import { PASSWORD_WITH_CONFIRMATION_SCHEMA } from "@/lib/validation";
import type { TherapistIndexGlobalPageProps } from "@/pages/AdminPortal/Therapist/Index";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps, ResponsiveDialogMode } from "@/types/globals";

/* change password feature */
export interface ChangePasswordContentProps extends ComponentProps<"div"> {
	selectedTherapistAccount: Therapist["user"];
	handleOpenChange?: (value: boolean) => void;
	forceMode?: ResponsiveDialogMode;
}

export const ChangePasswordContent = ({
	className,
	selectedTherapistAccount,
	forceMode,
}: ChangePasswordContentProps) => {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState({
		generate: false,
		form: false,
	});

	// for generated link reset password
	const [linkGenerated, setLinkGenerated] = useState("");
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

// for delete the therapist
export interface DeleteTherapistAlertProps extends ComponentProps<"dialog"> {
	title: string;
	description: string;
	isOpen: boolean;
	onOpenChange?: (open: boolean) => void;
	selectedTherapist: Therapist;
}

export function DeleteTherapistAlert({
	title,
	description,
	isOpen,
	onOpenChange,
	selectedTherapist,
}: DeleteTherapistAlertProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);
	const formSchema = z.object({ id: z.string() });
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: selectedTherapist.id,
		},
		mode: "onSubmit",
	});
	const onSubmit = (values: z.infer<typeof formSchema>) => {
		console.log("Deleting the therapist...");

		const routeURL = `${globalProps.adminPortal.router.adminPortal.therapistManagement.index}/${values.id}`;
		router.delete(routeURL, {
			preserveScroll: true,
			preserveState: true,
			onStart: () => {
				setIsLoading(true);
			},
			onFinish: () => {
				setTimeout(() => {
					setIsLoading(false);
				}, 250);
			},
		});

		console.log("Finished process to delete the therapist...");
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<Button type="submit" variant="destructive" disabled={isLoading}>
								{isLoading ? (
									<>
										<LoaderIcon className="animate-spin" />
										<span>Deleting...</span>
									</>
								) : (
									<span>Delete</span>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</Form>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// for details the therapist
interface DetailsTherapistContentProps extends ComponentProps<"div"> {
	therapist: NonNullable<TherapistIndexGlobalPageProps["selectedTherapist"]>;
	appts: TherapistIndexGlobalPageProps["selectedTherapistAppts"];
}
export function DetailsTherapistContent({
	className,
	therapist,
	appts,
}: DetailsTherapistContentProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const isDekstop = useMediaQuery("(min-width: 768px)");

	// account details
	const { isAuthCurrentUser, isAuthAdmin, isAuthSuperAdmin } = useAuth({
		user: therapist.user,
		auth: globalProps.auth,
	});
	const isOnline = therapist.user["isOnline?"];
	const currentIP = therapist.user.currentSignInIp;
	const lastIP = therapist.user.lastSignInIp;
	const lastOnlineAt = therapist.user.lastOnlineAt;
	const isSuspended = therapist.user["suspended?"];
	const suspendedAt = therapist.user.suspendAt;
	const suspendEnd = therapist.user.suspendEnd;
	const accounts = useMemo(() => {
		type itemID =
			| "lastOnlineAt"
			| "lastSignInAt"
			| "currentSignInIp"
			| "lastSignInIp"
			| "suspendedAt"
			| "suspendEnd";
		const items = [
			{
				id: "lastOnlineAt" as itemID,
				title: "Last Online Session",
				value: therapist?.user?.lastOnlineAt
					? formatDistanceToNow(therapist?.user?.lastOnlineAt, {
							includeSeconds: true,
							addSuffix: true,
						})
					: "-",
			},
			{
				id: "lastSignInAt" as itemID,
				title: "Last Sign-in",
				value: therapist?.user?.lastSignInAt
					? formatDistanceToNow(therapist?.user?.lastSignInAt, {
							includeSeconds: true,
							addSuffix: true,
						})
					: "-",
			},
		];

		if (isAuthAdmin) {
			items.push({
				id: "currentSignInIp" as itemID,
				title: "Current IP Address",
				value: therapist?.user?.currentSignInIp || "-",
			});
			items.push({
				id: "lastSignInIp" as itemID,
				title: "Last IP Address",
				value: therapist?.user?.lastSignInIp || "-",
			});
		}

		if (isSuspended) {
			items.push({
				id: "suspendedAt" as itemID,
				title: "Suspend on",
				value: suspendedAt ? format(suspendedAt, "PP") : "-",
			});
			items.push({
				id: "suspendEnd" as itemID,
				title: "Suspend until",
				value: suspendEnd ? format(suspendEnd, "PP") : "",
			});
		}

		return {
			title: "Account Activity",
			icon: Fingerprint,
			items,
		};
	}, [therapist?.user, isAuthAdmin, isSuspended, suspendedAt, suspendEnd]);

	// profile details
	const personalDetails = useMemo(
		() => [
			{ icon: Users, label: "Gender", value: therapist.gender },
			{
				icon: Phone,
				label: "Phone",
				value: therapist?.phoneNumber
					? formatPhoneNumberIntl(
							therapist.phoneNumber.includes("+")
								? therapist.phoneNumber
								: `+${therapist.phoneNumber}`,
						)
					: "-",
			},
			{ icon: Mail, label: "Email", value: therapist.user.email },
			{
				icon: AtSignIcon,
				label: "Telegram ID",
				value: therapist?.telegramId || "N/A",
			},
		],
		[therapist],
	);

	// employment details
	const employmentDetails = useMemo(
		() => [
			{ icon: Group, label: "Batch", value: therapist.batch },
			{
				icon: Activity,
				label: "Status",
				value: (
					<Badge
						className={cn(
							"text-xs",
							getEmpStatusBadgeVariant(therapist.employmentStatus),
						)}
					>
						{therapist.employmentStatus}
					</Badge>
				),
			},
			{
				icon: Hospital,
				label: "Therapist at",
				value: `${therapist.service.code} - ${therapist.service.name.replaceAll("_", " ")}`,
			},
			{
				icon: BriefcaseMedical,
				label: "Type",
				value: therapist.employmentType,
			},
			{
				icon: Microscope,
				label: "Specializations",
				value: therapist.specializations?.length ? (
					<div className="flex flex-wrap items-center justify-end gap-1 text-center">
						{therapist.specializations.map((specialization) => (
							<Badge key={specialization}>{specialization}</Badge>
						))}
					</div>
				) : (
					"-"
				),
			},
			{
				icon: Stethoscope,
				label: "Treatment Modalities",
				value: therapist.modalities?.length ? (
					<div className="flex flex-wrap items-center justify-end gap-1 text-center">
						{therapist.modalities.map((modality) => (
							<Badge key={modality} variant="secondary">
								{modality}
							</Badge>
						))}
					</div>
				) : (
					"-"
				),
			},
			{
				icon: CalendarDays,
				label: "Contract Period",
				value: (() => {
					const start = therapist.contractStartDate
						? format(therapist.contractStartDate, "PP")
						: null;
					const end = therapist.contractEndDate
						? format(therapist.contractEndDate, "PP")
						: null;
					if (start && end) return `${start} — ${end}`;
					if (start) return `start from ${start}`;
					if (end) return `until ${end}`;
					return "N/A";
				})(),
			},
		],
		[therapist],
	);

	return (
		<div className={cn("grid gap-4 max-h-[500px] overflow-auto", className)}>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
				<div className="flex flex-col gap-4 lg:col-span-6 xl:col-span-5">
					<Card className="h-full shadow-inner">
						<CardHeader>
							<div className="flex items-start w-full gap-2 text-left">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger>
											<Avatar className="border rounded-lg size-10">
												<AvatarImage src="#" alt={therapist.name} />
												<AvatarFallback
													className={cn(
														"text-sm rounded-lg",
														isSuspended
															? "bg-destructive text-destructive-foreground"
															: isAuthCurrentUser
																? "bg-primary text-primary-foreground"
																: isOnline
																	? "bg-emerald-700 text-white"
																	: "",
													)}
												>
													{generateInitials(therapist.name)}
												</AvatarFallback>
											</Avatar>
										</TooltipTrigger>
										<TooltipContent>
											{isSuspended ? (
												<div className="flex flex-col">
													{suspendedAt && (
														<span>
															Suspend on: <b>{format(suspendedAt, "PP")}</b>
														</span>
													)}
													<span className="flex items-center">
														Suspend until:{" "}
														<b>
															{suspendEnd ? (
																format(suspendEnd, "PP")
															) : (
																<InfinityIcon className="ml-1 size-4" />
															)}
														</b>
													</span>
												</div>
											) : isAuthSuperAdmin ? (
												<div className="flex flex-col">
													{isOnline ? (
														<span>
															Current IP: <b>{currentIP}</b>
														</span>
													) : (
														<>
															<span>
																Last IP: <b>{lastIP}</b>
															</span>
															{lastOnlineAt && (
																<span>
																	Last Online:{" "}
																	<b>
																		{formatDistanceToNow(lastOnlineAt, {
																			includeSeconds: true,
																			addSuffix: true,
																		})}
																	</b>
																</span>
															)}
														</>
													)}
												</div>
											) : (
												<span>{isOnline ? "Online" : "Offline"}</span>
											)}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								<div className="flex-1 leading-tight text-left">
									<CardTitle className="text-base uppercase">
										{therapist.name}
									</CardTitle>

									<CardDescription className="text-xs">
										#{therapist.registrationNumber}
									</CardDescription>
								</div>
							</div>
						</CardHeader>

						<CardContent className="grid gap-4">
							{personalDetails.map((p) => (
								<Fragment key={p.label}>
									<div
										key={p.label}
										className="flex items-start justify-between gap-4 font-light text-pretty"
									>
										<div className="flex items-center gap-2">
											{p.label === "Gender" ? (
												getGenderIcon(
													p.value as string,
													"size-4 text-muted-foreground/75 shrink-0",
												)
											) : (
												<p.icon className="size-4 text-muted-foreground/75 shrink-0" />
											)}
											<span>{p.label}: </span>
										</div>

										<div className="font-medium text-right break-words truncate whitespace-normal hyphens-manual">
											{p.value}
										</div>
									</div>
								</Fragment>
							))}
						</CardContent>
					</Card>
				</div>

				<div className="flex flex-col gap-4 lg:col-span-6 xl:col-span-7">
					<Card className="shadow-inner">
						<CardContent className="p-6">
							<Accordion
								type="single"
								collapsible
								className="w-full"
								defaultValue="employment-details"
							>
								<AccordionItem value="employment-details" className="border-0">
									<AccordionTrigger className="p-0 uppercase">
										Employment Details
									</AccordionTrigger>
									<AccordionContent className="flex flex-col gap-4 mt-4">
										{employmentDetails.map((p) => (
											<Fragment key={p.label}>
												<div
													key={p.label}
													className="flex items-start justify-between gap-4 font-light text-pretty"
												>
													<div className="flex items-center gap-2">
														<p.icon className="size-4 text-muted-foreground/75 shrink-0" />
														<span>{p.label}: </span>
													</div>

													<div className="font-medium text-right break-words truncate whitespace-normal hyphens-manual">
														{p.value}
													</div>
												</div>
											</Fragment>
										))}
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</CardContent>
					</Card>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="shadow-inner">
					<CardContent className="p-6">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="account-activity" className="border-0">
								<AccordionTrigger className="p-0 uppercase">
									Account Activity
								</AccordionTrigger>
								<AccordionContent className="grid items-center gap-4 pt-6">
									{accounts.items.map((item) => (
										<div
											key={item.id}
											className="flex flex-col font-light text-pretty"
										>
											<span>{item.title}: </span>
											<span className="font-medium break-words truncate whitespace-normal hyphens-manual">
												{item.id === "suspendEnd" && !item.value ? (
													<InfinityIcon className="size-4" />
												) : (
													item.value
												)}
											</span>
										</div>
									))}
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</CardContent>
				</Card>

				<Card className="shadow-inner">
					<CardContent className="p-6">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="addresses" className="border-0">
								<AccordionTrigger className="p-0 uppercase">
									Addresses
								</AccordionTrigger>
								<AccordionContent className="flex flex-col gap-4 mt-4">
									{!therapist.addresses.length ? (
										<p className="text-sm font-light text-center text-muted-foreground">
											There's no addresses yet, let's get started by adding the
											data first.
										</p>
									) : (
										<Accordion type="multiple" className="w-full">
											{therapist.addresses.map((addr, index, array) => (
												<AccordionItem
													key={addr.id}
													value={String(addr.id)}
													className={
														index !== array.length - 1 ? "" : "border-0"
													}
												>
													<AccordionTrigger>
														<div className="flex items-center">
															<p className="flex-1 font-medium">
																{addr.location.state} - {addr.location.city}
															</p>
															{addr.active && (
																<Dot
																	className="ml-3 mr-1 shrink-0 text-emerald-600"
																	width={10}
																	height={10}
																	strokeWidth={20}
																/>
															)}
														</div>
													</AccordionTrigger>
													<AccordionContent>
														<div className="grid gap-2">
															<div className="flex flex-col font-light text-pretty">
																<span>Country:</span>
																<span className="font-medium">
																	{addr.location.countryCode} -{" "}
																	{addr.location.country}
																</span>
															</div>

															<div className="flex flex-col font-light text-pretty">
																<span>State - City:</span>
																<span className="font-medium">
																	{addr.location.state} - {addr.location.city}
																</span>
															</div>

															<div className="flex flex-col font-light text-pretty">
																<span>Postal Code:</span>
																<span className="font-medium">
																	{addr.postalCode}
																</span>
															</div>

															<div className="flex flex-col font-light text-pretty">
																<span>Address:</span>
																<span className="font-medium">
																	{addr.address}
																</span>
															</div>

															{addr.latitude && addr.longitude ? (
																<div className="flex flex-col font-light text-pretty">
																	<Button
																		size={!isDekstop ? "default" : "sm"}
																		type="button"
																		variant="accent-outline"
																		onClick={(event) => {
																			event.preventDefault();

																			window.open(
																				`https://www.google.com/maps/search/?api=1&query=${addr?.latitude},${addr?.longitude}`,
																			);
																		}}
																	>
																		<MapPinIcon />
																		View on Google Maps
																	</Button>
																</div>
															) : null}
														</div>
													</AccordionContent>
												</AccordionItem>
											))}
										</Accordion>
									)}
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</CardContent>
				</Card>

				<Card className="shadow-inner">
					<CardContent className="p-6">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="bank-account" className="border-0">
								<AccordionTrigger className="p-0 uppercase">
									Bank Accounts
								</AccordionTrigger>
								<AccordionContent className="flex flex-col gap-4 mt-4">
									{!therapist.bankDetails.length ? (
										<p className="text-sm font-light text-center text-muted-foreground">
											There's no bank details yet, let's get started by adding
											the data first.
										</p>
									) : (
										therapist.bankDetails.map((bank, index, array) => (
											<Fragment key={bank.id}>
												<div className="grid gap-2">
													<p className="flex items-center gap-2 font-medium">
														<span>{bank.bankName.toUpperCase()}</span>
														{bank.active && (
															<Dot
																className="text-emerald-600"
																width={10}
																height={10}
																strokeWidth={20}
															/>
														)}
													</p>

													<div className="grid font-light">
														<span>{bank.accountHolderName}</span>
														<span>{bank.accountNumber}</span>
													</div>
												</div>

												{index < array.length - 1 && <Separator />}
											</Fragment>
										))
									)}
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</CardContent>
				</Card>
			</div>

			<Separator className="my-3 bg-border" />

			<div className="grid gap-4">
				<Card className="shadow-inner">
					<CardContent className="p-6">
						<Deferred
							data={["selectedTherapistAppts"]}
							fallback={<LoadingBasic columnBased />}
						>
							<Accordion type="single" collapsible className="w-full">
								<AccordionItem value="appointments" className="border-0">
									<AccordionTrigger className="p-0 uppercase">
										Appointments
									</AccordionTrigger>
									<AccordionContent className="flex flex-col gap-4 mt-4">
										{!appts?.length ? (
											<p className="text-sm font-light text-center text-muted-foreground">
												There's no assigned appointments for this therapist yet
											</p>
										) : (
											appts.map((appt, index, array) => (
												<Fragment key={appt.id}>
													<Suspense
														fallback={<LoadingBasic columnBased={true} />}
													>
														<ApptCard key={appt.id} appt={appt} />

														{index < array.length - 1 && <Separator />}
													</Suspense>
												</Fragment>
											))
										)}
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</Deferred>
					</CardContent>
				</Card>
			</div>

			{isDekstop && (
				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="ghost">
							{i18n.t("components.modal.close")}
						</Button>
					</DialogClose>
				</DialogFooter>
			)}
		</div>
	);
}
