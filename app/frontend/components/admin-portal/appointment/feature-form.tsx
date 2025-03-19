import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
import { Form } from "@/components/ui/form";
import i18n from "@/lib/i18n";
import { populateQueryParams } from "@/lib/utils";
import type { AppointmentIndexGlobalPageProps } from "@/pages/AdminPortal/Appointment/Index";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { ResponsiveDialogMode } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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
