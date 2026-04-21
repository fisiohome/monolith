import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import {
	AlertCircle,
	Check,
	ChevronDownIcon,
	ChevronsUpDown,
	Copy,
	LoaderIcon,
	Package as PackageIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Label } from "@/components/ui/label";
import {
	MultiSelector,
	MultiSelectorContent,
	MultiSelectorInput,
	MultiSelectorItem,
	MultiSelectorList,
	MultiSelectorTrigger,
} from "@/components/ui/multi-select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import i18n from "@/lib/i18n";
import { cn, populateQueryParams } from "@/lib/utils";
import type { AppointmentIndexGlobalPageProps } from "@/pages/AdminPortal/Appointment/Index";
import type { OrdersGlobalPageProps } from "@/pages/AdminPortal/Appointment/Orders";
import type {
	Appointment,
	AppointmentStatuses,
} from "@/types/admin-portal/appointment";
import type { ResponsiveDialogMode } from "@/types/globals";
export function CancelAppointmentForm({
	selectedAppointment,
	forceMode,
}: {
	selectedAppointment: Appointment;
	forceMode?: ResponsiveDialogMode;
}) {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);

	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return {
			isLoading,
			forceMode,
			submitText: i18n.t("appointments:modal.cancel.button_submit"),
		};
	}, [isLoading, forceMode]);

	const formSchema = z.object({
		id: z.string(),
		orderId: z.string(),
		reason: z
			.string()
			.min(10, "Cancellation reason must be at least 10 characters"),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: selectedAppointment.id,
			orderId: selectedAppointment.order?.id || "",
			reason: "",
		},
		mode: "all",
	});

	const onSubmit = (values: z.infer<typeof formSchema>) => {
		// Use different endpoints based on whether order exists
		const hasOrder = selectedAppointment.order?.id;
		const routeURL = hasOrder
			? `${globalProps.adminPortal.router.adminPortal.appointment.index}/${values.orderId}/cancel-external`
			: `${globalProps.adminPortal.router.adminPortal.appointment.index}/${values.id}/cancel`;

		// populate current query params
		const { queryParams } = populateQueryParams(pageURL);
		// generate the submit form url with the source query params
		const { fullUrl } = populateQueryParams(routeURL, queryParams);
		const formData = deepTransformKeysToSnakeCase({
			formData: {
				id: values.id,
				reason: values.reason,
			},
		});
		router.put(fullUrl, formData, {
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
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<FormField
					control={form.control}
					name="reason"
					render={({ field }) => (
						<FormItem>
							{/* <FormLabel>Cancellation Reason</FormLabel> */}
							<FormControl>
								<Textarea
									{...field}
									placeholder="Enter the cancellation reason (minimum 10 characters)..."
									className="shadow-inner bg-sidebar"
								/>
							</FormControl>

							<FormMessage />
						</FormItem>
					)}
				/>

				<ResponsiveDialogButton {...buttonProps} className="mb-1" />
			</form>
		</Form>
	);
}

export function UpdatePICForm({
	selectedAppointment,
	forceMode,
}: {
	selectedAppointment: Appointment;
	forceMode?: ResponsiveDialogMode;
}) {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const admins = useMemo(
		() => globalProps.optionsData?.admins || [],
		[globalProps.optionsData?.admins],
	);
	const [isLoading, setIsLoading] = useState(false);
	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return {
			isLoading,
			forceMode,
		};
	}, [isLoading, forceMode]);
	const formSchema = z.object({
		id: z.string(),
		admins: z.array(z.string()),
		adminIds: z.array(z.string()),
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: selectedAppointment.id,
			admins: selectedAppointment?.admins?.map((admin) => String(admin.name)),
			adminIds: selectedAppointment?.admins?.map((admin) => String(admin.id)),
		},
		mode: "onSubmit",
	});
	const [validationAlert, setValidationAlert] = useState("");
	const onSubmit = (values: z.infer<typeof formSchema>) => {
		if (!values.admins?.length) {
			setValidationAlert("At least input one admin for PIC(s)");
			return;
		}

		const routeURL = `${globalProps.adminPortal.router.adminPortal.appointment.index}/${values.id}/update-pic`;
		// populate current query params
		const { queryParams } = populateQueryParams(pageURL);
		// generate the submit form url with the source query params
		const { fullUrl } = populateQueryParams(routeURL, queryParams);
		const formData = deepTransformKeysToSnakeCase({
			formData: {
				id: values.id,
				adminIds: values.adminIds,
			},
		});
		router.put(fullUrl, formData, {
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
	};

	// * watching admins selected values
	const watchAdminsSelected = useWatch({
		control: form.control,
		name: "admins",
	});
	useEffect(() => {
		const adminIds = admins
			.filter((admin) => watchAdminsSelected.includes(admin.name))
			.map((admin) => String(admin.id));
		form.setValue("adminIds", adminIds);
	}, [watchAdminsSelected, form.setValue, admins]);

	return (
		<div className="p-0.5 min-h-fit">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
					{!!validationAlert && (
						<Alert variant="destructive">
							<AlertCircle className="w-4 h-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{validationAlert}</AlertDescription>
						</Alert>
					)}

					<FormField
						control={form.control}
						name="admins"
						render={({ field }) => (
							<FormItem className="mb-0 md:mb-16">
								{/* <FormLabel>Admin PIC(s)</FormLabel> */}

								<FormControl>
									<MultiSelector
										onValuesChange={field.onChange}
										values={field?.value || []}
										maxShows={5}
									>
										<MultiSelectorTrigger>
											<MultiSelectorInput
												placeholder={`${i18n.t(
													"appointments:fields.admin_pic.placeholder",
												)}...`}
											/>
										</MultiSelectorTrigger>
										<MultiSelectorContent>
											<MultiSelectorList className="max-h-32">
												{admins.map((admin) => (
													<MultiSelectorItem
														key={admin.id}
														value={String(admin.name)}
													>
														{admin.name}
													</MultiSelectorItem>
												))}
											</MultiSelectorList>
										</MultiSelectorContent>
									</MultiSelector>
								</FormControl>

								{/* <FormMessage /> */}
							</FormItem>
						)}
					/>

					<ResponsiveDialogButton {...buttonProps} />
				</form>
			</Form>
		</div>
	);
}

export function UpdateStatusForm({
	selectedAppointment,
	forceMode,
}: {
	selectedAppointment: Appointment;
	forceMode?: ResponsiveDialogMode;
}) {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");
	const [isLoading, setIsLoading] = useState(false);
	const buttonProps = useMemo<ResponsiveDialogButton>(
		() => ({
			isLoading,
			forceMode,
			submitText: t("modal.update_status.button_submit"),
		}),
		[isLoading, forceMode, t],
	);
	const appointmentStatuses = useMemo(() => {
		const { optionsData } = globalProps;

		if (!optionsData?.statuses) {
			console.log("No optionsData.statuses available");
			return [];
		}

		const excludedStatuses = new Set([
			"on_hold",
			"unscheduled",
			"cancelled",
			"pending_therapist_assignment",
			"pending_patient_approval",
		]);

		const filteredStatuses = optionsData.statuses.filter(
			(status) => !excludedStatuses.has(status.key),
		);

		return filteredStatuses;
	}, [globalProps.optionsData?.statuses, globalProps]);
	const formSchema = z.object({
		id: z.string(),
		status: z.enum(
			appointmentStatuses.map((status) => status.key) as [
				keyof typeof AppointmentStatuses,
				...(keyof typeof AppointmentStatuses)[],
			],
		),
		reason: z.string().optional(),
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: selectedAppointment.id,
			status: selectedAppointment?.status,
			reason: "",
		},
		mode: "onSubmit",
	});
	const onSubmit = (values: z.infer<typeof formSchema>) => {
		const routeURL = `${globalProps.adminPortal.router.adminPortal.appointment.index}/${values.id}/update-status`;
		// populate current query params
		const { queryParams } = populateQueryParams(pageURL);
		// generate the submit form url with the source query params
		const { fullUrl } = populateQueryParams(routeURL, queryParams);
		const formData = deepTransformKeysToSnakeCase({ formData: { ...values } });
		router.put(fullUrl, formData, {
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
	};

	return (
		<div className="p-0.5 min-h-fit">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem className="flex flex-col">
								{/* <FormLabel>{t("fields.appointment_status.label")}</FormLabel> */}
								<Popover modal>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant="outline"
												className={cn(
													"w-full justify-between font-normal shadow-inner bg-sidebar",
													!field.value && "text-muted-foreground",
												)}
												disabled={isLoading}
											>
												<p>
													{field.value
														? (appointmentStatuses.find(
																(s) => s.key === field.value,
															)?.value ??
															globalProps?.optionsData?.statuses?.find(
																(s) => s.key === field.value,
															)?.value ??
															"")
														: t("fields.appointment_status.placeholder")}
												</p>

												<ChevronsUpDown className="opacity-50" />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent
										align="start"
										side="bottom"
										className="w-[var(--radix-popover-trigger-width)] p-0 "
									>
										<Command>
											<CommandInput
												disabled={isLoading}
												placeholder={`${t("fields.appointment_status.search")}...`}
												className="h-9"
											/>
											<CommandList>
												<CommandEmpty>
													{t("fields.appointment_status.empty_search")}
												</CommandEmpty>
												<CommandGroup>
													{isLoading ? (
														<CommandItem value={undefined} disabled>
															<LoaderIcon className="animate-spin" />
															<span>{`${i18n.t("components.modal.wait")}...`}</span>
														</CommandItem>
													) : (
														appointmentStatuses.map((status) => (
															<CommandItem
																value={status.value}
																key={status.key}
																disabled={
																	selectedAppointment.status === status.key
																}
																onSelect={() => {
																	field.onChange(status.key);
																}}
															>
																{status.value}
																<Check
																	className={cn(
																		"ml-auto",
																		status.key === field.value
																			? "opacity-100"
																			: "opacity-0",
																	)}
																/>
															</CommandItem>
														))
													)}
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
						name="reason"
						render={({ field }) => (
							<FormItem>
								{/* <FormLabel>Reason</FormLabel> */}
								<FormControl>
									<Textarea
										{...field}
										placeholder="Enter the reason..."
										className="shadow-inner bg-sidebar"
									/>
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
}

// * form of the payment status update
interface UpdatePaymentFormProps {
	order: {
		id: string;
		registrationNumber: string;
		paymentStatus: string;
	};
	paymentStatusOptions: NonNullable<
		OrdersGlobalPageProps["optionsData"]
	>["paymentStatuses"];
	forceMode?: ResponsiveDialogMode;
	onSuccess?: () => void;
}

export function UpdatePaymentForm({
	order,
	onSuccess,
	forceMode,
	paymentStatusOptions,
}: UpdatePaymentFormProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const buttonProps = useMemo<ResponsiveDialogButton>(
		() => ({
			isLoading,
			forceMode,
			submitText: "Update",
		}),
		[isLoading, forceMode],
	);

	const formSchema = useMemo(
		() =>
			z.object({
				payment_status: z.enum(
					paymentStatusOptions.map((option) => option.value) as [
						string,
						...string[],
					],
					{
						required_error: "Payment status is required",
					},
				),
			}),
		[paymentStatusOptions],
	);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			payment_status: order.paymentStatus,
		},
	});

	const handleSubmit = async (values: z.infer<typeof formSchema>) => {
		setIsLoading(true);
		setError(null);

		try {
			await router.put(
				`/admin-portal/appointments/orders/${order.id}/payment-status`,
				{
					form_data: values,
				},
				{
					preserveState: true,
					preserveScroll: true,
					onSuccess: () => {
						onSuccess?.();
					},
					onError: (errors) => {
						const defaultMessage = "Failed to update payment status";
						const errorMessage = errors.message || defaultMessage;
						setError(errorMessage);
						console.error(defaultMessage, errorMessage);
					},
				},
			);
		} catch (err) {
			const defaultMessage =
				"An unexpected error occurred while updating payment status";
			const errorMessage = err instanceof Error ? err.message : defaultMessage;
			setError(errorMessage);
			console.error(defaultMessage, errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="p-0.5 space-y-6">
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Form {...form}>
				<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="payment_status"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Payment Status</FormLabel>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
								>
									<FormControl>
										<SelectTrigger className="shadow-inner bg-sidebar">
											<SelectValue placeholder="Select payment status" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{paymentStatusOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>

					<ResponsiveDialogButton {...buttonProps} />
				</form>
			</Form>
		</div>
	);
}

interface FeedbackReminderDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	registrationNumber: string;
	orderId: string;
	onSuccess?: () => void;
}

export function FeedbackReminderDialog({
	isOpen,
	onOpenChange,
	registrationNumber,
	orderId,
	onSuccess,
}: FeedbackReminderDialogProps) {
	const [isSending, setIsSending] = useState(false);

	const handleSendReminder = useCallback(async () => {
		setIsSending(true);

		await router.post(
			`/admin-portal/appointments/orders/${orderId}/send-feedback-reminder`,
			{},
			{
				preserveState: true,
				preserveScroll: true,
				onSuccess: () => {
					toast.success("Feedback reminder email sent successfully");
					onOpenChange(false);
					onSuccess?.();
				},
				onError: (errors) => {
					const defaultMessage = "Failed to send feedback reminder";
					const errorMessage = errors.message || defaultMessage;
					console.error(defaultMessage, errorMessage);
					toast.error(errorMessage);
				},
				onFinish: () => {
					setIsSending(false);
				},
			},
		);
	}, [orderId, onOpenChange, onSuccess]);

	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Send Feedback Reminder?</AlertDialogTitle>
					<AlertDialogDescription>
						This will send a reminder email to the customer to provide feedback
						about this order ({registrationNumber}).
						<br />
						<br />
						Are you sure you want to proceed?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							handleSendReminder();
						}}
						disabled={isSending}
					>
						{isSending ? "Sending..." : "Send Reminder"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// Types for ChangePackageForm
export interface Package {
	id: number;
	name: string;
	numberOfVisit: number;
	totalPrice: number;
	currency: string;
	service: {
		id: number;
		name: string;
	};
}

interface ChangePackageFormProps {
	order: NonNullable<OrdersGlobalPageProps["selectedOrder"]>;
	packages: Package[];
	onSuccess?: () => void;
	forceMode?: ResponsiveDialogMode;
}

// Helper component for package change rules
const RuleItem = ({
	title,
	description,
}: {
	title: string;
	description: string;
}) => (
	<div className="text-xs space-y-1">
		<p className="font-semibold leading-none">{title}</p>
		<p className="text-muted-foreground">{description}</p>
	</div>
);

const CHANGE_PACKAGE_FORM_DEFAULT_FORCE = false;
const CHANGE_PACKAGE_DEFAULT_BYPASS_PAYMENT = true;

export function ChangePackageForm({
	order,
	packages,
	onSuccess,
	forceMode,
}: ChangePackageFormProps) {
	const { t } = useTranslation("appointments", { useSuspense: false });

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

	const currentPackage = order.package || null;

	const isDowngrade = useMemo(() => {
		if (!selectedPackage || !currentPackage) return false;
		return selectedPackage.numberOfVisit < currentPackage.numberOfVisit;
	}, [selectedPackage, currentPackage]);

	const isUpgrade = useMemo(() => {
		if (!selectedPackage || !currentPackage) return false;
		return selectedPackage.numberOfVisit > currentPackage.numberOfVisit;
	}, [selectedPackage, currentPackage]);

	const buttonProps = useMemo<ResponsiveDialogButton>(
		() => ({
			isLoading,
			forceMode,
			submitText: t("button.change_package.submit"),
		}),
		[isLoading, forceMode, t],
	);

	const formSchema = useMemo(
		() =>
			z.object({
				new_package_id: z.string().min(1, t("validation.package_required")),
				force: z.boolean().default(false),
				bypass_payment: z.boolean().default(true),
			}),
		[t],
	);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			new_package_id: "",
			force: CHANGE_PACKAGE_FORM_DEFAULT_FORCE,
			bypass_payment: CHANGE_PACKAGE_DEFAULT_BYPASS_PAYMENT,
		},
	});

	const handleSubmit = async (values: z.infer<typeof formSchema>) => {
		setIsLoading(true);
		setError(null);

		try {
			await router.put(
				`/admin-portal/appointments/orders/${order.id}/change-package`,
				{
					form_data: values,
				},
				{
					preserveState: true,
					preserveScroll: true,
					onSuccess: () => {
						onSuccess?.();
					},
					onError: (errors) => {
						const defaultMessage = "Failed to change package";
						const errorMessage = errors.message || defaultMessage;
						setError(errorMessage);
						console.error(defaultMessage, errorMessage);
					},
				},
			);
		} catch (err) {
			const defaultMessage =
				"An unexpected error occurred while changing package";
			const errorMessage = err instanceof Error ? err.message : defaultMessage;
			setError(errorMessage);
			console.error(defaultMessage, errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>{t("error.title")}</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<div className="bg-card rounded-lg p-3 border border-border text-sm space-y-6">
					{/* Order Info Summary */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-0.5">
							<p className="text-xs uppercase tracking-wider text-muted-foreground/75">
								{t("fields.registration_number.label")}
							</p>
							<p className="font-semibold font-mono">
								{order.registrationNumber || "N/A"}
							</p>
						</div>
						<div className="space-y-0.5">
							<p className="text-xs uppercase tracking-wider text-muted-foreground/75">
								{t("fields.patient.label")}
							</p>
							<p className="font-semibold uppercase">
								{order?.patient?.name || "N/A"}
							</p>
						</div>
						<div className="space-y-0.5">
							<p className="text-xs uppercase tracking-wider text-muted-foreground/75">
								{t("fields.service.label")}
							</p>
							<p className="font-semibold">
								{order?.appointments[0]?.serviceName?.replaceAll("_", " ") ||
									"N/A"}
							</p>
						</div>
						<div className="space-y-0.5">
							<p className="text-xs uppercase tracking-wider text-muted-foreground/75">
								{t("fields.visit_city_location.label")}
							</p>
							<p className="font-semibold">
								{order?.appointments[0]?.locationCity || "N/A"}
							</p>
						</div>

						{/* Package Transition Information */}
						{selectedPackage && currentPackage && (
							<>
								<div className="col-span-full space-y-4">
									<p className="text-xs uppercase tracking-wider text-muted-foreground/75">
										{t("fields.package.label")}
									</p>
									<div className="flex items-center justify-around">
										<div className="text-center flex-1">
											<div className="w-12 h-12 bg-card border border-border rounded-lg flex items-center justify-center mb-3 mx-auto">
												<PackageIcon className="h-6 w-6 shrink-0" />
											</div>

											<div>
												<p className="text-sm font-medium tracking-tight">
													{currentPackage.name}
												</p>
												<p className="text-xs text-muted-foreground/75 italic">
													{currentPackage.numberOfVisit} {t("common.visits")}
												</p>
											</div>
										</div>

										<div className="flex flex-col items-center">
											<span className="text-xs text-muted-foreground/75">
												{t("common.to")}
											</span>
										</div>

										<div className="text-center flex-1">
											<div className="w-12 h-12 bg-primary/10 border border-primary/25 rounded-lg flex items-center justify-center mb-3 mx-auto">
												<PackageIcon className="h-6 w-6 text-primary" />
											</div>

											<div>
												<p className="text-sm font-medium tracking-tight text-primary">
													{selectedPackage.name}
												</p>
												<p className="text-xs italic text-primary/75">
													{selectedPackage.numberOfVisit} {t("common.visits")}
												</p>
											</div>
										</div>
									</div>
								</div>

								<div className="col-span-full">
									{/* Warnings/Rules */}
									{isDowngrade && (
										<Collapsible className="rounded-md data-[state=open]:bg-amber-50 transition-all overflow-hidden">
											<CollapsibleTrigger asChild>
												<Button
													variant="ghost"
													className="group w-full flex items-center justify-between h-10 hover:bg-amber-100 hover:text-amber-800 text-amber-700 px-2"
												>
													<div className="flex items-center gap-2.5">
														<AlertCircle className="h-4 w-4" />
														<span className="text-[10px] font-bold uppercase tracking-widest">
															{t("form.change_package.rules.downgrade.header")}
														</span>
													</div>
													<ChevronDownIcon className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180 opacity-50" />
												</Button>
											</CollapsibleTrigger>
											<CollapsibleContent className="px-2 pb-3 pt-1 space-y-6">
												<div className="grid gap-3">
													<RuleItem
														title={t(
															"form.change_package.rules.downgrade.items.completed_visits.title",
														)}
														description={t(
															"form.change_package.rules.downgrade.items.completed_visits.description",
														)}
													/>
													<RuleItem
														title={t(
															"form.change_package.rules.downgrade.items.schedule_adjustment.title",
														)}
														description={t(
															"form.change_package.rules.downgrade.items.schedule_adjustment.description",
														)}
													/>
													<RuleItem
														title={t(
															"form.change_package.rules.downgrade.items.medical_records.title",
														)}
														description={t(
															"form.change_package.rules.downgrade.items.medical_records.description",
														)}
													/>
													<RuleItem
														title={t(
															"form.change_package.rules.downgrade.items.auto_sequence.title",
														)}
														description={t(
															"form.change_package.rules.downgrade.items.auto_sequence.description",
														)}
													/>
													<RuleItem
														title={t(
															"form.change_package.rules.downgrade.items.price_adjustment.title",
														)}
														description={t(
															"form.change_package.rules.downgrade.items.price_adjustment.description",
														)}
													/>
												</div>

												{/* no need for force update yet */}
												{/* <FormField
													control={form.control}
													name="force"
													render={({ field }) => (
														<FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3 bg-background/50 border-border/50">
															<FormControl>
																<Checkbox
																	checked={field.value}
																	onCheckedChange={field.onChange}
																/>
															</FormControl>
															<div className="space-y-0.5 leading-none">
																<FormLabel className="text-[11px] font-semibold cursor-pointer">
																	Paksa Update (Force Change)
																</FormLabel>
																<FormDescription className="text-[10px] text-muted-foreground/75 leading-tight">
																	Izinkan penghapusan kunjungan meskipun
																	memiliki SOAP atau Evidence.
																</FormDescription>
															</div>
														</FormItem>
													)}
												/> */}
											</CollapsibleContent>
										</Collapsible>
									)}

									{isUpgrade && (
										<Collapsible className="rounded-md data-[state=open]:bg-amber-50 transition-all overflow-hidden">
											<CollapsibleTrigger asChild>
												<Button
													variant="ghost"
													className="group w-full flex items-center justify-between h-10 hover:bg-amber-100 hover:text-amber-800 text-amber-700 px-2"
												>
													<div className="flex items-center gap-2.5">
														<AlertCircle className="h-4 w-4" />
														<span className="text-[10px] font-bold uppercase tracking-widest">
															{t("form.change_package.rules.upgrade.header")}
														</span>
													</div>
													<ChevronDownIcon className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180 opacity-50" />
												</Button>
											</CollapsibleTrigger>
											<CollapsibleContent className="px-2 pb-3 pt-1 space-y-6">
												<div className="grid gap-3">
													<RuleItem
														title={t(
															"form.change_package.rules.upgrade.items.additional_sessions.title",
														)}
														description={t(
															"form.change_package.rules.upgrade.items.additional_sessions.description",
														)}
													/>
													<RuleItem
														title={t(
															"form.change_package.rules.upgrade.items.therapist_assignment.title",
														)}
														description={t(
															"form.change_package.rules.upgrade.items.therapist_assignment.description",
														)}
													/>
													<RuleItem
														title={t(
															"form.change_package.rules.upgrade.items.linked_history.title",
														)}
														description={t(
															"form.change_package.rules.upgrade.items.linked_history.description",
														)}
													/>
													<RuleItem
														title={t(
															"form.change_package.rules.upgrade.items.price_adjustment.title",
														)}
														description={t(
															"form.change_package.rules.upgrade.items.price_adjustment.description",
														)}
													/>
												</div>
											</CollapsibleContent>
										</Collapsible>
									)}
								</div>
							</>
						)}
					</div>
				</div>

				<div className="px-1 space-y-4">
					<FormField
						control={form.control}
						name="new_package_id"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("form.new_package.label")}</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant="outline"
												className={cn(
													"w-full justify-between shadow-inner bg-sidebar",
													!field.value && "text-muted-foreground/75",
												)}
											>
												{field.value ? (
													<span className="font-medium tracking-tight">
														{
															packages.find(
																(pkg) => pkg.id.toString() === field.value,
															)?.name
														}{" "}
														<span className="text-muted-foreground/75 font-normal italic">
															&mdash;{" "}
															{
																packages.find(
																	(pkg) => pkg.id.toString() === field.value,
																)?.numberOfVisit
															}{" "}
															{t("common.visits")}
														</span>
													</span>
												) : (
													t("form.new_package.placeholder")
												)}
												<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-75" />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent
										className="w-full p-0 min-w-[var(--radix-popover-trigger-width)]"
										align="start"
									>
										<Command>
											<CommandInput
												placeholder={t("form.new_package.search_placeholder")}
											/>
											<CommandList>
												<CommandEmpty>
													{t("form.new_package.no_package_found")}
												</CommandEmpty>
												<CommandGroup>
													{packages.map((pkg) => (
														<CommandItem
															value={pkg.name}
															key={pkg.id}
															onSelect={(value) => {
																const selected = packages.find(
																	(p) => p.name === value,
																);
																if (selected) {
																	form.setValue(
																		"new_package_id",
																		selected.id.toString(),
																	);
																	setSelectedPackage(selected);
																}
															}}
															className="flex items-center justify-between"
														>
															<span className="font-medium tracking-tight">
																{pkg.name}{" "}
																<span className="text-muted-foreground/75 font-normal italic">
																	&mdash; {pkg.numberOfVisit}{" "}
																	{t("common.visits")}
																</span>
															</span>

															<Check
																className={cn(
																	"h-4 w-4",
																	pkg.name ===
																		packages.find(
																			(p) => p.id.toString() === field.value,
																		)?.name
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
				</div>

				<ResponsiveDialogButton {...buttonProps} />
			</form>
		</Form>
	);
}

export function RegenerateInvoiceForm({
	order,
	forceMode,
}: {
	order: {
		id: string;
		registrationNumber: string;
		status: string;
		paymentStatus: string;
	};
	forceMode?: ResponsiveDialogMode;
}) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [newInvoiceUrl, setNewInvoiceUrl] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const { t: tappt } = useTranslation(["appointments"]);

	const buttonProps = useMemo<ResponsiveDialogButton>(
		() => ({
			isLoading,
			forceMode,
			submitText: tappt("form.regenerate_invoice.submit"),
		}),
		[isLoading, forceMode, tappt],
	);

	const formSchema = z.object({
		expiry_minutes: z.string().min(1, "Please select an expiration time"),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			expiry_minutes: "180", // default 3 hours
		},
	});

	const EXPIRY_OPTIONS = [
		{ value: "30", label: tappt("form.regenerate_invoice.options.minutes_30") },
		{ value: "60", label: tappt("form.regenerate_invoice.options.hour_1") },
		{ value: "180", label: tappt("form.regenerate_invoice.options.hours_3") },
		{ value: "300", label: tappt("form.regenerate_invoice.options.hours_5") },
		{ value: "720", label: tappt("form.regenerate_invoice.options.hours_12") },
	];

	const handleSubmit = async (values: z.infer<typeof formSchema>) => {
		setIsLoading(true);
		setError(null);

		try {
			const csrfToken = document
				.querySelector('meta[name="csrf-token"]')
				?.getAttribute("content");
			const response = await fetch(
				`/api/v1/appointments/orders/${order.id}/regenerate-invoice`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						"X-CSRF-Token": csrfToken || "",
					},
					body: JSON.stringify({
						form_data: {
							expiry_minutes: parseInt(values.expiry_minutes, 10),
						},
					}),
				},
			);

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.error || tappt("form.regenerate_invoice.failed"));
			}

			toast.success(tappt("form.regenerate_invoice.success"));
			setNewInvoiceUrl(data.data?.invoice_url || "");
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "An unexpected error occurred";
			setError(message);
			console.error("Failed to regenerate invoice:", message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCopy = useCallback(() => {
		if (!newInvoiceUrl) return;
		navigator.clipboard.writeText(newInvoiceUrl).then(() => {
			setCopied(true);
			toast.success(tappt("form.regenerate_invoice.copied"));
			setTimeout(() => setCopied(false), 2000);
		});
	}, [newInvoiceUrl, tappt]);

	if (newInvoiceUrl) {
		return (
			<div className="p-0.5 space-y-6">
				<Alert className="bg-emerald-50 border-emerald-200">
					<AlertTitle className="text-emerald-800">
						{tappt("form.regenerate_invoice.success_title")}
					</AlertTitle>
					<AlertDescription className="text-emerald-700">
						{tappt("form.regenerate_invoice.success")}
					</AlertDescription>
				</Alert>

				<div className="space-y-2">
					<Label htmlFor="invoice-url">
						{tappt("form.regenerate_invoice.new_url")}
					</Label>
					<div className="relative">
						<Input
							id="invoice-url"
							className="pe-9 truncate font-mono shadow-inner bg-sidebar select-all"
							defaultValue={newInvoiceUrl}
							readOnly
							type="text"
						/>
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										aria-label={copied ? "Copied" : "Copy to clipboard"}
										className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed"
										disabled={copied}
										onClick={handleCopy}
										type="button"
									>
										<div
											className={cn(
												"transition-all",
												copied ? "scale-100 opacity-100" : "scale-0 opacity-0",
											)}
										>
											<Check
												aria-hidden="true"
												className="stroke-emerald-500"
												size={16}
											/>
										</div>
										<div
											className={cn(
												"absolute transition-all",
												copied ? "scale-0 opacity-0" : "scale-100 opacity-100",
											)}
										>
											<Copy aria-hidden="true" size={16} />
										</div>
									</button>
								</TooltipTrigger>
								<TooltipContent className="px-2 py-1 text-xs bg-black text-white">
									Copy to clipboard
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-0.5 space-y-6">
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Form {...form}>
				<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="expiry_minutes"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{tappt("form.regenerate_invoice.label")}</FormLabel>
								<FormControl>
									<div className="flex flex-wrap gap-2">
										{EXPIRY_OPTIONS.map((option) => {
											const isSelected = field.value === option.value;
											return (
												<Badge
													key={option.value}
													variant={isSelected ? "default" : "outline"}
													className={cn(
														"cursor-pointer text-sm py-1.5 px-3 transition-all",
														isSelected
															? "ring-2 ring-primary ring-offset-1 shadow-sm"
															: "hover:bg-muted text-muted-foreground shadow-inner bg-sidebar",
													)}
													onClick={() => field.onChange(option.value)}
												>
													{option.label}
												</Badge>
											);
										})}
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
}
