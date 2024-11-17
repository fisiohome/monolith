import { Input } from "@/components/ui/input";
import { debounce, populateQueryParams } from "@/lib/utils";
import type { TableToolbarDataProps } from "@/pages/AdminPortal/Admin/Index";
import type { GlobalPageProps } from "@/types/globals";
import { router, usePage } from "@inertiajs/react";
import { Search } from "lucide-react";
import { type ChangeEvent, useCallback, useState } from "react";

export default function ToolbarTable({
	table: _,
}: { table: TableToolbarDataProps }) {
	const { url: pageURL, props: globalProps } = usePage<GlobalPageProps>();

	const [filterBy, setFilterBy] = useState({
		email: globalProps?.adminPortal?.currentQuery?.email || "",
	});
	const updateQueryParams = useCallback(
		debounce((value) => {
			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				...value,
			});

			router.get(
				fullUrl,
				{ ...queryParams },
				{ preserveState: true, only: ["admins"] },
			);
		}, 500),
		[],
	);
	const handleFilterBy = ({
		event,
		type,
	}: { event: ChangeEvent<HTMLInputElement>; type: "email" }) => {
		event.preventDefault();

		if (type === "email") {
			const value = event.target.value;
			setFilterBy({ ...filterBy, email: value });
			updateQueryParams({ email: value });
		}
	};

	return (
		<section className="flex flex-col flex-wrap items-center gap-4 lg:flex-row lg:gap-2">
			<div className="w-[200px]">
				<Input
					value={filterBy.email}
					endIcon={Search}
					type="text"
					placeholder="Filter by email..."
					onChange={(event) => handleFilterBy({ event, type: "email" })}
				/>
			</div>
		</section>
	);
}
