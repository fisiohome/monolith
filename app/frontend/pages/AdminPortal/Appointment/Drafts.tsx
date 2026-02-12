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
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ApptViewChanger from "@/components/admin-portal/appointment/appt-view-changer";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { DRAFT_STEPS_LABELS } from "@/hooks/admin-portal/appointment/use-appointment-draft";
import { cn, populateQueryParams, removeWhiteSpaces } from "@/lib/utils";
import type { Admin } from "@/types/admin-portal/admin";
import type { AppointmentDraft } from "@/types/admin-portal/appointment-draft";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";

export interface AppointmentDraftsProps {
	drafts: AppointmentDraft[];
	admins: Admin[];
}

export interface AppointmentDraftsGlobalPageProps
	extends BaseGlobalPageProps,
		AppointmentDraftsProps {
	[key: string]: any;
}

const columns = (
	handleContinueDraft: (draftId: string) => void,
	handleDeleteDraft: (draftId: string) => void,
	pageURL: string,
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
						<DropdownMenuItem
							onClick={() => handleContinueDraft(row.original.id)}
						>
							<CheckIcon className="size-4" />
							Continue
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => handleDeleteDraft(row.original.id)}
							className="text-destructive"
						>
							<Trash2 className="size-4" />
							Delete Draft
						</DropdownMenuItem>
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
}

const DraftDetails = ({
	row,
	handleContinueDraft,
	handleDeleteDraft,
}: DraftDetailsProps) => {
	const draft = row.original;
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
	];

	return (
		<div className="p-4 space-y-4 rounded-xl border bg-card text-card-foreground md:p-6 text-sm">
			<div className="space-y-1">
				<h4 className="text-base font-bold tracking-tight">
					Draft #{draft.id}
				</h4>
			</div>

			<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
				{infoBlocks.map((item) => (
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
						{typeof item.value === "string" ? (
							<p className="font-semibold text-pretty">{item.value}</p>
						) : (
							item.value
						)}
					</div>
				))}
			</div>

			<div className="flex justify-end gap-2">
				<Button
					variant="ghost-primary"
					onClick={() => handleContinueDraft(row.original.id)}
				>
					<CheckIcon className="size-4" />
					Continue
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

export default function AppointmentDrafts() {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentDraftsGlobalPageProps>();
	const currentUser = globalProps.auth?.currentUser;
	const isSuperAdmin = currentUser?.["isSuperAdmin?"];

	const [selectedAdmin, setSelectedAdmin] = useState<string>(
		isSuperAdmin
			? String(currentUser?.id || "")
			: String(currentUser?.id || ""),
	);
	const [popoverOpen, setPopoverOpen] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState<ResponsiveDialogProps>({
		isOpen: false,
		title: "",
		description: "",
		onOpenChange: () => {},
	});
	const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleContinueDraft = useCallback(
		(draftId: string) => {
			router.get(
				globalProps.adminPortal.router.adminPortal.appointment.new,
				{ draftId: draftId },
				{ preserveState: false },
			);
		},
		[globalProps.adminPortal.router.adminPortal.appointment.new],
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
		() => columns(handleContinueDraft, handleDeleteDraft, pageURL),
		[handleContinueDraft, handleDeleteDraft, pageURL],
	);

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const adminPicId = urlParams.get("admin_pic_id");
		if (adminPicId) {
			setSelectedAdmin(adminPicId);
		} else if (isSuperAdmin) {
			setSelectedAdmin(String(currentUser?.id || ""));
		}
	}, [currentUser, isSuperAdmin]);

	const handleFilterByAdmin = (adminId: string) => {
		setSelectedAdmin(adminId);
		const { fullUrl } = populateQueryParams(pageURL, {
			admin_pic_id: adminId === String(currentUser?.id) ? null : adminId,
		});

		router.get(
			fullUrl,
			{},
			{
				preserveScroll: true,
				only: ["adminPortal", "flash", "errors", "drafts"],
			},
		);
	};

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
						admin_pic_id:
							selectedAdmin === String(currentUser?.id) ? null : selectedAdmin,
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
					<ApptViewChanger activeView="drafts" showNewBadge />

					{isSuperAdmin && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-2 lg:grid-cols-4 xl:grid-cols-5">
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
												{selectedAdmin
													? selectedAdmin === String(currentUser?.id)
														? "Assigned to me"
														: globalProps.admins?.find(
																(admin) => String(admin.id) === selectedAdmin,
															)?.name || "Filter by PIC"
													: "Filter by PIC"}
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
														value=""
														onSelect={() => {
															handleFilterByAdmin(String(currentUser?.id));
															setPopoverOpen(false);
														}}
														className="justify-between"
													>
														Assigned to me
														<CheckIcon
															className={cn(
																"h-4 w-4",
																selectedAdmin === String(currentUser?.id)
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
																handleFilterByAdmin(String(admin.id));
																setPopoverOpen(false);
															}}
														>
															<div className="flex items-center gap-2 flex-1">
																<Avatar className="size-6 !rounded-[0px] text-primary border border-primary">
																	<AvatarFallback className="text-xs !rounded-[0px]">
																		{admin.name?.charAt(0)?.toUpperCase() ||
																			"A"}
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
																	selectedAdmin === String(admin.id)
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
					)}
				</div>

				<div className="space-y-4">
					{globalProps?.drafts?.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12">
								<NotepadTextDashedIcon className="size-12 text-muted-foreground mb-4 opacity-60" />
								<h3 className="text-lg font-semibold mb-2">No drafts found</h3>
								<p className="text-muted-foreground text-center mb-4">
									{isSuperAdmin
										? selectedAdmin
											? "No drafts found for the selected admin."
											: "No appointment drafts available."
										: "You don't have any appointment drafts yet."}
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
								/>
							)}
							currentExpanded={currentExpanded}
						/>
					)}
				</div>
			</PageContainer>

			<ResponsiveDialog {...deleteDialog}>
				<div className="space-y-4">
					<div className="flex justify-end gap-2 max-md:hidden">
						<Button
							variant="outline"
							onClick={() =>
								setDeleteDialog({
									isOpen: false,
									title: "",
									description: "",
									onOpenChange: () => {},
								})
							}
							disabled={isDeleting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmDeleteDraft}
							disabled={isDeleting}
						>
							{isDeleting ? "Deleting..." : "Delete Draft"}
						</Button>
					</div>
					<div className="md:hidden">
						<Button
							variant="destructive"
							onClick={confirmDeleteDraft}
							disabled={isDeleting}
							className="w-full"
						>
							{isDeleting ? "Deleting..." : "Delete Draft"}
						</Button>
					</div>
				</div>
			</ResponsiveDialog>
		</>
	);
}
