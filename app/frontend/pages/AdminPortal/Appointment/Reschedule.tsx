import { Head } from "@inertiajs/react";
import { Fragment, useMemo } from "react";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import {
	FormPageContainer,
	FormPageHeaderGridPattern,
} from "@/components/admin-portal/shared/page-layout";

import { Form } from "@/components/ui/form";
import { useRescheduleForm } from "@/hooks/admin-portal/appointment/use-reschedule-form";
import {
	FormActionButtons,
	RescheduleFields,
} from "@/components/admin-portal/appointment/reschedule-appointment";
import type { PREFERRED_THERAPIST_GENDER } from "@/lib/constants";
import type { AppointmentRescheduleSchema } from "@/lib/appointments/form-reschedule";

export interface AppointmentReschedulePageProps {
	appointment: Appointment;
	optionsData?: {
		preferredTherapistGender: typeof PREFERRED_THERAPIST_GENDER;
	};
}

export interface AppointmentRescheduleGlobalPageProps
	extends BaseGlobalPageProps,
	AppointmentReschedulePageProps {
	[key: string]: any;
	errors: Record<keyof AppointmentRescheduleSchema, string[]> & { fullMessages: string[] };
}

export default function AppointmentReschedulePage({
	appointment,
}: AppointmentReschedulePageProps) {
	const { form, isLoading, onSubmit } = useRescheduleForm();
	const headTitle = useMemo(() => {
		const registrationNumber = appointment.registrationNumber;

		return `Reschedule ${registrationNumber}`;
	}, [appointment.registrationNumber]);

	return (
		<Fragment>
			<Head title={headTitle}>
				<link
					rel="stylesheet"
					type="text/css"
					href="https://js.api.here.com/v3/3.1/mapsjs-ui.css"
				/>
			</Head>

			<FormPageContainer>
				<section className="flex flex-col justify-center gap-4 mx-auto md:gap-6 w-12/12 xl:w-8/12">
					<FormPageHeaderGridPattern
						title={headTitle}
						description="Find another suitable time for an existing appointment session."
					/>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)}>
							<div className="grid gap-4">
								<RescheduleFields />

								<FormActionButtons isLoading={isLoading} />
							</div>
						</form>
					</Form>
				</section>
			</FormPageContainer>
		</Fragment>
	);
}
