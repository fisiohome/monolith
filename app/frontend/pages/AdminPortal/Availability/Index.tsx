import ScheduleForm from "@/components/admin-portal/availability/schedule-form";
import { TherapistList } from "@/components/admin-portal/availability/therapist-list";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import type { DAY_NAMES } from "@/lib/constants";
import type { Therapist } from "@/types/admin-portal/therapist";
import { Deferred, Head } from "@inertiajs/react";

export interface AvailabilityIndexProps {
	therapists: Therapist[];
	selectedTherapist: Therapist | null;
	dayNames: (typeof DAY_NAMES)[number][];
}

export default function AvailabilityIndex({
	therapists,
	selectedTherapist,
	dayNames,
}: AvailabilityIndexProps) {
	return (
		<>
			<Head title="Availability Time" />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">
					Therapist Availability
				</h1>
			</PageContainer>

			<PageContainer className="grid flex-1 grid-cols-12 gap-6 md:min-h-min">
				<Deferred
					data={["therapists"]}
					fallback={
						<Skeleton className="h-full rounded-md col-span-full xl:col-span-4" />
					}
				>
					<TherapistList
						therapists={therapists}
						className="col-span-full xl:col-span-4"
					/>
				</Deferred>

				<ScheduleForm
					selectedTherapist={selectedTherapist}
					dayNames={dayNames}
					className="col-span-full xl:col-span-8"
				/>
			</PageContainer>
		</>
	);
}
