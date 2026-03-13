import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { AlertCircle, Check, ChevronsUpDown, LoaderIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
										<SelectTrigger>
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
