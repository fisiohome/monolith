import { router } from "@inertiajs/react";
import { useCallback, useEffect } from "react";
import {
	SESSION_STORAGE_FORM_KEY,
	SESSION_STORAGE_FORM_SELECTIONS_KEY,
} from "@/hooks/admin-portal/appointment/use-appointment-form";
import { SESSION_ISOLINE_KEY, SESSION_MARKERS_KEY } from "@/lib/here-maps";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";

interface UseNavigationGuardProps {
	globalProps: AppointmentNewGlobalPageProps;
	pageURL: string;
	isSuccessBooked: boolean;
	isNavigateConfirm: boolean;
	setIsNavigateConfirm: (confirm: boolean) => void;
}

/**
 * Custom hook to handle navigation guard and storage cleanup
 *
 * This hook manages:
 * - Route change detection and confirmation
 * - Session storage cleanup when navigating away
 * - Prevention of duplicate confirmation dialogs
 * - Handling both 'before' and 'navigate' events for comprehensive coverage
 *
 * @param {UseNavigationGuardProps} props - The hook properties
 */
export function useNavigationGuard({
	globalProps,
	pageURL,
	isSuccessBooked,
	isNavigateConfirm,
	setIsNavigateConfirm,
}: UseNavigationGuardProps) {
	/**
	 * Callback to remove all appointment-related data from session storage
	 * This is called when navigating away from the appointment form
	 */
	const removeStorage = useCallback(() => {
		window.sessionStorage.removeItem(SESSION_STORAGE_FORM_KEY);
		window.sessionStorage.removeItem(SESSION_STORAGE_FORM_SELECTIONS_KEY);
		window.sessionStorage.removeItem(SESSION_ISOLINE_KEY);
		window.sessionStorage.removeItem(SESSION_MARKERS_KEY);
	}, []);

	/**
	 * Effect: Handle 'before' navigation event
	 * - Triggers before any route change
	 * - Determines if navigation should be allowed or intercepted
	 * - Cleans up storage when navigating away from appointment pages
	 * - Uses isNavigateConfirm flag to prevent duplicate confirmations
	 */
	useEffect(() => {
		// Add listener for route changes before they happen
		return router.on("before", (event) => {
			// Prevent multiple confirmation dialogs
			if (isNavigateConfirm) return;

			const url = event.detail.visit.url;
			const path = url.pathname;

			// Determine navigation context
			const isRoot = path === "/";
			const isParentRoot =
				globalProps.adminPortal.router.adminPortal.appointment.index.includes(
					path,
				);
			const isCurrentRoot = pageURL.includes(path);
			const isBookPath = path.includes("book");

			/**
			 * Navigation logic:
			 * - Allow navigation if staying on current page or booking
			 * - Allow if going to parent root after successful booking
			 * - Otherwise, intercept and clean up storage
			 */
			if (
				!isRoot &&
				(!isParentRoot || isSuccessBooked) &&
				(isCurrentRoot || isBookPath)
			) {
				return; // Allow navigation without intervention
			}

			// Log navigation attempt for debugging
			console.log(`Starting a visit to ${url}`);

			// Note: Confirmation modal was removed due to draft feature implementation
			// Previously, users would see a confirmation dialog here
			// Now we automatically clean up and allow navigation
			// 			if (confirm(taf("navigate_away"))) {
			// 				// Confirm navigation away from the current page
			// 				setIsNavigateConfirm(true);
			//
			// 				// Remove the appointment form data from session storage
			// 				removeStorage();
			// 			} else {
			// 				event?.preventDefault();
			// 			}

			// Set flag to prevent duplicate confirmations
			setIsNavigateConfirm(true);

			// Clean up session storage
			removeStorage();
		});
	}, [
		globalProps.adminPortal.router.adminPortal.appointment.index,
		pageURL,
		isSuccessBooked,
		isNavigateConfirm,
		setIsNavigateConfirm,
		removeStorage,
	]);

	/**
	 * Effect: Handle successful navigation
	 * - Triggers after navigation completes
	 * - Cleans up storage for all navigations except within appointment form
	 * - Handles cases where user reloads the page or uses browser back/forward
	 */
	useEffect(() => {
		return router.on("navigate", (event) => {
			const isCurrentRoot = event.detail.page.url.includes("new");
			const isBookPath = event.detail.page.url.includes("book");

			// Don't clean up if staying on appointment form or booking
			if (isCurrentRoot || isBookPath) return;

			// Clean up storage for all other navigations
			removeStorage();

			// Log successful navigation for debugging
			console.log(`Navigated to ${event.detail.page.url}`);
		});
	}, [removeStorage]);
}
