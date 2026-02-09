import { Head, router, usePage } from "@inertiajs/react";
import type { ColumnDef } from "@tanstack/react-table";
import { type ContextFn, format, type Locale } from "date-fns";
import {
	InfoIcon,
	Loader2,
	MoreHorizontal,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { useDateContext } from "@/components/providers/date-provider";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, populateQueryParams } from "@/lib/utils";
import type {
	FeatureFlag,
	FeatureFlagEnv,
} from "@/types/admin-portal/feature-flag";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";

export interface PageProps {
	featureFlags: FeatureFlag[];
	environments: FeatureFlagEnv[];
	currentEnv: FeatureFlagEnv;
}

export interface FeatureFlagIndexGlobalPageProps
	extends BaseGlobalPageProps,
		PageProps {
	[key: string]: unknown;
}

type FormValues = {
	key: string;
	env: FeatureFlagEnv;
	isEnabled: boolean;
};

const ENV_LABELS: Record<FeatureFlagEnv, string> = {
	DEV: "Development",
	STAGING: "Staging",
	PROD: "Production",
};

export default function Index({
	featureFlags,
	environments,
	currentEnv,
}: PageProps) {
	const { props: globalProps, url: pageURL } =
		usePage<FeatureFlagIndexGlobalPageProps>();
	const { locale, tzDate } = useDateContext();
	const featureFlagsIndexRoute =
		globalProps.adminPortal?.router?.adminPortal?.featureFlags?.index;
	const featureFlagsData = useMemo(
		() => (Array.isArray(featureFlags) ? featureFlags : []),
		[featureFlags],
	);

	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [flagPendingDelete, setFlagPendingDelete] =
		useState<FeatureFlag | null>(null);
	const [isDeleteLoading, setIsDeleteLoading] = useState(false);

	const handleEnvChange = useCallback(
		(env: string) => {
			if (!featureFlagsIndexRoute) return;

			const { fullUrl, queryParams: nextQueryParams } = populateQueryParams(
				featureFlagsIndexRoute,
				{ env },
			);

			router.get(fullUrl, nextQueryParams, {
				only: ["flash", "adminPortal", "featureFlags", "currentEnv"],
				preserveScroll: true,
				preserveState: true,
			});
		},
		[featureFlagsIndexRoute],
	);

	const handleEditFlag = useCallback(
		(flag: FeatureFlag) => {
			const { fullUrl, queryParams: nextQueryParams } = populateQueryParams(
				pageURL,
				{
					edit: flag.key,
				},
			);

			router.get(
				fullUrl,
				{ ...nextQueryParams },
				{
					only: ["flash", "adminPortal"],
					preserveScroll: true,
					preserveState: true,
					replace: true,
				},
			);
		},
		[pageURL],
	);

	const handleDeleteFlag = useCallback((flag: FeatureFlag) => {
		setFlagPendingDelete(flag);
		setIsDeleteLoading(false);
		setIsDeleteDialogOpen(true);
	}, []);

	const handleDeleteDialogOpenChange = useCallback(
		(open: boolean) => {
			if (!open && isDeleteLoading) {
				return;
			}
			setIsDeleteDialogOpen(open);
			if (!open) {
				setFlagPendingDelete(null);
			}
		},
		[isDeleteLoading],
	);

	const handleConfirmDelete = useCallback(() => {
		if (!flagPendingDelete || !featureFlagsIndexRoute) return;

		router.delete(`${featureFlagsIndexRoute}/${flagPendingDelete.key}`, {
			preserveScroll: true,
			preserveState: true,
			onStart: () => setIsDeleteLoading(true),
			onFinish: () => {
				setIsDeleteLoading(false);
				setIsDeleteDialogOpen(false);
				setFlagPendingDelete(null);
			},
		});
	}, [flagPendingDelete, featureFlagsIndexRoute]);

	const handleToggleFlag = useCallback(
		(flag: FeatureFlag) => {
			if (!featureFlagsIndexRoute) return;

			router.post(
				`${featureFlagsIndexRoute}/${flag.key}/toggle`,
				{
					env: flag.env,
				},
				{
					preserveScroll: true,
					preserveState: true,
				},
			);
		},
		[featureFlagsIndexRoute],
	);

	const columns = useMemo<ColumnDef<FeatureFlag>[]>(
		() =>
			getColumns({
				locale,
				tzDate,
				onEditFlag: handleEditFlag,
				onDeleteFlag: handleDeleteFlag,
				onToggleFlag: handleToggleFlag,
			}),
		[handleDeleteFlag, handleEditFlag, handleToggleFlag, locale, tzDate],
	);

	const formDialogMode = useMemo(() => {
		const isCreateMode =
			globalProps.adminPortal?.currentQuery?.new === "feature_flag";
		const editFlagKey = globalProps.adminPortal?.currentQuery?.edit ?? null;
		return { isCreateMode, editFlagKey };
	}, [globalProps.adminPortal?.currentQuery]);

	const flagForEdit = useMemo(() => {
		if (!formDialogMode.editFlagKey) return undefined;
		return featureFlagsData.find(
			(flag) => flag.key === formDialogMode.editFlagKey,
		);
	}, [formDialogMode.editFlagKey, featureFlagsData]);

	const createFlagDialog = useMemo<ResponsiveDialogProps>(() => {
		return {
			title: "Create Feature Flag",
			description: "Create a new feature flag for the selected environment.",
			isOpen: formDialogMode.isCreateMode,
			dialogWidth: "480px",
			onOpenChange: () => {
				const { fullUrl, queryParams: nextQueryParams } = populateQueryParams(
					pageURL,
					{ new: null },
				);

				router.get(
					fullUrl,
					{ ...nextQueryParams },
					{
						only: ["flash", "adminPortal"],
						preserveScroll: true,
						preserveState: true,
						replace: true,
					},
				);
			},
		};
	}, [formDialogMode.isCreateMode, pageURL]);

	const editFlagDialog = useMemo<ResponsiveDialogProps>(() => {
		const isOpen = Boolean(formDialogMode.editFlagKey);
		return {
			title: "Edit Feature Flag",
			description: "Update the feature flag settings.",
			isOpen,
			dialogWidth: "480px",
			onOpenChange: () => {
				const { fullUrl, queryParams: nextQueryParams } = populateQueryParams(
					pageURL,
					{ edit: null },
				);

				router.get(
					fullUrl,
					{ ...nextQueryParams },
					{
						only: ["flash", "adminPortal"],
						preserveScroll: true,
						preserveState: true,
						replace: true,
					},
				);
			},
		};
	}, [formDialogMode.editFlagKey, pageURL]);

	return (
		<>
			<Head title="Feature Flags" />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							Feature Flags
						</h1>

						<p className="w-full text-sm text-muted-foreground text-pretty md:w-10/12 xl:w-8/12">
							Manage feature flags across different environments. Toggle
							features on or off without deploying code changes.
						</p>
					</div>
				</div>

				<Separator className="bg-border" />

				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<Tabs value={currentEnv} onValueChange={handleEnvChange}>
						<TabsList>
							{environments.map((env) => (
								<TabsTrigger key={env} value={env} className="capitalize">
									{ENV_LABELS[env] ?? env}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>

					<Button
						className="w-full md:w-fit"
						onClick={() => {
							const { fullUrl, queryParams: nextQueryParams } =
								populateQueryParams(pageURL, { new: "feature_flag" });

							router.get(
								fullUrl,
								{ ...nextQueryParams },
								{
									only: ["flash", "adminPortal"],
									preserveScroll: true,
									preserveState: true,
									replace: true,
								},
							);
						}}
					>
						<PlusIcon />
						Create Feature Flag
					</Button>
				</div>

				<DataTable columns={columns} data={featureFlagsData} />

				{createFlagDialog.isOpen && (
					<ResponsiveDialog {...createFlagDialog}>
						<FeatureFlagFormFields
							environments={environments}
							currentEnv={currentEnv}
							forceMode={createFlagDialog.forceMode}
							handleOpenChange={createFlagDialog.onOpenChange}
						/>
					</ResponsiveDialog>
				)}

				{editFlagDialog.isOpen && flagForEdit && (
					<ResponsiveDialog {...editFlagDialog}>
						<FeatureFlagFormFields
							environments={environments}
							currentEnv={currentEnv}
							forceMode={editFlagDialog.forceMode}
							handleOpenChange={editFlagDialog.onOpenChange}
							featureFlag={flagForEdit}
						/>
					</ResponsiveDialog>
				)}

				<AlertDialog
					open={isDeleteDialogOpen}
					onOpenChange={handleDeleteDialogOpenChange}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete feature flag?</AlertDialogTitle>
							<AlertDialogDescription className="text-pretty">
								{flagPendingDelete
									? `This action will permanently delete ${flagPendingDelete.key} from all environments.`
									: "This action cannot be undone."}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isDeleteLoading}>
								Cancel
							</AlertDialogCancel>
							<Button
								variant="destructive"
								disabled={isDeleteLoading}
								onClick={(event) => {
									event.preventDefault();
									handleConfirmDelete();
								}}
							>
								{isDeleteLoading ? (
									<>
										<Loader2 className="mr-2 size-4 animate-spin" />
										Deleting...
									</>
								) : (
									"Delete"
								)}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</PageContainer>
		</>
	);
}

type FeatureFlagColumnContext = {
	locale: Locale;
	tzDate: ContextFn<Date>;
	onEditFlag: (flag: FeatureFlag) => void;
	onDeleteFlag: (flag: FeatureFlag) => void;
	onToggleFlag: (flag: FeatureFlag) => void;
};

function getColumns({
	locale,
	tzDate,
	onEditFlag,
	onDeleteFlag,
	onToggleFlag,
}: FeatureFlagColumnContext): ColumnDef<FeatureFlag>[] {
	return [
		{
			accessorKey: "key",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Key" />
			),
			cell: ({ row }) => (
				<span className="font-mono font-semibold text-sm">
					{row.original.key}
				</span>
			),
		},
		{
			accessorKey: "isEnabled",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Switch
						checked={row.original.isEnabled}
						onCheckedChange={() => onToggleFlag(row.original)}
						aria-label={`Toggle ${row.original.key}`}
					/>
					<Badge
						variant="outline"
						className={cn(
							"border rounded-full text-xs font-semibold uppercase",
							row.original.isEnabled
								? "bg-emerald-50 text-emerald-700 border-emerald-200"
								: "bg-rose-50 text-rose-700 border-rose-200",
						)}
					>
						{row.original.isEnabled ? "Enabled" : "Disabled"}
					</Badge>
				</div>
			),
		},
		{
			accessorKey: "env",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Environment" />
			),
			cell: ({ row }) => (
				<Badge variant="accent" className="uppercase">
					{row.original.env}
				</Badge>
			),
		},
		{
			accessorKey: "updatedAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Last Updated" />
			),
			meta: {
				headerClassName: "hidden md:table-cell",
				cellClassName: "hidden md:table-cell text-nowrap",
			},
			cell: ({ row }) =>
				row?.original?.updatedAt
					? format(new Date(row.original.updatedAt), "PPPp", {
							locale,
							in: tzDate,
						})
					: "N/A",
		},
		{
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			cell: ({ row }) => (
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="border size-8 shadow-none"
								aria-label="Open feature flag actions"
							>
								<MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onSelect={(event) => {
									event.preventDefault();
									onEditFlag(row.original);
								}}
							>
								<PencilIcon className="size-4" />
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onSelect={(event) => {
									event.preventDefault();
									onDeleteFlag(row.original);
								}}
							>
								<Trash2Icon className="size-4" />
								Remove
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			),
			enableSorting: false,
		},
	];
}

type FeatureFlagFormFieldsProps = {
	environments: FeatureFlagEnv[];
	currentEnv: FeatureFlagEnv;
	forceMode?: "dialog" | "drawer";
	handleOpenChange?: (open: boolean) => void;
	featureFlag?: FeatureFlag;
};

const FeatureFlagFormFields = memo(function FeatureFlagFormFields({
	environments,
	currentEnv,
	handleOpenChange,
	featureFlag,
}: FeatureFlagFormFieldsProps) {
	const { props: globalProps } = usePage<FeatureFlagIndexGlobalPageProps>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isEditMode = !!featureFlag;

	const form = useForm<FormValues>({
		defaultValues: {
			key: featureFlag?.key ?? "",
			env: featureFlag?.env ?? currentEnv,
			isEnabled: featureFlag?.isEnabled ?? false,
		},
	});

	const featureFlagsIndexRoute =
		globalProps.adminPortal?.router?.adminPortal?.featureFlags?.index;

	const onSubmit = useCallback(
		(values: FormValues) => {
			if (!featureFlagsIndexRoute) return;

			const endpoint = isEditMode
				? `${featureFlagsIndexRoute}/${featureFlag?.key}`
				: featureFlagsIndexRoute;

			const method = isEditMode ? "put" : "post";
			const resolvedEnv = values.env ?? featureFlag?.env ?? currentEnv;
			const payload = isEditMode
				? {
						feature_flag: {
							key: values.key,
							env: resolvedEnv,
							is_enabled: values.isEnabled,
						},
					}
				: {
						feature_flag: environments.map((env) => ({
							key: values.key,
							env,
							is_enabled: values.isEnabled,
						})),
					};

			router[method](endpoint, payload, {
				preserveScroll: true,
				preserveState: true,
				onStart: () => setIsSubmitting(true),
				onFinish: () => {
					setIsSubmitting(false);
					handleOpenChange?.(false);
				},
			});
		},
		[
			currentEnv,
			environments,
			featureFlagsIndexRoute,
			isEditMode,
			featureFlag?.key,
			featureFlag?.env,
			handleOpenChange,
		],
	);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-1">
				{!isEditMode ? (
					<Alert>
						<InfoIcon className="size-4 shrink-0" />
						<AlertTitle className="leading-normal text-pretty">
							New feature flags are created in all environments (DEV, STAGING,
							PROD).
						</AlertTitle>
					</Alert>
				) : null}

				<FormField
					control={form.control}
					name="key"
					rules={{
						required: "Key is required",
						validate: (value) =>
							/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(value) ||
							"Key must use SCREAMING_SNAKE_CASE (e.g., FEATURE_FLAG_EXAMPLE).",
					}}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Key</FormLabel>
							<FormControl>
								<Input
									placeholder="Enter the feature flag key..."
									className="font-mono"
									disabled={isEditMode}
									{...field}
									onChange={(e) =>
										field.onChange(
											e.target.value.toUpperCase().replace(/\s+/g, "_"),
										)
									}
								/>
							</FormControl>
							<FormDescription>
								A unique identifier for this feature flag. Use{" "}
								<span className="font-semibold">SCREAMING_SNAKE_CASE</span>.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* the env selection is only visible in edit mode */}
				{isEditMode ? (
					<FormField
						control={form.control}
						name="env"
						rules={{ required: "Environment is required" }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Environment</FormLabel>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
									disabled={isEditMode}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select environment" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{environments.map((env) => (
											<SelectItem
												key={env}
												value={env}
												className="flex flex-col items-start gap-0.5"
											>
												<span className="capitalize">
													{ENV_LABELS[env] ?? env}
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormDescription>
									The environment where this flag will be applied.
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				) : null}

				<FormField
					control={form.control}
					name="isEnabled"
					render={({ field }) => (
						<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<FormLabel className="text-base">Enabled</FormLabel>
								<FormDescription>
									Turn this feature flag{" "}
									<span className="font-semibold">on</span> or{" "}
									<span className="font-semibold">off</span>.
								</FormDescription>
							</div>
							<FormControl>
								<Switch
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
						</FormItem>
					)}
				/>

				<div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={() => handleOpenChange?.(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								{isEditMode ? "Updating..." : "Creating..."}
							</>
						) : isEditMode ? (
							"Update Feature Flag"
						) : (
							"Create Feature Flag"
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
});
