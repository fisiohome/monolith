import { Separator } from "@/components/ui/separator";
import type {
	TherapistEmploymentStatus,
	TherapistEmploymentType,
	TherapistGender,
} from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import { Head, usePage } from "@inertiajs/react";
import { ChevronLeft } from "lucide-react";
import FormTherapist, { type FormTherapistValues } from "./Form";

export interface NewTherapistPageProps {
	therapist: {
		id: null | string;
		name: null | string;
	};
	genders: TherapistGender;
	employmentTypes: TherapistEmploymentType;
	employmentStatuses: TherapistEmploymentStatus;
}

export default function New({
	therapist,
	genders,
	employmentTypes,
	employmentStatuses,
}: NewTherapistPageProps) {
	console.log(therapist);
	const { props: globalProps } = usePage<GlobalPageProps>();

	const onSubmit = (values: FormTherapistValues) => {
		console.log(values);
	};

	return (
		<>
			<Head title="Create Therapist" />

			<article className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6 space-y-4">
				<div className="space-y-6 lg:w-12/12">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<ChevronLeft
								className="cursor-pointer"
								onClick={() => {
									window.history.back();
								}}
							/>

							<Separator
								orientation="vertical"
								className="h-5 bg-muted-foreground/50"
							/>
						</div>

						<h1 className="text-xl font-bold tracking-tight">
							<span>Create Therapist</span>
						</h1>
					</div>

					<Separator className="bg-muted-foreground/50" />

					<FormTherapist
						therapist={therapist}
						genders={genders}
						employmentTypes={employmentTypes}
						employmentStatuses={employmentStatuses}
						onSubmit={onSubmit}
					/>
				</div>
			</article>
		</>
	);
}
