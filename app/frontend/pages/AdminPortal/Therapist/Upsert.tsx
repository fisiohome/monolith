import {
	FormPageContainer,
	FormPageHeader,
} from "@/components/admin-portal/shared/page-layout";
import type { Location } from "@/types/admin-portal/location";
import type { Service } from "@/types/admin-portal/service";
import type {
	Therapist,
	TherapistEmploymentStatus,
	TherapistEmploymentType,
	TherapistGender,
} from "@/types/admin-portal/therapist";
import { Head } from "@inertiajs/react";
import { useMemo } from "react";
import FormTherapist from "../../../components/admin-portal/therapist/upsert-form";

export type FormMode = "create" | "update";

export interface UpsertTherapistPageProps {
	currentPath: string;
	therapist: Partial<Therapist>;
	genders: TherapistGender;
	employmentTypes: TherapistEmploymentType;
	employmentStatuses: TherapistEmploymentStatus;
	services: Service[];
	locations: Location[];
}

export default function UpsertTherapistPage({
	currentPath,
	therapist,
	genders,
	employmentTypes,
	employmentStatuses,
	services,
	locations,
}: UpsertTherapistPageProps) {
	const formMode = useMemo<FormMode>(
		() => (therapist?.id ? "update" : "create"),
		[therapist],
	);
	const formHeader = useMemo(() => {
		const title = formMode === "create" ? "New Therapist" : "Update Therapist";
		const description =
			formMode === "create"
				? "Add a new therapist account."
				: "Modify an existing therapist account.";

		return { title, description };
	}, [formMode]);

	return (
		<>
			<Head title={formHeader.title}>
				<link
					rel="stylesheet"
					type="text/css"
					href="https://js.api.here.com/v3/3.1/mapsjs-ui.css"
				/>
				<script
					type="text/javascript"
					charSet="utf-8"
					src="https://js.api.here.com/v3/3.1/mapsjs-ui.js"
				/>
			</Head>

			<FormPageContainer>
				<section className="flex flex-col justify-center gap-4 mx-auto w-12/12 xl:w-8/12">
					<FormPageHeader
						title={formHeader.title}
						description={formHeader.description}
					/>

					<FormTherapist
						mode={formMode}
						currentPath={currentPath}
						therapist={therapist}
						genders={genders}
						employmentTypes={employmentTypes}
						employmentStatuses={employmentStatuses}
						services={services}
						locations={locations}
					/>
				</section>
			</FormPageContainer>
		</>
	);
}
