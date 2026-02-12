import { router } from "@inertiajs/react";
import { useCallback, useState } from "react";
import { populateQueryParams } from "@/lib/utils";

interface UseAppointmentDataMasterSyncParams {
	pageURL: string;
	syncRoute: string;
}

export const useAppointmentDataMasterSync = ({
	pageURL,
	syncRoute,
}: UseAppointmentDataMasterSyncParams) => {
	const [isSynchronizing, setIsSynchronizing] = useState(false);

	const doSync = useCallback(() => {
		const { queryParams } = populateQueryParams(pageURL);
		const { fullUrl } = populateQueryParams(syncRoute, { ...queryParams });

		router.put(
			fullUrl,
			{},
			{
				preserveScroll: true,
				preserveState: true,
				only: ["adminPortal", "flash", "errors", "appointments"],
				onStart: () => {
					setIsSynchronizing(true);
				},
				onFinish: () => {
					setTimeout(() => setIsSynchronizing(false), 250);
				},
			},
		);
	}, [pageURL, syncRoute]);

	return {
		isSynchronizing,
		doSync,
	};
};
