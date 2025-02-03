import { Input } from "@/components/ui/input";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { debounce, populateQueryParams } from "@/lib/utils";
import type { TableToolbarDataProps } from "@/pages/AdminPortal/Service/Index";
import type { GlobalPageProps } from "@/types/globals";
import { router, usePage } from "@inertiajs/react";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";

export interface ToolbarTableProps {
	table: TableToolbarDataProps;
}

export default function ToolbarTable({ table: _ }: ToolbarTableProps) {
	const { url: pageURL, props: globalProps } = usePage<GlobalPageProps>();

	const [filterBy, setFilterBy] = useState({
		name: globalProps?.adminPortal?.currentQuery?.name || "",
	});
	const updateQueryParams = useCallback(
		debounce((value) => {
			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				...value,
			});

			router.get(
				fullUrl,
				{ ...queryParams },
				{ preserveState: true, only: ["services"] },
			);
		}, 500),
		[],
	);
	const handleFilterBy = ({
		value,
		type,
	}: { value: string; type: keyof typeof filterBy }) => {
		setFilterBy({ ...filterBy, [type]: value });
		updateQueryParams(deepTransformKeysToSnakeCase({ [type]: value }));
	};

	return (
		<section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-2 lg:grid-cols-4 xl:grid-cols-5">
			<div className="col-span-full md:col-span-1">
				<Input
					value={filterBy.name}
					StartIcon={{ icon: Search }}
					type="text"
					placeholder="Filter by brand name..."
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({ type: "name", value: event.target.value });
					}}
				/>
			</div>
		</section>
	);
}
