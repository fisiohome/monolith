import { router, usePage } from "@inertiajs/react";
import { Search } from "lucide-react";
import { type ChangeEvent, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { debounce, populateQueryParams } from "@/lib/utils";
import type { TableToolbarDataProps } from "@/pages/AdminPortal/Location/Index";
import type { GlobalPageProps } from "@/types/globals";

export default function ToolbarTable({
	table: _,
}: {
	table: TableToolbarDataProps;
}) {
	const { url: pageURL, props: globalProps } = usePage<GlobalPageProps>();
	const { t: tl } = useTranslation("locations");

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
		<section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-2 lg:grid-cols-4 xl:grid-cols-5">
			<div className="col-span-full md:col-span-1">
				<Input
					value={filterBy.country}
					StartIcon={{ icon: Search }}
					type="text"
					placeholder={`${tl("filter.country")}...`}
					onChange={(event) => handleFilterBy({ event, type: "country" })}
				/>
			</div>

			<div className="col-span-full md:col-span-1">
				<Input
					value={filterBy.state}
					StartIcon={{ icon: Search }}
					type="text"
					placeholder={`${tl("filter.state")}...`}
					onChange={(event) => handleFilterBy({ event, type: "state" })}
				/>
			</div>

			<div className="col-span-full md:col-span-1">
				<Input
					value={filterBy.city}
					StartIcon={{ icon: Search }}
					type="text"
					placeholder={`${tl("filter.city")}...`}
					onChange={(event) => handleFilterBy({ event, type: "city" })}
				/>
			</div>
		</section>
	);
}
