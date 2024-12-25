import {
	FormPageContainer,
	FormPageHeader,
} from "@/components/admin-portal/shared/page-layout";
import type { Location } from "@/types/admin-portal/location";
import type { Service } from "@/types/admin-portal/service";
import type {
	TherapistEmploymentStatus,
	TherapistEmploymentType,
	TherapistGender,
} from "@/types/admin-portal/therapist";
import { Head } from "@inertiajs/react";
import FormTherapist from "./Form";

export interface NewTherapistPageProps {
	therapist: {
		id: null | string;
		name: null | string;
	};
	genders: TherapistGender;
	employmentTypes: TherapistEmploymentType;
	employmentStatuses: TherapistEmploymentStatus;
	services: Service[];
	locations: Location[];
}

export default function New({
	therapist,
	genders,
	employmentTypes,
	employmentStatuses,
	services,
	locations,
}: NewTherapistPageProps) {
	return (
		<>
			<Head title="Create Therapist" />

			<FormPageContainer>
				<section className="flex flex-col justify-center gap-4 mx-auto w-12/12 xl:w-8/12">
					<FormPageHeader
						title="New Therapist"
						description="Add a new therapist account."
					/>

					<FormTherapist
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
