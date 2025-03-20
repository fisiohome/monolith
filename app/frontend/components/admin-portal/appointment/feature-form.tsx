import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import {
	MultiSelector,
	MultiSelectorContent,
	MultiSelectorInput,
	MultiSelectorItem,
	MultiSelectorList,
	MultiSelectorTrigger,
} from "@/components/ui/multi-select";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import i18n from "@/lib/i18n";
import { populateQueryParams } from "@/lib/utils";
import type { AppointmentIndexGlobalPageProps } from "@/pages/AdminPortal/Appointment/Index";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { ResponsiveDialogMode } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

export function CancelAppointmentForm({
	selectedAppointment,
	forceMode,
}: { selectedAppointment: Appointment; forceMode?: ResponsiveDialogMode }) {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);
	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return {
			isLoading,
			forceMode,
			submitText: i18n.t("appointments.modal.cancel.button_submit"),
		};
	}, [isLoading, forceMode]);
	const formSchema = z.object({ id: z.string() });
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: selectedAppointment.id,
		},
		mode: "onSubmit",
	});
	const onSubmit = (values: z.infer<typeof formSchema>) => {
		const routeURL = `${globalProps.adminPortal.router.adminPortal.appointment.index}/${values.id}/cancel`;
		// populate current query params
		const { queryParams } = populateQueryParams(pageURL);
		// generate the submit form url with the source query params
		const { fullUrl } = populateQueryParams(routeURL, queryParams);
		router.put(
			fullUrl,
			{},
			{
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
			},
		);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<ResponsiveDialogButton {...buttonProps} className="mb-1" />
			</form>
		</Form>
	);
}

export function UpdatePICForm({
	selectedAppointment,
	forceMode,
}: { selectedAppointment: Appointment; forceMode?: ResponsiveDialogMode }) {
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

		const routeURL = `${globalProps.adminPortal.router.adminPortal.appointment.index}/${values.id}/update_pic`;
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
													"appointments.fields.admin_pic.placeholder",
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
