import { useCallback, useEffect, useState } from "react";
import type {
	AdminPicSchema,
	AppointmentBookingSchema,
} from "@/lib/appointments/form";
import { USE_DRAFT_DATABASE } from "./use-appointment-form";

export const DRAFT_STEPS = [
	"patient_details",
	"appointment_scheduling",
	"additional_settings",
	"review",
] as const;

export const DRAFT_STEPS_LABELS = {
	patient_details: "Patient Details",
	appointment_scheduling: "Appointment Scheduling",
	additional_settings: "Additional Settings",
	review: "Review",
};

export const DRAFT_API_BASE_URL = "/api/v1/appointments";

interface DraftInfo {
	id: string;
	adminPic?: AdminPicSchema;
	createdByAdmin: AdminPicSchema;
	currentStep: string;
	stepIndex: number;
	nextStep: string | null;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
	admins?: Array<AdminPicSchema & { isPrimary: boolean }>;
}

interface UseAppointmentDraftProps {
	onDraftSaved?: (draft: DraftInfo) => void;
	onDraftLoaded?: (formData: AppointmentBookingSchema) => void;
	onError?: (error: string) => void;
	// New props for URL draft loading
	draftIdFromUrl?: string | null;
	setFormStorage?: (data: any) => void;
	setDraftLoaded?: (loaded: boolean) => void;
}

export type DraftStep = (typeof DRAFT_STEPS)[number];

export const useAppointmentDraft = ({
	onDraftSaved,
	onDraftLoaded,
	onError,
	draftIdFromUrl,
	setFormStorage,
	setDraftLoaded,
}: UseAppointmentDraftProps = {}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [drafts, setDrafts] = useState<DraftInfo[]>([]);
	const [currentDraft, setCurrentDraft] = useState<DraftInfo | null>(null);
	const [internalDraftLoaded, setInternalDraftLoaded] = useState(false);

	const saveDraft = useCallback(
		async ({
			adminPicId,
			adminIds,
			primaryAdminId,
			currentStep,
			formData,
			draftId,
		}: {
			adminPicId?: string;
			adminIds?: string[];
			primaryAdminId?: string;
			currentStep?: string;
			formData: any;
			draftId?: string;
		}) => {
			setIsLoading(true);

			try {
				// Determine API endpoint and method based on whether we're updating or creating
				const url = draftId
					? `${DRAFT_API_BASE_URL}/drafts/${draftId}`
					: `${DRAFT_API_BASE_URL}/drafts`;
				const method = draftId ? "PUT" : "POST";

				// Get CSRF token for security
				const csrfToken = document
					.querySelector('meta[name="csrf-token"]')
					?.getAttribute("content");

				// Filter out invalid admin IDs (0, undefined, null, or empty string)
				const validAdminIds = adminIds
					? adminIds.filter((id) => id && id !== "0")
					: [];

				// Also validate adminPicId and primaryAdminId
				const validAdminPicId =
					adminPicId && adminPicId !== "0" ? adminPicId : undefined;
				const validPrimaryAdminId =
					primaryAdminId && primaryAdminId !== "0" ? primaryAdminId : undefined;

				const requestBody = {
					draft: {
						id: draftId,
						admin_pic_id: validAdminPicId,
						admin_ids: validAdminIds.length > 0 ? validAdminIds : undefined,
						primary_admin_id: validPrimaryAdminId,
						current_step: currentStep,
						form_data: formData,
					},
				};

				// Validate that at least one admin is selected
				if (!validAdminPicId && validAdminIds.length === 0) {
					throw new Error("At least one admin must be selected");
				}

				// Send the request to save the draft
				const response = await fetch(url, {
					method,
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						"X-CSRF-Token": csrfToken || "",
					},
					body: JSON.stringify(requestBody),
				});

				const data = await response.json();

				// Handle successful save
				if (data.success) {
					setCurrentDraft(data.draft);
					onDraftSaved?.(data.draft);
					return { success: true, draft: data.draft };
				}

				// If server returns an error, throw it to be caught by the catch block
				const errorMsg = data.errors?.join(", ") || "Failed to save draft";
				throw new Error(errorMsg);
			} catch (error) {
				// Handle any errors that occurred during the save process
				const errorMsg =
					error instanceof Error ? error.message : "Failed to save draft";
				onError?.(errorMsg);
				return { success: false, error: errorMsg };
			} finally {
				// Always set loading to false when done
				setIsLoading(false);
			}
		},
		[onDraftSaved, onError],
	);

	const loadDraft = useCallback(
		async (draftId: string) => {
			setIsLoading(true);

			try {
				// Fetch the draft from the API
				const response = await fetch(
					`${DRAFT_API_BASE_URL}/drafts/${draftId}`,
					{
						method: "GET",
						headers: {
							Accept: "application/json",
						},
					},
				);

				const data = await response.json();

				// Handle successful draft loading
				if (data.success) {
					setCurrentDraft(data.draft);

					// If loading from URL, include draftId in form data and update states
					if (setFormStorage && draftIdFromUrl) {
						const formDataWithDraftId = {
							...data.form_data,
							formOptions: {
								...data.form_data.formOptions,
								draftId: draftIdFromUrl,
							},
						};
						setFormStorage(formDataWithDraftId);
						setDraftLoaded?.(true);
						setInternalDraftLoaded(true);
					}

					// Call the success callback
					onDraftLoaded?.(data.form_data);

					return {
						success: true,
						draft: data.draft,
						formData: data.form_data,
						currentStep: data.current_step,
						admins: data.admins,
						primaryAdminId: data.primary_admin_id,
					};
				}

				// If server returns an error, throw it to be caught by the catch block
				throw new Error(data.error || "Failed to load draft");
			} catch (error) {
				// Handle any errors that occurred during the load process
				const errorMsg =
					error instanceof Error ? error.message : "Failed to load draft";
				onError?.(errorMsg);

				// Ensure loading states are properly set even on error
				if (setDraftLoaded) {
					setDraftLoaded(true);
					setInternalDraftLoaded(true);
				}

				return { success: false, error: errorMsg };
			} finally {
				// Always set loading to false when done
				setIsLoading(false);
			}
		},
		[onDraftLoaded, onError, setFormStorage, draftIdFromUrl, setDraftLoaded],
	);

	const listDrafts = useCallback(
		async (filters?: { adminPicId?: string; createdById?: string }) => {
			setIsLoading(true);

			try {
				// Build query parameters if filters are provided
				const params = new URLSearchParams();
				if (filters?.adminPicId)
					params.append("admin_pic_id", filters.adminPicId);
				if (filters?.createdById)
					params.append("created_by_id", filters.createdById);

				const url = `${DRAFT_API_BASE_URL}/drafts${params.toString() ? `?${params.toString()}` : ""}`;

				// Fetch the list of drafts
				const response = await fetch(url, {
					method: "GET",
					headers: {
						Accept: "application/json",
					},
				});

				const data = await response.json();

				// Handle successful list retrieval
				if (data.success) {
					setDrafts(data.drafts);
					return { success: true, drafts: data.drafts };
				}

				// If server returns an error, throw it to be caught by the catch block
				throw new Error(data.error || "Failed to list drafts");
			} catch (error) {
				// Handle any errors that occurred during the list process
				const errorMsg =
					error instanceof Error ? error.message : "Failed to list drafts";
				onError?.(errorMsg);
				return { success: false, error: errorMsg };
			} finally {
				// Always set loading to false when done
				setIsLoading(false);
			}
		},
		[onError],
	);

	const deleteDraft = useCallback(
		async (draftId: string) => {
			setIsLoading(true);

			try {
				// Send delete request to the API
				const response = await fetch(
					`${DRAFT_API_BASE_URL}/drafts/${draftId}`,
					{
						method: "DELETE",
						headers: {
							Accept: "application/json",
							"X-CSRF-Token":
								document
									.querySelector('meta[name="csrf-token"]')
									?.getAttribute("content") || "",
						},
					},
				);

				const data = await response.json();

				// Handle successful deletion
				if (data.success) {
					// Clear the current draft if it's the one being deleted
					setCurrentDraft(null);
					// Remove the draft from the list
					setDrafts((prev) => prev.filter((d) => d.id !== draftId));
					return { success: true };
				}

				// If server returns an error, throw it to be caught by the catch block
				throw new Error(data.error || "Failed to delete draft");
			} catch (error) {
				// Handle any errors that occurred during the delete process
				const errorMsg =
					error instanceof Error ? error.message : "Failed to delete draft";
				onError?.(errorMsg);
				return { success: false, error: errorMsg };
			} finally {
				// Always set loading to false when done
				setIsLoading(false);
			}
		},
		[onError],
	);

	// Utility functions to convert between step indices and step names
	const getStepFromIndex = useCallback((index: number): DraftStep => {
		// Return the step name at the given index, or default to the first step
		return DRAFT_STEPS[index] || DRAFT_STEPS[0];
	}, []);

	const getIndexFromStep = useCallback((step: string): number => {
		// Find the index of the given step name, or default to 0
		const index = DRAFT_STEPS.indexOf(step as DraftStep);
		return index >= 0 ? index : 0;
	}, []);

	/**
	 * Effect to handle draft loading from URL
	 * - Only runs if draft database is enabled and URL draft loading props are provided
	 * - Checks for draftId in URL parameters
	 * - Loads draft if found, otherwise marks as loaded
	 */
	useEffect(() => {
		// Only use draft loading if configured to do so and we have the necessary props
		if (
			USE_DRAFT_DATABASE &&
			draftIdFromUrl !== undefined &&
			setFormStorage &&
			setDraftLoaded
		) {
			// Check if we haven't loaded it yet
			if (!internalDraftLoaded) {
				if (draftIdFromUrl) {
					// Load the draft from database
					loadDraft(draftIdFromUrl);
				} else {
					// No draft to load, mark as loaded
					setDraftLoaded(true);
					setInternalDraftLoaded(true);
				}
			}
		} else if (!USE_DRAFT_DATABASE && setDraftLoaded) {
			// If not using draft database, mark as loaded immediately
			setDraftLoaded(true);
			setInternalDraftLoaded(true);
		}
	}, [
		loadDraft,
		internalDraftLoaded,
		draftIdFromUrl,
		setFormStorage,
		setDraftLoaded,
	]);

	return {
		isLoading,
		drafts,
		currentDraft,
		saveDraft,
		loadDraft,
		listDrafts,
		deleteDraft,
		getStepFromIndex,
		getIndexFromStep,
		setCurrentDraft,
	};
};
