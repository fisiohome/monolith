import { router } from "@inertiajs/react";
import { useCallback, useEffect, useState } from "react";

// Message constants
const MESSAGES = {
	SYNC_RUNNING: "Data sync is running in the background...",
	SYNC_COMPLETED: "Sync completed successfully!",
	SYNC_FAILED: "Sync failed. Please try again.",
} as const;

export type SyncStatusType = "success" | "error" | "info" | null;

export interface SyncStatus {
	message: string;
	type: SyncStatusType;
}

export interface UseMasterDataSyncOptions {
	syncEndpoint: string;
	statusEndpoint: string;
	onSyncComplete?: () => void;
	onSyncFailed?: () => void;
	autoCheckOnMount?: boolean;
}

// Check if response is valid JSON - defined outside component to avoid recreating
const isValidJsonResponse = async (response: Response): Promise<boolean> => {
	if (!response.ok) return false;
	const contentType = response.headers.get("content-type");
	return contentType?.includes("application/json") ?? false;
};

export function useMasterDataSync({
	syncEndpoint,
	statusEndpoint,
	onSyncComplete,
	onSyncFailed,
	autoCheckOnMount = true,
}: UseMasterDataSyncOptions) {
	const [isLoading, setIsLoading] = useState(false);
	const [syncStatus, setSyncStatus] = useState<SyncStatus>({
		message: "",
		type: null,
	});

	// Clear sync status message
	const clearStatus = useCallback(() => {
		setSyncStatus({ message: "", type: null });
	}, []);

	// Poll sync status
	const pollSyncStatus = useCallback(() => {
		const poll = async () => {
			try {
				const response = await fetch(statusEndpoint);

				if (!(await isValidJsonResponse(response))) {
					return;
				}

				const data = await response.json();

				if (data.status === "completed") {
					setSyncStatus({
						message: data.message || MESSAGES.SYNC_COMPLETED,
						type: "success",
					});
					// Remove auto-clear to let notification persist
					// Delay the onSyncComplete to ensure the status is properly handled
					if (onSyncComplete) {
						setTimeout(onSyncComplete, 100);
					}
				} else if (data.status === "failed") {
					setSyncStatus({
						message: data.error || MESSAGES.SYNC_FAILED,
						type: "error",
					});
					// Remove auto-clear to let notification persist
					// Call onSyncFailed if provided
					if (onSyncFailed) {
						setTimeout(onSyncFailed, 100);
					}
				} else if (data.status === "running" || data.status === "not_found") {
					// Keep polling if running or not found yet
					if (data.status === "running") {
						setSyncStatus({
							message: MESSAGES.SYNC_RUNNING,
							type: "info",
						});
					}
					setTimeout(poll, 2000);
				}
			} catch {
				// Stop polling on error
			}
		};

		// Start polling after a short delay
		setTimeout(poll, 2000);
	}, [statusEndpoint, onSyncComplete, onSyncFailed]);

	// Check for existing sync status
	const checkExistingSync = useCallback(async () => {
		try {
			const response = await fetch(statusEndpoint);

			if (!(await isValidJsonResponse(response))) {
				return;
			}

			const data = await response.json();

			if (data.status === "completed") {
				setSyncStatus({
					message: data.message || MESSAGES.SYNC_COMPLETED,
					type: "success",
				});
				// Remove auto-clear to let notification persist
				// Call onSyncComplete after a short delay to ensure status is displayed
				if (onSyncComplete) {
					setTimeout(onSyncComplete, 100);
				}
			} else if (data.status === "failed") {
				setSyncStatus({
					message: data.error || MESSAGES.SYNC_FAILED,
					type: "error",
				});
				// Remove auto-clear to let notification persist
				// Call onSyncFailed if provided
				if (onSyncFailed) {
					setTimeout(onSyncFailed, 100);
				}
			} else if (data.status === "running") {
				// Start polling if job is running
				setSyncStatus({
					message: MESSAGES.SYNC_RUNNING,
					type: "info",
				});
				setTimeout(() => pollSyncStatus(), 1000);
			}
		} catch {
			// No status found, which is fine
		}
	}, [statusEndpoint, onSyncComplete, onSyncFailed, pollSyncStatus]);

	// Auto-check on mount
	useEffect(() => {
		if (autoCheckOnMount) {
			checkExistingSync();
		}
	}, [autoCheckOnMount, checkExistingSync]);

	// Trigger sync with optional parameters
	const triggerSync = useCallback(
		(params?: Record<string, string>) => {
			setIsLoading(true);
			setSyncStatus({
				message: MESSAGES.SYNC_RUNNING,
				type: "info",
			});

			router.put(syncEndpoint, params || {}, {
				preserveScroll: true,
				preserveState: true,
				only: ["adminPortal", "flash", "errors"],
				onFinish: () => {
					setIsLoading(false);
					pollSyncStatus();
				},
			});
		},
		[syncEndpoint, pollSyncStatus],
	);

	return {
		isLoading,
		syncStatus,
		triggerSync,
		clearStatus,
		checkExistingSync,
	};
}
