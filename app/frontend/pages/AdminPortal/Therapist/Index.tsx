import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Button } from "@/components/ui/button";
import type { GlobalPageProps } from "@/types/globals";
import { Head, Link, usePage } from "@inertiajs/react";
import { Plus } from "lucide-react";

export interface PageProps {
	therapists: any;
}

export default function Index({ therapists }: PageProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	return (
		<>
			<Head title="Therapist Management" />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Therapists</h1>
				{globalProps.auth.currentUser?.["isSuperAdmin?"] && (
					<Button asChild>
						<Link
							href={
								globalProps.adminPortal.router.adminPortal.therapistManagement
									.new
							}
						>
							<Plus />
							Add Therapist
						</Link>
					</Button>
				)}
			</PageContainer>

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min gap-4">
				content
			</PageContainer>
		</>
	);
}
