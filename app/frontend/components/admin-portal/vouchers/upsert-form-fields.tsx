import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
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
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Package } from "@/types/admin-portal/package";
import type { Voucher } from "@/types/admin-portal/vouchers";
import type { GlobalPageProps, ResponsiveDialogMode } from "@/types/globals";

type VoucherFormValues = z.infer<typeof formSchema>;

const DISCOUNT_TYPE_OPTIONS = [
	{ value: "PERCENTAGE", label: "Percentage" },
	{ value: "FIXED", label: "Fixed Amount" },
] as const;

const formSchema = z.object({
	code: z.string().min(3, { message: "Code must be at least 3 characters" }),
	name: z.string().refine(
		(value) => {
			const trimmed = value.trim();
			return trimmed.length === 0 || trimmed.length >= 3;
		},
		{ message: "Name must be at least 3 characters" },
	),
	description: z.string().optional(),
	discountType: z.enum(["PERCENTAGE", "FIXED"]),
	discountValue: z.string().refine(
		(value) => {
			const parsed = Number(value);
			return !Number.isNaN(parsed) && parsed > 0;
		},
		{ message: "Discount value must be greater than 0" },
	),
	maxDiscountAmount: z
		.string()
		.optional()
		.refine(
			(value) => {
				if (!value || value.trim() === "") return true;
				const parsed = Number(value);
				return !Number.isNaN(parsed) && parsed >= 0;
			},
			{ message: "Max discount amount must be zero or greater" },
		),
	minOrderAmount: z
		.string()
		.optional()
		.refine(
			(value) => {
				if (!value || value.trim() === "") return true;
				const parsed = Number(value);
				return !Number.isNaN(parsed) && parsed >= 0;
			},
			{ message: "Min order amount must be zero or greater" },
		),
	quota: z.string().refine(
		(value) => {
			const parsed = Number(value);
			return !Number.isNaN(parsed) && Number.isInteger(parsed) && parsed > 0;
		},
		{ message: "Quota must be a positive whole number" },
	),
	validFrom: z
		.string()
		.optional()
		.refine(
			(value) => {
				if (!value || value.trim() === "") return true;
				return !Number.isNaN(Date.parse(value));
			},
			{ message: "Enter a valid start date" },
		),
	validUntil: z
		.string()
		.optional()
		.refine(
			(value) => {
				if (!value || value.trim() === "") return true;
				return !Number.isNaN(Date.parse(value));
			},
			{ message: "Enter a valid end date" },
		),
	isActive: z.boolean(),
	packageIds: z
		.array(z.string())
		.min(1, { message: "Select at least one package" }),
});

type VoucherNewFormFieldsProps = {
	packages: Package[];
	forceMode?: ResponsiveDialogMode;
	handleOpenChange?: (value: boolean) => void;
	voucher?: Voucher | null;
};

export default function NewVoucherFormFields({
	packages,
	forceMode,
	handleOpenChange,
	voucher,
}: VoucherNewFormFieldsProps) {
	const { props: globalProps } = usePage<
		GlobalPageProps & { errors?: Record<string, string[]> }
	>();

	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();
	const isMobile = useIsMobile();
	const isEditMode = Boolean(voucher);
	const buttonProps = useMemo(
		() => ({
			isLoading,
			forceMode,
			submitText: voucher ? "Update Voucher" : "Create Voucher",
		}),
		[isLoading, forceMode, voucher],
	);
	const packageGroups = useMemo(() => {
		const groups = new Map<
			string,
			{ key: string; label: string; items: Package[] }
		>();

		packages.forEach((pkg) => {
			const rawKey = pkg.service?.name ?? "Standalone Packages";
			const key = rawKey.toUpperCase();
			const label =
				pkg.service?.name?.replaceAll("_", " ") ?? "Standalone Packages";

			if (!groups.has(key)) {
				groups.set(key, { key, label, items: [] });
			}

			groups.get(key)?.items.push(pkg);
		});

		return Array.from(groups.values());
	}, [packages]);

	const form = useForm<VoucherFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			code: "",
			name: "",
			description: "",
			discountType: "PERCENTAGE",
			discountValue: "",
			maxDiscountAmount: "",
			minOrderAmount: "",
			quota: "",
			validFrom: "",
			validUntil: "",
			isActive: true,
			packageIds: [],
		},
		mode: "onBlur",
	});

	useEffect(() => {
		if (!voucher) return;

		form.reset(mapVoucherToFormValues(voucher));
	}, [voucher, form]);

	useEffect(() => {
		if (!globalProps?.errors) return;

		for (const [field, messages] of Object.entries(globalProps.errors)) {
			if (field === "fullMessages") continue;
			form.setError(field as keyof VoucherFormValues, {
				type: "server",
				message: Array.isArray(messages) ? messages.join(", ") : messages,
			});
		}
	}, [globalProps?.errors, form]);

	const onSubmit = (values: VoucherFormValues) => {
		const baseRoute = globalProps.adminPortal.router.adminPortal.vouchers.index;
		const routeURL = isEditMode ? `${baseRoute}/${voucher?.id}` : baseRoute;
		const payload = deepTransformKeysToSnakeCase({
			voucher: {
				code: values.code.trim().toUpperCase(),
				name: values.name.trim(),
				description: values.description?.trim() || null,
				discountType: values.discountType,
				discountValue: Number(values.discountValue),
				maxDiscountAmount: parseOptionalNumber(values.maxDiscountAmount),
				minOrderAmount: parseOptionalNumber(values.minOrderAmount),
				quota: Number(values.quota),
				validFrom: values.validFrom
					? new Date(values.validFrom).toISOString()
					: null,
				validUntil: values.validUntil
					? new Date(values.validUntil).toISOString()
					: null,
				isActive: values.isActive,
				packageIds: values.packageIds.map((id) => Number(id)),
			},
		});
		const requestOptions = {
			preserveScroll: true,
			preserveState: true,
			onStart: () => setIsLoading(true),
			onSuccess: () => {
				form.reset();
				handleOpenChange?.(false);
				toast({
					description: isEditMode
						? "Voucher updated successfully."
						: "Voucher created successfully.",
				});
			},
			onError: () => {
				toast({
					description: isEditMode
						? "Failed to update voucher. Please check the form."
						: "Failed to create voucher. Please check the form.",
					variant: "destructive",
				});
			},
			onFinish: () => setTimeout(() => setIsLoading(false), 300),
		} as const;

		if (isEditMode) {
			router.put(routeURL, payload, requestOptions);
			return;
		}

		router.post(routeURL, payload, requestOptions);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div
					className={cn(
						"space-y-6 px-1",
						isMobile ? "max-h-[75dvh] overflow-y-auto pb-4" : "",
					)}
				>
					<FormField
						control={form.control}
						name="packageIds"
						render={({ field }) => {
							const selectedPackages = packages.filter((pkg) =>
								field.value.includes(String(pkg.id)),
							);

							const visiblePackages = selectedPackages.slice(0, 3);
							const buttonLabel =
								selectedPackages.length === 0
									? "Select packages..."
									: selectedPackages.length <= 3
										? visiblePackages.map((pkg) => pkg.name).join(", ")
										: `${visiblePackages
												.map((pkg) => pkg.name)
												.join(", ")} +${selectedPackages.length - 3} more`;

							return (
								<FormItem>
									<FormLabel>Packages</FormLabel>
									<Popover modal>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													type="button"
													variant="outline"
													className={cn(
														"w-full justify-between font-normal px-3 bg-input",
														!field.value.length && "text-muted-foreground",
													)}
												>
													<span className="truncate pr-4 text-left">
														{buttonLabel}
													</span>
													<div className="flex items-center gap-2">
														{field.value.length > 0 && (
															// biome-ignore lint/a11y/noStaticElementInteractions: act like a button
															<div
																onClick={(event) => {
																	event.preventDefault();
																	event.stopPropagation();
																	field.onChange([]);
																}}
																onKeyDown={() => {}}
																className="text-muted-foreground transition hover:text-foreground"
															>
																<X className="h-4 w-4" />
															</div>
														)}
														<ChevronsUpDown className="opacity-50" />
													</div>
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent
											align="start"
											sideOffset={8}
											className="p-0"
										>
											<Command>
												<CommandInput
													placeholder="Search packages..."
													className="h-10"
												/>
												<CommandList>
													<CommandEmpty>No packages found.</CommandEmpty>
													{packageGroups.length === 0 ? (
														<CommandGroup heading="Packages">
															<CommandItem value="" disabled>
																No packages available
															</CommandItem>
														</CommandGroup>
													) : (
														packageGroups.map(({ key, label, items }) => (
															<CommandGroup key={key} heading={label}>
																{items.map((pkg) => {
																	const value = String(pkg.id);
																	const isSelected =
																		field.value.includes(value);

																	return (
																		<CommandItem
																			key={value}
																			value={`${pkg.name} ${pkg.service?.name ?? ""}`}
																			onSelect={() => {
																				const next = isSelected
																					? field.value.filter(
																							(id) => id !== value,
																						)
																					: [...field.value, value];
																				field.onChange(next);
																			}}
																			className={cn(
																				"flex items-center justify-between",
																				isSelected &&
																					"bg-accent text-accent-foreground",
																			)}
																		>
																			<span>
																				{pkg.name} &bull; {pkg.numberOfVisit}{" "}
																				Visit(s)
																			</span>
																			<Check
																				className={cn(
																					"ml-auto h-4 w-4",
																					isSelected
																						? "opacity-100"
																						: "opacity-0",
																				)}
																			/>
																		</CommandItem>
																	);
																})}
															</CommandGroup>
														))
													)}
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							);
						}}
					/>

					<div className="grid gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="code"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Code</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder="Enter voucher code..."
											className="bg-input"
											disabled={isEditMode}
											onChange={(event) =>
												field.onChange(event.target.value.toUpperCase())
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder="Enter voucher name..."
											className="bg-input"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="discountType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Discount Type</FormLabel>
									<FormControl>
										<Select
											disabled={isEditMode}
											onValueChange={field.onChange}
											value={field.value}
										>
											<SelectTrigger className="bg-input">
												<SelectValue placeholder="Select discount type" />
											</SelectTrigger>
											<SelectContent>
												{DISCOUNT_TYPE_OPTIONS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="discountValue"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Discount Value</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="number"
											min={0}
											disabled={isEditMode}
											step="0.01"
											placeholder="Enter discount value..."
											className="bg-input appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="maxDiscountAmount"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="capitalize">
										Max Discount Amount{" "}
										<span className="text-sm italic font-light">
											- (optional)
										</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="number"
											min={0}
											step="1"
											placeholder="Enter max discount amount..."
											className="bg-input appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="minOrderAmount"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="capitalize">
										Min Order Amount{" "}
										<span className="text-sm italic font-light">
											- (optional)
										</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="number"
											min={0}
											step="1"
											placeholder="Enter min order amount..."
											className="bg-input appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="quota"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Quota</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="number"
											min={1}
											step="1"
											placeholder="Enter quota..."
											className="bg-input appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="isActive"
							render={({ field }) => (
								<FormItem className="flex flex-col gap-2">
									<div className="flex items-center justify-between rounded-md border px-3 py-2">
										<div>
											<FormLabel className="text-base">Status</FormLabel>
											<p className="text-sm text-muted-foreground">
												Toggle to activate or pause the voucher.
											</p>
										</div>

										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="capitalize">
									Description{" "}
									<span className="text-sm italic font-light">
										- (optional)
									</span>
								</FormLabel>
								<FormControl>
									<Textarea
										{...field}
										placeholder="Enter description..."
										className="bg-input"
										rows={4}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="validFrom"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="capitalize">
										Valid From{" "}
										<span className="text-sm italic font-light">
											- (optional)
										</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="datetime-local"
											className="flow-root w-full bg-input"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="validUntil"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="capitalize">
										Valid Until{" "}
										<span className="text-sm italic font-light">
											- (optional)
										</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="datetime-local"
											className="flow-root w-full bg-input"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				<ResponsiveDialogButton {...buttonProps} />
			</form>
		</Form>
	);
}

function parseOptionalNumber(value?: string | null) {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isNaN(parsed) ? null : parsed;
}

function mapVoucherToFormValues(voucher: Voucher): VoucherFormValues {
	return {
		code: voucher.code ?? "",
		name: voucher.name ?? "",
		description: voucher.description ?? "",
		discountType: voucher.discountType,
		discountValue: String(voucher.discountValue ?? ""),
		maxDiscountAmount: String(voucher.maxDiscountAmount ?? ""),
		minOrderAmount: String(voucher.minOrderAmount ?? ""),
		quota: String(voucher.quota ?? ""),
		validFrom: voucher.validFrom
			? formatDateTimeLocal(new Date(voucher.validFrom))
			: "",
		validUntil: voucher.validUntil
			? formatDateTimeLocal(new Date(voucher.validUntil))
			: "",
		isActive: Boolean(voucher.isActive),
		packageIds: (voucher.packages ?? []).map((pkg) => String(pkg.id)),
	};
}

function formatDateTimeLocal(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}
