import { Input } from "@/components/ui/input";
import { debounce, populateQueryParams } from "@/lib/utils";
import type { TableToolbarDataProps } from "@/pages/AdminPortal/Location/Index";
import type { GlobalPageProps } from "@/types/globals";
import { router, usePage } from "@inertiajs/react";
import { Search } from "lucide-react";
import { type ChangeEvent, useCallback, useState } from "react";

export default function ToolbarTable({
	table: _,
}: { table: TableToolbarDataProps }) {
	const { url: pageURL, props: globalProps } = usePage<GlobalPageProps>();

	const [filterBy, setFilterBy] = useState({
		country: globalProps?.adminPortal?.currentQuery?.country || "",
		state: globalProps?.adminPortal?.currentQuery?.state || "",
		city: globalProps?.adminPortal?.currentQuery?.city || "",
	});
	const updateQueryParams = useCallback(
		debounce((value) => {
			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				...value,
			});

			router.get(
				fullUrl,
				{ ...queryParams },
				{ preserveState: true, only: ["locations"] },
			);
		}, 500),
		[],
	);
	const handleFilterBy = ({
		event,
		type,
	}: {
		event: ChangeEvent<HTMLInputElement>;
		type: "country" | "state" | "city";
	}) => {
		event.preventDefault();

		if (type === "country") {
			const value = event.target.value;
			setFilterBy({ ...filterBy, country: value });
			updateQueryParams({ country: value });
		}

		if (type === "state") {
			const value = event.target.value;
			setFilterBy({ ...filterBy, state: value });
			updateQueryParams({ state: value });
		}

		if (type === "city") {
			const value = event.target.value;
			setFilterBy({ ...filterBy, city: value });
			updateQueryParams({ city: value });
		}
	};

	return (
		<section className="flex flex-col flex-wrap justify-start gap-4 lg:flex-row lg:gap-2">
			<div className="w-full md:w-[200px]">
				<Input
					value={filterBy.country}
					StartIcon={{ icon: Search }}
					type="text"
					placeholder="Filter by country..."
					onChange={(event) => handleFilterBy({ event, type: "country" })}
				/>
			</div>

			<div className="w-full md:w-[200px]">
				<Input
					value={filterBy.state}
					StartIcon={{ icon: Search }}
					type="text"
					placeholder="Filter by state..."
					onChange={(event) => handleFilterBy({ event, type: "state" })}
				/>
			</div>

			<div className="w-full md:w-[200px]">
				<Input
					value={filterBy.city}
					StartIcon={{ icon: Search }}
					type="text"
					placeholder="Filter by city..."
					onChange={(event) => handleFilterBy({ event, type: "city" })}
				/>
			</div>
		</section>
	);
}
