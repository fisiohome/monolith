import {
	AdminByRoleChart,
	TherapistByEmploymentTypeChart,
	TherapistByGenderChart,
} from "@/components/admin-portal/dashboard/charts";
import StatCard from "@/components/admin-portal/dashboard/stat-card";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Deferred, Head } from "@inertiajs/react";
import { HandPlatter, MapPinned, ShieldCheck, Stethoscope } from "lucide-react";
import { useMemo } from "react";

export interface DashboardAdmins {
	total: number;
	active: number;
	this_month: number;
	last_month: number;
	percentage_increment_monthly: number;
	by_type: Record<string, number>;
}
export interface DashboardTherapists {
	total: number;
	by_gender: Record<string, number>;
	by_employment_status: Record<string, number>;
	by_employment_type: Record<string, number>;
	by_service: Record<string, number>;
	this_month: number;
	last_month: number;
	percentage_increment_monthly: number;
}
export interface DashboardServices {
	total: number;
	active: number;
	location_registered: {
		total: number;
		active: number;
	};
}
export interface DashboardLocations {
	total: number;
	top_5_cities_with_therapists: Record<string, number>;
}
export interface PageProps {
	admins: DashboardAdmins;
	therapists: DashboardTherapists;
	services: DashboardServices;
	locations: DashboardLocations;
}

export default function Index({
	admins,
	locations,
	services,
	therapists,
}: PageProps) {
	const statsDashboards = useMemo(() => {
		const adminTotal = {
			title: "Total Admins",
			data: admins?.total || 0,
			icon: ShieldCheck,
			additional: admins?.percentage_increment_monthly
				? `${admins.percentage_increment_monthly >= 0 ? "+ " : "- "}${admins.percentage_increment_monthly}% from
										last month`
				: `+${admins?.this_month || 0} admin(s) in this month`,
		};
		const therapistTotal = {
			title: "Total Therapists",
			data: therapists?.total || 0,
			icon: Stethoscope,
			additional: therapists?.percentage_increment_monthly
				? `${therapists.percentage_increment_monthly >= 0 ? "+ " : "- "}${therapists.percentage_increment_monthly}% from
										last month`
				: `+${therapists?.this_month || 0} therapist(s) in this month`,
		};
		const serviceActive = {
			title: "Active Services",
			data: services?.active || 0,
			icon: HandPlatter,
			additional: `in ${services?.location_registered.active || 0} location(s)`,
		};
		const locationActive = {
			title: "Total Locations",
			data: locations?.total || 0,
			icon: MapPinned,
			additional: `${services?.location_registered.total || 0} registered in our service`,
		};

		return [serviceActive, therapistTotal, locationActive, adminTotal];
	}, [therapists, services, locations, admins]);

	return (
		<>
			<Head title="Dashboard Overview" />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
			</PageContainer>

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min gap-4">
				<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
					{statsDashboards?.length &&
						statsDashboards.map((stat) => (
							<Deferred
								key={stat.title}
								data={["admins", "therapists", "locations", "services"]}
								fallback={
									<Skeleton className="col-span-full md:col-span-1 h-[125px] rounded-md" />
								}
							>
								<StatCard
									key={stat.title}
									data={stat}
									className="col-span-1 md:col-span-1"
								/>
							</Deferred>
						))}

					<Deferred
						data="admins"
						fallback={
							<Skeleton className="col-span-full xl:col-span-2 h-[360px] rounded-md" />
						}
					>
						{admins?.by_type && (
							<AdminByRoleChart
								data={admins.by_type}
								className="col-span-full xl:col-span-2"
							/>
						)}
					</Deferred>

					<Deferred
						data="therapists"
						fallback={
							<Skeleton className="col-span-full md:col-span-1 h-[360px] rounded-md" />
						}
					>
						{therapists?.by_employment_type && (
							<TherapistByEmploymentTypeChart
								data={therapists.by_employment_type}
								className="col-span-full md:col-span-1"
							/>
						)}
					</Deferred>

					<Deferred
						data="therapists"
						fallback={
							<Skeleton className="col-span-full md:col-span-1 h-[360px] rounded-md" />
						}
					>
						{therapists?.by_gender && (
							<TherapistByGenderChart
								data={therapists.by_gender}
								className="col-span-full md:col-span-1"
							/>
						)}
					</Deferred>
				</section>
			</PageContainer>
		</>
	);
}
