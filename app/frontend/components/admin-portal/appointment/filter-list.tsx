import { useCallback, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import type { AppointmentIndexGlobalPageProps } from "@/pages/AdminPortal/Appointment/Index";
import { debounce, populateQueryParams } from "@/lib/utils";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";

export default function FilterList() {
	const { url: pageURL, props: globalProps } =
		usePage<AppointmentIndexGlobalPageProps>();
	const [isSearching, setIsSearching] = useState(false);
	const [filterBy, setFilterBy] = useState({
		patient: globalProps?.adminPortal?.currentQuery?.patient || "",
		therapist: globalProps?.adminPortal?.currentQuery?.therapist || "",
		registrationNumber:
			globalProps?.adminPortal?.currentQuery?.registrationNumber || "",
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
				{
					preserveState: true,
					only: ["adminPortal", "flash", "errors", "appointments"],
					onStart: () => {
						setIsSearching(true);
					},
					onFinish: () => {
						setTimeout(() => {
							setIsSearching(false);
						}, 250);
					},
				},
			);
		}, 500),
		[],
	);
	const handleFilterBy = useCallback(
		({ value, type }: { value: string; type: keyof typeof filterBy }) => {
			setFilterBy({ ...filterBy, [type]: value });
			updateQueryParams(deepTransformKeysToSnakeCase({ [type]: value }));
		},
		[filterBy, updateQueryParams],
	);

	return (
		<section className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-3 md:gap-2 lg:grid-cols-4 xl:grid-cols-5">
			<div className="col-span-full md:col-span-1">
				<Input
					type="text"
					placeholder="Filter by therapist name..."
					value={filterBy.therapist}
					StartIcon={{ icon: Search }}
					isLoading={isSearching}
					EndIcon={
						filterBy.therapist
							? {
									icon: X,
									isButton: true,
									handleOnClick: () => {
										handleFilterBy({ type: "therapist", value: "" });
									},
								}
							: undefined
					}
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({ type: "therapist", value: event.target.value });
					}}
				/>
			</div>

			<div className="col-span-full md:col-span-1">
				<Input
					type="text"
					placeholder="Filter by patient name..."
					value={filterBy.patient}
					StartIcon={{ icon: Search }}
					isLoading={isSearching}
					EndIcon={
						filterBy.patient
							? {
									icon: X,
									isButton: true,
									handleOnClick: () => {
										handleFilterBy({ type: "patient", value: "" });
									},
								}
							: undefined
					}
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({ type: "patient", value: event.target.value });
					}}
				/>
			</div>

			<div className="col-span-full md:col-span-1">
				<Input
					type="text"
					placeholder="Filter by reg number..."
					value={filterBy.registrationNumber}
					StartIcon={{ icon: Search }}
					isLoading={isSearching}
					EndIcon={
						filterBy.registrationNumber
							? {
									icon: X,
									isButton: true,
									handleOnClick: () => {
										handleFilterBy({ type: "registrationNumber", value: "" });
									},
								}
							: undefined
					}
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({
							type: "registrationNumber",
							value: event.target.value,
						});
					}}
				/>
			</div>
		</section>
	);
}
