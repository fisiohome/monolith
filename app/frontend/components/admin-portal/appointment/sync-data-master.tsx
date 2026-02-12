import { LoaderCircleIcon as LoaderIcon, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface SyncDataMasterProps {
	isSynchronizing: boolean;
	isMobile: boolean;
	onSync: () => void;
}

export const SyncDataMaster = ({
	isSynchronizing,
	isMobile,
	onSync,
}: SyncDataMasterProps) => {
	const { t: tbase } = useTranslation();
	const { t } = useTranslation("appointments");

	return (
		<Button
			variant="primary-outline"
			size={isMobile ? "icon" : "default"}
			className="shadow-none"
			disabled={isSynchronizing}
			onClick={(event) => {
				event.preventDefault();
				onSync();
			}}
		>
			{isSynchronizing ? (
				<>
					<LoaderIcon className="animate-spin" />
					<span>{`${tbase("components.modal.wait")}...`}</span>
				</>
			) : (
				<>
					<RefreshCcw />
					{isMobile ? null : t("button.sync")}
				</>
			)}
		</Button>
	);
};
