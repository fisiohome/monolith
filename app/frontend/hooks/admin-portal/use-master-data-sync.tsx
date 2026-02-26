import { router } from "@inertiajs/react";
import { useCallback, useEffect, useRef, useState } from "react";

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
	syncType?: string; // Used for localStorage key
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
	syncType = "default",
}: UseMasterDataSyncOptions) {
	const [isLoading, setIsLoading] = useState(false);
	// Ref to track if sync callbacks have already fired this session,
	// preventing loops when onSyncComplete triggers a page reload
	const syncCallbackFiredRef = useRef(false);

	const [syncStatus, setSyncStatus] = useState<SyncStatus>({
		message: "",
		type: null,
	});

	// Get localStorage key for dismissed notifications
	const getDismissedKey = useCallback(() => {
		return `sync_notification_dismissed_${syncType}`;
	}, [syncType]);

	// Clear sync status message and store dismissal timestamp
	const clearStatus = useCallback(() => {
		setSyncStatus({ message: "", type: null });
		// Store dismissal timestamp in localStorage
		localStorage.setItem(getDismissedKey(), Date.now().toString());
	}, [getDismissedKey]);

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
					// Check if notification was already dismissed
					const dismissedTimestamp = localStorage.getItem(getDismissedKey());
					const completedAt = data.completed_at
						? new Date(data.completed_at).getTime()
						: Date.now();

					if (
						!dismissedTimestamp ||
						parseInt(dismissedTimestamp) < completedAt
					) {
						setSyncStatus({
							message: data.message || MESSAGES.SYNC_COMPLETED,
							type: "success",
						});
					}

					// Fire onSyncComplete only once per session to prevent reload loops
					if (onSyncComplete && !syncCallbackFiredRef.current) {
						syncCallbackFiredRef.current = true;
						// Mark as dismissed so the next mount check won't re-trigger
						localStorage.setItem(getDismissedKey(), Date.now().toString());
						setTimeout(onSyncComplete, 100);
					}
				} else if (data.status === "failed") {
					// Check if notification was already dismissed
					const dismissedTimestamp = localStorage.getItem(getDismissedKey());
					const completedAt = data.completed_at
						? new Date(data.completed_at).getTime()
						: Date.now();

					if (
						!dismissedTimestamp ||
						parseInt(dismissedTimestamp) < completedAt
					) {
						setSyncStatus({
							message: data.error || MESSAGES.SYNC_FAILED,
							type: "error",
						});
					}

					// Fire onSyncFailed only once per session to prevent reload loops
					if (onSyncFailed && !syncCallbackFiredRef.current) {
						syncCallbackFiredRef.current = true;
						localStorage.setItem(getDismissedKey(), Date.now().toString());
						setTimeout(onSyncFailed, 100);
					}
				} else if (data.status === "running") {
					// Keep polling if running
					setSyncStatus({
						message: MESSAGES.SYNC_RUNNING,
						type: "info",
					});
					setTimeout(poll, 2000);
				}
				// Note: "not_found" status means no recent sync and no running jobs
				// so we don't need to continue polling in this case
			} catch {
				// Stop polling on error
			}
		};

		// Start polling after a short delay
		setTimeout(poll, 2000);
	}, [statusEndpoint, onSyncComplete, onSyncFailed, getDismissedKey]);

	// Check for existing sync status
	const checkExistingSync = useCallback(async () => {
		try {
			const response = await fetch(statusEndpoint);

			if (!(await isValidJsonResponse(response))) {
				return;
			}

			const data = await response.json();

			if (data.status === "completed") {
				// Check if notification was already dismissed
				const dismissedTimestamp = localStorage.getItem(getDismissedKey());
				const completedAt = data.completed_at
					? new Date(data.completed_at).getTime()
					: Date.now();

				if (!dismissedTimestamp || parseInt(dismissedTimestamp) < completedAt) {
					setSyncStatus({
						message: data.message || MESSAGES.SYNC_COMPLETED,
						type: "success",
					});
				}

				// Fire onSyncComplete only once per session to prevent reload loops
				if (onSyncComplete && !syncCallbackFiredRef.current) {
					syncCallbackFiredRef.current = true;
					localStorage.setItem(getDismissedKey(), Date.now().toString());
					setTimeout(onSyncComplete, 100);
				}
			} else if (data.status === "failed") {
				// Check if notification was already dismissed
				const dismissedTimestamp = localStorage.getItem(getDismissedKey());
				const completedAt = data.completed_at
					? new Date(data.completed_at).getTime()
					: Date.now();

				if (!dismissedTimestamp || parseInt(dismissedTimestamp) < completedAt) {
					setSyncStatus({
						message: data.error || MESSAGES.SYNC_FAILED,
						type: "error",
					});
				}

				// Fire onSyncFailed only once per session to prevent reload loops
				if (onSyncFailed && !syncCallbackFiredRef.current) {
					syncCallbackFiredRef.current = true;
					localStorage.setItem(getDismissedKey(), Date.now().toString());
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
	}, [
		statusEndpoint,
		onSyncComplete,
		onSyncFailed,
		pollSyncStatus,
		getDismissedKey,
	]);

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
			// Reset the callback-fired ref so the new sync result can trigger callbacks
			syncCallbackFiredRef.current = false;
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
