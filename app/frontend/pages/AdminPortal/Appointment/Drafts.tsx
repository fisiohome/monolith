import { Deferred, Head, Link, router, usePage } from "@inertiajs/react";
import type { ColumnDef, ExpandedState, Row } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronsUpDown,
	ChevronUpIcon,
	ClockIcon,
	MoreHorizontal,
	NotepadTextDashedIcon,
	PencilIcon,
	Trash2,
	User,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import ApptViewChanger from "@/components/admin-portal/appointment/appt-view-changer";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { DataTable } from "@/components/ui/data-table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { DRAFT_STEPS_LABELS } from "@/hooks/admin-portal/appointment/use-appointment-draft";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import {
	cn,
	debounce,
	populateQueryParams,
	removeWhiteSpaces,
} from "@/lib/utils";
import type { Admin } from "@/types/admin-portal/admin";
import type { AppointmentDraft } from "@/types/admin-portal/appointment-draft";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";

export interface StatusReason {
	labelEn: string;
	labelId: string;
	value: string;
}

export interface AppointmentDraftsProps {
	drafts: AppointmentDraft[];
	admins: Admin[];
	statusReasons: StatusReason[];
}

export interface AppointmentDraftsGlobalPageProps
	extends BaseGlobalPageProps,
		AppointmentDraftsProps {
	[key: string]: any;
}

// Helper function to find labelId by value
const findLabelIdByValue = (
	statusReasons: StatusReason[],
	value: string,
): string => {
	const reason = statusReasons?.find((r) => r.value === value);
	return reason?.labelId || value;
};

const columns = (
	handleContinueDraft: (draftId: string) => void,
	handleDeleteDraft: (draftId: string) => void,
	handleUpdateStatusReason: (
		draftId: string,
		currentStatusReason: string | null,
	) => void,
	pageURL: string,
	statusReasons: StatusReason[],
): ColumnDef<AppointmentDraft>[] => [
	{
		id: "select",
		header: ({ table }) => {
			// const isChecked = table.getIsAllPageRowsSelected() ||
			//   (table.getIsSomePageRowsSelected() && "indeterminate")

			return (
				<div className="flex items-start space-x-2">
					{/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                  />
                </TooltipTrigger>
                <TooltipContent side='top'>
                  <span>{isChecked ? 'Un-select all' : 'Select all'}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="border shadow size-8 lg:size-5 border-primary/25"
									onClick={() => table.toggleAllRowsExpanded()}
								>
									{table.getIsAllRowsExpanded() ? (
										<ChevronUpIcon />
									) : (
										<ChevronDownIcon />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								<span>
									{table.getIsAllRowsExpanded() ? "Collapse all" : "Expand all"}
								</span>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			);
		},
		cell: ({ row }) => {
			const toggleExpand = () => {
				row.toggleExpanded();

				const { queryParams: currentQuery } = populateQueryParams(pageURL);
				const expandedList = removeWhiteSpaces(currentQuery?.expanded || "")
					.split(",")
					.filter(Boolean);
				const id = String(row.original.id);
				const updatedList = row.getIsExpanded()
					? expandedList.filter((item) => item !== id)
					: [...expandedList, id];

				const { fullUrl, queryParams } = populateQueryParams(pageURL, {
					expanded: updatedList.join(","),
				});

				router.get(fullUrl, queryParams, {
					only: ["flash"],
					preserveScroll: true,
					preserveState: true,
					replace: true,
				});
			};

			return (
				<div className="flex items-start space-x-2">
					{/* <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Select row"
                  className="translate-y-[2px]"
                />
              </TooltipTrigger>
              <TooltipContent side='top'>
                <span>{row.getIsSelected() ? 'Un-select' : 'Select'}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider> */}

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="border shadow size-8 lg:size-5 border-primary/25"
									onClick={toggleExpand}
								>
									{row.getIsExpanded() ? (
										<ChevronUpIcon />
									) : (
										<ChevronDownIcon />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								<span>{row.getIsExpanded() ? "Collapse" : "Expand"}</span>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			);
		},
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "id",
		header: "Draft ID",
		cell: ({ row }) => (
			<span className="font-medium">#{String(row.original.id)}</span>
		),
	},
	{
		id: "patientName",
		header: "Patient",
		cell: ({ row }) => {
			const patientName = row.original.formData?.patientDetails?.fullName;

			return (
				<span className="font-medium text-sm">
					{patientName?.toUpperCase() || "N/A"}
				</span>
			);
		},
	},
	{
		id: "locationCity",
		header: "Location",
		cell: ({ row }) => {
			const city = row.original.formData?.patientDetails?.location?.city;
			return (
				<span className="text-sm text-muted-foreground">{city || "N/A"}</span>
			);
		},
	},
	{
		accessorKey: "currentStep",
		header: "Last Step",
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground text-nowrap">
				{DRAFT_STEPS_LABELS[
					row.original.currentStep as keyof typeof DRAFT_STEPS_LABELS
				] || row.original.currentStep}
			</span>
		),
	},
	{
		accessorKey: "updatedAt",
		header: "Last Updated",
		cell: ({ row }) => (
			<div className="flex items-center gap-1 text-sm text-muted-foreground text-nowrap">
				<ClockIcon className="size-3 shrink-0 mt-0.5" />
				{formatDistanceToNow(new Date(row.original.updatedAt), {
					addSuffix: true,
					locale: id,
				})}
			</div>
		),
	},
	{
		accessorKey: "adminPic",
		header: "PIC's",
		cell: ({ row }) => <PicDisplay admins={row.original.admins} />,
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.original.status;
			return (
				<Badge
					variant={status === "expired" ? "destructive" : "default"}
					className="text-xs"
				>
					{status === "expired" ? "Expired" : "Active"}
				</Badge>
			);
		},
	},
	{
		id: "statusReason",
		header: "Status Reason",
		cell: ({ row }) => {
			const statusReason = row.original.statusReason;
			const displayReason = statusReason
				? findLabelIdByValue(statusReasons, statusReason)
				: "N/A";
			return (
				<span className="text-sm text-muted-foreground">{displayReason}</span>
			);
		},
	},
	{
		id: "actions",
		header: "",
		cell: ({ row }) => (
			<div className="flex justify-end gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon">
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() => handleContinueDraft(row.original.id)}
								disabled={row.original.status === "expired"}
							>
								<CheckIcon className="size-4" />
								Continue
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									handleUpdateStatusReason(
										row.original.id,
										row.original.statusReason || null,
									)
								}
							>
								<PencilIcon className="size-4" />
								Update Status Reason
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() => handleDeleteDraft(row.original.id)}
								className="text-destructive"
							>
								<Trash2 className="size-4" />
								Delete Draft
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		),
	},
];

interface AdminWithPrimary {
	id: string;
	name: string;
	email: string | null;
	isPrimary: boolean;
}

interface PicDisplayProps {
	admins?: AdminWithPrimary[];
	className?: string;
	badgeClass?: string;
}

function PicDisplay({
	admins,
	className = "",
	badgeClass = "",
}: PicDisplayProps) {
	const { primaryAdmin, otherAdmins } = admins?.reduce(
		(acc, admin) => {
			if (admin.isPrimary) {
				acc.primaryAdmin = admin;
			} else {
				acc.otherAdmins.push(admin);
			}
			return acc;
		},
		{
			primaryAdmin: null as AdminWithPrimary | null,
			otherAdmins: [] as AdminWithPrimary[],
		},
	) || { primaryAdmin: null, otherAdmins: [] };

	if (!primaryAdmin && !otherAdmins.length) {
		return (
			<span className={`text-sm text-muted-foreground ${className}`}>N/A</span>
		);
	}

	return (
		<div className={`flex items-center gap-1 flex-wrap ${className}`}>
			{primaryAdmin && (
				<Badge variant="accent" className={cn("text-xs", badgeClass)}>
					<span className="uppercase">{primaryAdmin.name}</span>
					<span className="mx-1 font-normal">&mdash;</span>
					<span className="font-normal">Primary</span>
				</Badge>
			)}

			{otherAdmins.map((admin) => (
				<div key={admin.id}>
					<Badge variant="accent" className={cn("text-xs", badgeClass)}>
						<span className="uppercase">{admin.name}</span>
					</Badge>
				</div>
			))}
		</div>
	);
}

interface DraftDetailsProps {
	row: Row<AppointmentDraft>;
	handleContinueDraft: (draftId: string) => void;
	handleDeleteDraft: (draftId: string) => void;
	handleUpdateStatusReason: (
		draftId: string,
		currentStatusReason: string | null,
	) => void;
	statusReasons: StatusReason[];
}

const DraftDetails = ({
	row,
	handleContinueDraft,
	handleDeleteDraft,
	handleUpdateStatusReason,
	statusReasons,
}: DraftDetailsProps) => {
	const draft = row.original;

	// Patient data from formData
	const patientData = draft.formData?.patientDetails;
	const patientContact = draft.formData?.contactInformation;

	const infoBlocks = [
		{
			label: "PIC's",
			value: <PicDisplay admins={draft.admins} badgeClass="bg-card shadow" />,
		},
		{
			label: "Last Step",
			value:
				DRAFT_STEPS_LABELS[
					draft.currentStep as keyof typeof DRAFT_STEPS_LABELS
				] || draft.currentStep,
		},
		{
			label: "Last Updated",
			value: formatDistanceToNow(new Date(draft.updatedAt), {
				addSuffix: true,
				locale: id,
			}),
		},
		{
			label: "Created At",
			value: format(new Date(draft.createdAt), "dd MMM yyyy, HH:mm", {
				locale: id,
			}),
		},
		{
			label: "Expires At",
			value: format(new Date(draft.expiresAt), "dd MMM yyyy, HH:mm", {
				locale: id,
			}),
		},
		{
			label: "Status Reason",
			value: draft.statusReason
				? findLabelIdByValue(statusReasons, draft.statusReason)
				: "N/A",
		},
	];

	// Add patient info blocks if patient data exists
	if (patientData) {
		const patientInfoBlocks = [
			{
				label: "Name",
				value: patientData.fullName?.toUpperCase() || "N/A",
				isPatient: true,
			},
			{
				label: "Age",
				value:
					patientData.age && patientData.dateOfBirth
						? `${patientData.age} years — ${format(new Date(patientData.dateOfBirth), "dd MMM yyyy", { locale: id })}`
						: patientData.age
							? `${patientData.age} years`
							: "N/A",
				isPatient: true,
			},
			{
				label: "Gender",
				value: patientData.gender ? patientData.gender.toUpperCase() : "N/A",
				isPatient: true,
			},
			{
				label: "Patient Contact",
				value: patientContact?.contactName?.toUpperCase() || "N/A",
				isPatient: true,
			},
			{
				label: "Phone",
				value: patientContact?.contactPhone || "N/A",
				isPatient: true,
			},
			{
				label: "Email",
				value: patientContact?.email || "N/A",
				isPatient: true,
			},
			{
				label: "Location",
				value: patientData?.location?.city || "N/A",
				isPatient: true,
			},
		];

		// Insert patient info blocks after the basic info blocks
		infoBlocks.splice(5, 0, ...patientInfoBlocks);
	}

	return (
		<div className="p-4 space-y-4 rounded-xl border bg-card text-card-foreground md:p-6 text-sm">
			<div className="space-y-1">
				<h4 className="text-base font-bold tracking-tight">
					Draft #{draft.id}
				</h4>
			</div>

			<div className="space-y-4">
				{/* Draft Information Section */}
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<NotepadTextDashedIcon className="size-4 text-muted-foreground" />
						<h5 className="text-sm font-semibold uppercase text-muted-foreground">
							Draft Information
						</h5>
					</div>
					<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
						{infoBlocks
							.filter((item) => !(item as any).isPatient)
							.map((item) => (
								<div
									key={item.label}
									className={cn(
										"space-y-1 rounded-lg bg-background p-3",
										item.label === "PIC's" ? "col-span-full" : "col-span-1",
									)}
								>
									<p className="text-xs uppercase text-muted-foreground">
										{item.label}
									</p>
									{item.label === "Last Step" ? (
										<p className="font-semibold text-pretty mb-1">
											{item.value}
										</p>
									) : typeof item.value === "string" ? (
										<p className="font-semibold text-pretty">{item.value}</p>
									) : (
										item.value
									)}
								</div>
							))}
					</div>
				</div>

				{/* Patient Information Section */}
				{patientData && (
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<User className="size-4 text-muted-foreground" />
							<h5 className="text-sm font-semibold uppercase text-muted-foreground">
								Patient Information
							</h5>
						</div>
						<div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
							{infoBlocks
								.filter((item) => (item as any).isPatient)
								.map((item) => (
									<div
										key={item.label}
										className="space-y-1 rounded-lg bg-background p-3"
									>
										<p className="text-xs uppercase text-muted-foreground">
											{item.label}
										</p>
										{typeof item.value === "string" ? (
											<p className="font-semibold text-pretty">{item.value}</p>
										) : (
											item.value
										)}
									</div>
								))}
						</div>
					</div>
				)}
			</div>

			<div className="flex justify-end gap-2">
				<Button
					variant="ghost-primary"
					onClick={() => handleContinueDraft(row.original.id)}
					disabled={draft.status === "expired"}
				>
					<CheckIcon className="size-4" />
					Continue
				</Button>
				<Button
					variant="ghost"
					onClick={() =>
						handleUpdateStatusReason(
							row.original.id,
							row.original.statusReason || null,
						)
					}
				>
					<PencilIcon className="size-4" />
					Update Status Reason
				</Button>
				<Button
					variant="ghost-destructive"
					onClick={() => handleDeleteDraft(row.original.id)}
				>
					<Trash2 className="size-4" />
					Delete
				</Button>
				<Button
					variant="ghost"
					onClick={() => row.getToggleExpandedHandler()()}
				>
					Close
				</Button>
			</div>
		</div>
	);
};

// Type for delete dialog state
interface DeleteDialogState {
	isOpen: boolean;
	title: string;
	description: string;
	onOpenChange: (open: boolean) => void;
}

const AppointmentDrafts = () => {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentDraftsGlobalPageProps>();
	const currentUser = globalProps.auth?.currentUser;

	const [popoverOpen, setPopoverOpen] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
		isOpen: false,
		title: "",
		description: "",
		onOpenChange: () => {},
	});
	const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [picConfirmDialog, setPicConfirmDialog] = useState<{
		isOpen: boolean;
		draftId: string | null;
	}>({
		isOpen: false,
		draftId: null,
	});
	const [statusReasonDialog, setStatusReasonDialog] = useState<{
		isOpen: boolean;
		draftId: string | null;
		currentStatusReason: string | null;
	}>({
		isOpen: false,
		draftId: null,
		currentStatusReason: null,
	});

	const [filters, setFilters] = useState(() => {
		const currentQuery = globalProps?.adminPortal?.currentQuery;
		return {
			draftId: currentQuery?.draftId || "",
			adminId: currentQuery?.adminId || "me",
			statusReason: currentQuery?.statusReason || "",
			status: currentQuery?.status || "active",
		};
	});

	const debouncedUpdateQueryParams = useCallback(
		debounce((url) => {
			router.get(
				url,
				{},
				{
					preserveScroll: true,
					preserveState: true,
					replace: true,
					only: ["adminPortal", "flash", "errors", "drafts"],
				},
			);
		}, 150),
		[],
	);

	const handleFilterBy = useCallback(
		({ value, type }: { value: string; type: keyof typeof filters }) => {
			const nextFilters = { ...filters, [type]: value };
			setFilters(nextFilters);

			// Only send the changed field, updateQueryParams will merge and clean status if needed
			const { fullUrl } = populateQueryParams(
				pageURL,
				deepTransformKeysToSnakeCase({
					...nextFilters,
					// null value means reset the another param value
					page: null,
					limit: null,
					expanded: null, // Remove expanded state when filtering
				}),
			);
			debouncedUpdateQueryParams(fullUrl);
		},
		[pageURL, debouncedUpdateQueryParams, filters],
	);

	const handleContinueDraft = useCallback(
		(draftId: string) => {
			const draft = globalProps.drafts?.find((d) => d.id === draftId);
			const isCurrentUserPic = draft?.admins?.some(
				(admin) => String(admin.id) === String(currentUser?.id),
			);

			if (!isCurrentUserPic) {
				// Show confirmation dialog for non-PIC users
				setPicConfirmDialog({
					isOpen: true,
					draftId: draftId,
				});
			} else {
				// Continue directly for PIC users
				router.get(
					globalProps.adminPortal.router.adminPortal.appointment.new,
					{ draft_id: draftId },
					{ preserveState: false },
				);
			}
		},
		[
			globalProps.drafts,
			currentUser?.id,
			globalProps.adminPortal.router.adminPortal.appointment.new,
		],
	);

	const handleDeleteDraft = useCallback((draftId: string) => {
		setDraftToDelete(draftId);
		setDeleteDialog({
			isOpen: true,
			title: "Delete Draft",
			description:
				"Are you sure you want to delete this draft? This action cannot be undone.",
			onOpenChange: (open: boolean) => {
				if (!open) {
					setDraftToDelete(null);
				}
				setDeleteDialog((prev) => ({ ...prev, isOpen: open }));
			},
		});
	}, []);

	const handleConfirmPicAddition = useCallback(async () => {
		if (!picConfirmDialog.draftId) return;

		try {
			// Call API to add current user as PIC
			const response = await fetch(
				`/api/v1/appointments/drafts/${picConfirmDialog.draftId}/add_pic`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						"X-CSRF-Token":
							document
								.querySelector('meta[name="csrf-token"]')
								?.getAttribute("content") || "",
					},
				},
			);

			if (!response.ok) {
				const error = await response.json();
				toast.error(error.error || "Failed to add PIC");
				return;
			}

			// Successfully added as PIC, now redirect to the draft form
			router.get(
				globalProps.adminPortal.router.adminPortal.appointment.new,
				{ draft_id: picConfirmDialog.draftId },
				{ preserveState: false },
			);
			setPicConfirmDialog({ isOpen: false, draftId: null });
		} catch (error) {
			console.error("Add PIC error:", error);
			toast.error("Failed to add PIC");
		}
	}, [
		picConfirmDialog.draftId,
		globalProps.adminPortal.router.adminPortal.appointment.new,
	]);

	const handleCancelPicAddition = useCallback(() => {
		setPicConfirmDialog({ isOpen: false, draftId: null });
	}, []);

	const handleUpdateStatusReason = useCallback(
		(draftId: string, currentStatusReason: string | null) => {
			setStatusReasonDialog({
				isOpen: true,
				draftId,
				currentStatusReason,
			});
		},
		[],
	);

	const handleConfirmStatusReasonUpdate = useCallback(
		async (newStatusReason: string) => {
			if (!statusReasonDialog.draftId) return;

			try {
				const response = await fetch(
					`/api/v1/appointments/drafts/${statusReasonDialog.draftId}/status_reason`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
							"X-CSRF-Token":
								document
									.querySelector('meta[name="csrf-token"]')
									?.getAttribute("content") || "",
						},
						body: JSON.stringify({
							status_reason: newStatusReason,
						}),
					},
				);

				if (!response.ok) {
					const error = await response.json();
					toast.error(error.error || "Failed to update status reason");
					return;
				}

				toast.success("Status reason updated successfully");
				setStatusReasonDialog({
					isOpen: false,
					draftId: null,
					currentStatusReason: null,
				});
				router.reload({
					only: ["adminPortal", "flash", "errors", "drafts"],
				});
			} catch (error) {
				console.error("Update status reason error:", error);
				toast.error("Failed to update status reason");
			}
		},
		[statusReasonDialog.draftId],
	);

	const currentExpanded = useMemo<ExpandedState>(() => {
		const { queryParams } = populateQueryParams(pageURL);
		const expandedList = queryParams?.expanded
			? removeWhiteSpaces(queryParams?.expanded)?.split(",")
			: [];
		const draftsIndex = globalProps?.drafts.reduce(
			(obj, item, index) => {
				if (expandedList.includes(String(item.id))) {
					obj[index] = true;
				}
				return obj;
			},
			{} as Record<number, boolean>,
		);

		return draftsIndex;
	}, [pageURL, globalProps?.drafts]);

	const tableColumns = useMemo(
		() =>
			columns(
				handleContinueDraft,
				handleDeleteDraft,
				handleUpdateStatusReason,
				pageURL,
				globalProps?.statusReasons || [],
			),
		[
			handleContinueDraft,
			handleDeleteDraft,
			handleUpdateStatusReason,
			pageURL,
			globalProps?.statusReasons,
		],
	);

	const confirmDeleteDraft = async () => {
		if (!draftToDelete) return;

		setIsDeleting(true);
		try {
			const response = await fetch(
				`/api/v1/appointments/drafts/${draftToDelete}`,
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						"X-CSRF-Token":
							document
								.querySelector('meta[name="csrf-token"]')
								?.getAttribute("content") || "",
					},
				},
			);

			if (response.ok) {
				toast.success("Draft deleted successfully");
				router.reload({
					only: ["adminPortal", "flash", "errors", "drafts"],
					data: {
						admin_id:
							filters.adminId !== "me" && filters.adminId !== "all"
								? filters.adminId
								: null,
						draft_id: filters.draftId || null,
					},
				});
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to delete draft");
			}
		} catch (error) {
			console.error("Delete draft error:", error);
			toast.error("Failed to delete draft");
		} finally {
			setIsDeleting(false);
			setDeleteDialog({
				isOpen: false,
				title: "",
				description: "",
				onOpenChange: () => {},
			});
			setDraftToDelete(null);
		}
	};

	return (
		<>
			<Head title="Appointment Drafts" />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							Appointment Drafts
						</h1>

						<p className="w-full text-sm text-muted-foreground text-pretty md:max-w-[60ch]">
							Manage and continue your appointment booking drafts
						</p>
					</div>
				</div>

				<Separator className="bg-border" />

				<div className="space-y-2">
					<ApptViewChanger activeView="drafts" />

					<div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-2 lg:grid-cols-4">
						<div className="relative">
							<Input
								type="text"
								placeholder="Search by Draft ID (e.g., 3 or #3)"
								value={filters.draftId}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
									const value = e.target.value;
									handleFilterBy({ value, type: "draftId" });
								}}
							/>
							{filters.draftId && (
								// biome-ignore lint/a11y/useSemanticElements: act like button
								<div
									role="button"
									tabIndex={0}
									onClick={() => {
										handleFilterBy({ value: "", type: "draftId" });
									}}
									onKeyUp={() => {}}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									<X className="h-4 w-4" />
								</div>
							)}
						</div>

						<Select
							value={filters.statusReason}
							onValueChange={(value) => {
								handleFilterBy({
									value: value === "all" ? "" : value,
									type: "statusReason",
								});
							}}
						>
							<SelectTrigger className="bg-background">
								<SelectValue placeholder="Filter by status reason">
									{filters.statusReason
										? globalProps?.statusReasons?.find(
												(r) => r.value === filters.statusReason,
											)?.labelId
										: "All status reasons"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All status reasons</SelectItem>
								{globalProps?.statusReasons?.map((reason: StatusReason) => (
									<SelectItem key={reason.value} value={reason.value}>
										{reason.labelId}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.status}
							onValueChange={(value) =>
								handleFilterBy({
									value,
									type: "status",
								})
							}
						>
							<SelectTrigger className="bg-background">
								<SelectValue placeholder="Filter by status">
									{filters.status === "expired"
										? "Expired drafts"
										: filters.status === "all"
											? "All drafts"
											: "Active drafts"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="active">Active drafts</SelectItem>
								<SelectItem value="expired">Expired drafts</SelectItem>
								<SelectItem value="all">All drafts</SelectItem>
							</SelectContent>
						</Select>

						<Deferred
							data={["admins"]}
							fallback={<Skeleton className="w-full rounded-md h-10" />}
						>
							<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										aria-expanded={popoverOpen}
										className="bg-background justify-between"
									>
										<span className="line-clamp-1 truncate">
											{filters.adminId === "me"
												? "Assigned to me"
												: filters.adminId === "all"
													? "All"
													: globalProps.admins?.find(
															(admin) => String(admin.id) === filters.adminId,
														)?.name || "Filter by PIC"}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
									<Command>
										<CommandInput placeholder="Search admin..." />
										<CommandList>
											<CommandEmpty>No admin found.</CommandEmpty>
											<CommandGroup>
												<CommandItem
													value="all"
													onSelect={() => {
														handleFilterBy({
															value: "all",
															type: "adminId",
														});
														setPopoverOpen(false);
													}}
													className="justify-between"
												>
													All
													<CheckIcon
														className={cn(
															"h-4 w-4",
															filters.adminId === "all"
																? "opacity-100"
																: "opacity-0",
														)}
													/>
												</CommandItem>

												<CommandItem
													value="me"
													onSelect={() => {
														handleFilterBy({
															value: "me",
															type: "adminId",
														});
														setPopoverOpen(false);
													}}
													className="justify-between"
												>
													Assigned to me
													<CheckIcon
														className={cn(
															"h-4 w-4",
															filters.adminId === "me"
																? "opacity-100"
																: "opacity-0",
														)}
													/>
												</CommandItem>

												{globalProps.admins?.map((admin) => (
													<CommandItem
														key={admin.id}
														value={admin.name}
														onSelect={() => {
															handleFilterBy({
																value: String(admin.id),
																type: "adminId",
															});
															setPopoverOpen(false);
														}}
													>
														<div className="flex gap-2 flex-1">
															<Avatar className="size-6 !rounded-[0px] text-primary border border-primary">
																<AvatarFallback className="text-xs !rounded-[0px]">
																	{admin.name?.charAt(0)?.toUpperCase() || "A"}
																</AvatarFallback>
															</Avatar>

															<div className="flex flex-col">
																<span className="text-sm text-pretty">
																	{admin.name}
																</span>
																{admin?.user?.email && (
																	<span className="text-xs text-muted-foreground">
																		{admin.user.email}
																	</span>
																)}
															</div>
														</div>

														<CheckIcon
															className={cn(
																"h-4 w-4",
																filters.adminId === String(admin.id)
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</Deferred>
					</div>
				</div>

				<div className="space-y-4">
					{globalProps?.drafts?.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12">
								<NotepadTextDashedIcon className="size-12 text-muted-foreground mb-4 opacity-60" />
								<h3 className="text-lg font-semibold mb-2">No drafts found</h3>
								<p className="text-muted-foreground text-center mb-4">
									{filters.adminId === "me"
										? "You don't have any appointment drafts yet."
										: filters.adminId === "all"
											? "No appointment drafts available."
											: `No drafts found for ${
													globalProps.admins?.find(
														(admin) => String(admin.id) === filters.adminId,
													)?.name || "the selected admin"
												}.`}
								</p>
								<Button asChild>
									<Link href="/admin-portal/appointments/new">
										Create New Appointment
									</Link>
								</Button>
							</CardContent>
						</Card>
					) : (
						<DataTable
							columns={tableColumns}
							data={globalProps?.drafts || []}
							subComponent={(row) => (
								<DraftDetails
									row={row}
									handleContinueDraft={handleContinueDraft}
									handleDeleteDraft={handleDeleteDraft}
									handleUpdateStatusReason={handleUpdateStatusReason}
									statusReasons={globalProps?.statusReasons || []}
								/>
							)}
							currentExpanded={currentExpanded}
						/>
					)}
				</div>
			</PageContainer>

			<AlertDialog
				open={deleteDialog.isOpen}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteDialog({
							isOpen: false,
							title: "",
							description: "",
							onOpenChange: () => {},
						});
						setDraftToDelete(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{deleteDialog.title}</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteDialog.description}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteDraft}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "Deleting..." : "Delete Draft"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={picConfirmDialog.isOpen}
				onOpenChange={(open) => {
					if (!open) {
						handleCancelPicAddition();
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							You are not a PIC for this Draft
						</AlertDialogTitle>
						<AlertDialogDescription>
							You are not currently assigned as a PIC for this draft. Would you
							like to add yourself as a PIC and continue working on this draft?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancelPicAddition}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmPicAddition}>
							Yes, Add Me as PIC & Continue
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog
				open={statusReasonDialog.isOpen}
				onOpenChange={(open) => {
					if (!open) {
						setStatusReasonDialog({
							isOpen: false,
							draftId: null,
							currentStatusReason: null,
						});
					}
				}}
			>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Update Status Reason</DialogTitle>
						<DialogDescription>
							Select a reason for the current status of this draft.
						</DialogDescription>
					</DialogHeader>
					<div className="px-0.5 pb-4">
						<Select
							value={statusReasonDialog.currentStatusReason || ""}
							onValueChange={(value) => {
								setStatusReasonDialog((prev) => ({
									...prev,
									currentStatusReason: value,
								}));
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a status reason" />
							</SelectTrigger>
							<SelectContent>
								{globalProps?.statusReasons?.map((reason: StatusReason) => (
									<SelectItem key={reason.value} value={reason.value}>
										{reason.labelId}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setStatusReasonDialog({
									isOpen: false,
									draftId: null,
									currentStatusReason: null,
								});
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (statusReasonDialog.currentStatusReason) {
									handleConfirmStatusReasonUpdate(
										statusReasonDialog.currentStatusReason,
									);
								}
							}}
							disabled={!statusReasonDialog.currentStatusReason}
						>
							Update
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default AppointmentDrafts;
