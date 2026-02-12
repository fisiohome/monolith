import { usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { AppointmentBookingSchema } from "@/lib/appointments/form";
import { cn } from "@/lib/utils";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";

type AdminOption = {
	id: string | number;
	name: string;
	email: string;
};

interface AdminPicMultiSelectorProps {
	disabled?: boolean;
	showDescription?: boolean;
	className?: string;
}

export const AdminPicMultiSelector = memo(function AdminPicMultiSelector({
	disabled = false,
	showDescription = true,
	className,
}: AdminPicMultiSelectorProps) {
	const { t } = useTranslation("appointments-form");
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const [open, setOpen] = useState(false);

	const watchAdmins = useWatch({
		control: form.control,
		name: "additionalSettings.admins",
	});

	const adminOptions = useMemo(() => {
		// Transform backend admin data to match AdminOption interface
		return (globalProps.admins || []).map((admin: any) => ({
			id: admin.id,
			name: admin.name,
			email: admin?.email || admin?.user?.email || "",
		}));
	}, [globalProps.admins]);

	const selectedAdmins = useMemo(() => {
		return watchAdmins || [];
	}, [watchAdmins]);

	const onSelectAdmin = useCallback(
		(admin: AdminOption) => {
			const currentAdmins = selectedAdmins;

			// Check if admin is already selected
			if (currentAdmins.find((a) => a.id === admin.id)) {
				return; // Already selected
			}

			// Add new admin
			const adminPic = {
				id: admin.id,
				name: admin.name,
				email: admin.email || "",
			};

			const updatedAdmins = [...currentAdmins, adminPic];
			form.setValue("additionalSettings.admins", updatedAdmins, {
				shouldValidate: true,
			});

			// If this is the first admin, also set it as the primary adminPic
			if (updatedAdmins.length === 1) {
				form.setValue("additionalSettings.admins", updatedAdmins, {
					shouldValidate: true,
				});
			}
		},
		[form, selectedAdmins],
	);

	const onRemoveAdmin = useCallback(
		(adminId: string) => {
			const currentAdmins = selectedAdmins;
			const updatedAdmins = currentAdmins.filter((a) => a.id !== adminId);

			form.setValue("additionalSettings.admins", updatedAdmins, {
				shouldValidate: true,
			});

			// If we removed the primary adminPic, update it to the first remaining admin
			const currentPrimary = form.getValues("additionalSettings.admins")?.[0];
			if (currentPrimary?.id === adminId && updatedAdmins.length > 0) {
				form.setValue("additionalSettings.admins", updatedAdmins, {
					shouldValidate: true,
				});
			} else if (updatedAdmins.length === 0) {
				form.setValue("additionalSettings.admins", [], {
					shouldValidate: true,
				});
			}
		},
		[form, selectedAdmins],
	);

	const primaryAdminId = form.watch("additionalSettings.admins")?.[0]?.id;

	return (
		<FormField
			control={form.control}
			name="additionalSettings.admins"
			render={() => (
				<FormItem className={cn("flex flex-col", className)}>
					<FormLabel>
						{t("draft.admin_pic.label", { defaultValue: "Admin PICs" })}
					</FormLabel>

					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<FormControl>
								<Button
									variant="outline"
									aria-expanded={open}
									disabled={disabled}
									className={cn(
										"w-full justify-between font-normal bg-sidebar shadow-inner h-auto min-h-10 py-2",
										selectedAdmins.length === 0 && "text-muted-foreground",
									)}
								>
									<div className="flex flex-wrap items-center gap-1">
										{selectedAdmins.length > 0 ? (
											selectedAdmins.map((admin) => (
												<Badge
													key={admin.id}
													variant="accent"
													className="text-xs group"
												>
													{admin.name}
													{primaryAdminId === admin.id && (
														<span className="ml-1">(Primary)</span>
													)}
													{primaryAdminId !== admin.id ? (
														// biome-ignore lint/a11y/useSemanticElements: act like a button
														<div
															onClick={(e) => {
																e.stopPropagation();
																e.preventDefault();
																onRemoveAdmin(String(admin.id));
															}}
															onKeyDown={() => {}}
															className="ml-1 hover:text-destructive opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 rounded p-0.5 cursor-pointer"
															role="button"
															tabIndex={0}
															aria-label={`Remove ${admin.name}`}
														>
															<X className="h-3 w-3" />
														</div>
													) : null}
												</Badge>
											))
										) : (
											<span>
												{t("draft.admin_pic.placeholder", {
													defaultValue: "Select Admin PICs...",
												})}
											</span>
										)}
									</div>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</FormControl>
						</PopoverTrigger>
						<PopoverContent
							className="p-0 w-[var(--radix-popover-trigger-width)]"
							align="start"
						>
							<Command>
								<CommandInput
									placeholder={t("draft.admin_pic.search", {
										defaultValue: "Search admin...",
									})}
								/>
								<CommandList>
									<CommandEmpty>
										{t("draft.admin_pic.empty", {
											defaultValue: "No admin found.",
										})}
									</CommandEmpty>
									<CommandGroup>
										{(() => {
											// Separate selected and unselected admins
											const selectedAdminsList = [];
											const unselectedAdminsList = [];

											for (const admin of adminOptions) {
												const isSelected = selectedAdmins.find(
													(a) => a.id === admin.id,
												);
												if (isSelected) {
													selectedAdminsList.push(admin);
												} else {
													unselectedAdminsList.push(admin);
												}
											}

											// Combine: selected admins first, then unselected
											const sortedAdmins = [
												...selectedAdminsList,
												...unselectedAdminsList,
											];

											return sortedAdmins.map((admin) => {
												const isSelected = selectedAdmins.find(
													(a) => a.id === admin.id,
												);
												const isPrimary = primaryAdminId === admin.id;

												return (
													<CommandItem
														key={admin.id}
														value={admin.name}
														onSelect={() => onSelectAdmin(admin)}
														className={cn(isSelected && "bg-primary/5")}
													>
														<div className="flex items-center gap-2 flex-1">
															<Avatar className="size-6 !rounded-[0px] text-primary border border-primary">
																<AvatarFallback className="text-xs !rounded-[0px]">
																	{admin.name?.charAt(0)?.toUpperCase() || "A"}
																</AvatarFallback>
															</Avatar>
															<div className="flex flex-col">
																<span className="text-sm">{admin.name}</span>
																{admin.email && (
																	<span className="text-xs text-muted-foreground">
																		{admin.email}
																	</span>
																)}
															</div>
														</div>
														<div className="flex items-center gap-4">
															{isPrimary && (
																<Badge variant="default" className="text-xs">
																	Primary
																</Badge>
															)}

															<Check
																className={cn(
																	"h-4 w-4",
																	isSelected ? "opacity-100" : "opacity-0",
																)}
															/>
														</div>
													</CommandItem>
												);
											});
										})()}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>

					{showDescription && (
						<FormDescription>
							{t("draft.admin_pic.multi_description", {
								defaultValue:
									"Select one or more admins who will be responsible for this appointment.",
							})}
						</FormDescription>
					)}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
});

export default AdminPicMultiSelector;
