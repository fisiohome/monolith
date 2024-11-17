import { Separator } from "@/components/ui/separator";
import type { Admin, AdminTypes } from "@/types/admin-portal/admin";
import type { User } from "@/types/auth";
import type { GlobalPageProps } from "@/types/globals";
import { Head, Link, usePage } from "@inertiajs/react";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import AdminForm from "./Form";

export interface EditAdminPageProps {
	admin: Pick<Admin, "id" | "adminType" | "name"> & {
		user: Pick<User, "id" | "email">;
	};
	adminTypeList: AdminTypes;
}

export default function Edit({ admin, adminTypeList }: EditAdminPageProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	const formSchema = z.object({
		name: z.string().min(3),
		email: z.string().email(),
		adminType: z.enum([...adminTypeList]),
	});

	return (
		<>
			<Head title="Edit Admin" />

			<article className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6 space-y-4">
				<div className="space-y-6 lg:w-6/12">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Link href={globalProps.adminPortal.router.authenticatedRootPath}>
								<ChevronLeft />
							</Link>
							<Separator
								orientation="vertical"
								className="h-5 bg-muted-foreground/50"
							/>
						</div>

						<h1 className="text-xl font-bold tracking-tight">
							<span>Edit Admin</span>
						</h1>
					</div>

					<Separator className="bg-muted-foreground/50" />
				</div>
			</article>
		</>
	);
}
