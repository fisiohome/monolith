import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { LoaderIcon } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn } from "@/lib/utils";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps, ResponsiveDialogMode } from "@/types/globals";

export interface FormServiceDialogContentProps extends ComponentProps<"form"> {
	forceMode?: ResponsiveDialogMode;
	handleOpenChange?: (value: boolean) => void;
}

export function FormServiceDialogContent({
	className,
	forceMode,
	handleOpenChange,
}: FormServiceDialogContentProps) {
	const { props: globalProps } = usePage<
		GlobalPageProps & {
			errors: Record<keyof Service, string[]> & { fullMessages: string[] };
		}
	>();

	// form management
	const [isLoading, setIsLoading] = useState(false);
	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return { isLoading, forceMode };
	}, [isLoading, forceMode]);
	const formSchema = z.object({
		name: z.string().min(3, { message: "Brand name is required" }),
		description: z.string(),
		code: z
			.string()
			.min(1, { message: "Brand code is required" })
			.max(3, { message: "Maximum Brand code is 3 characters" }),
		active: z.boolean(),
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			description: "",
			code: "",
			active: false,
		},
		mode: "onBlur",
	});
	function onSubmit(values: z.infer<typeof formSchema>) {
		console.log("Submitting form to create the brand...");

		const routeURL =
			globalProps.adminPortal.router.adminPortal.serviceManagement.index;

		router.post(
			routeURL,
			deepTransformKeysToSnakeCase({
				service: {
					name: values.name.toUpperCase(),
					description: values.description,
					code: values.code.toUpperCase(),
					active: values.active,
				},
			}),
			{
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading(true);
				},
				onSuccess: () => {
					if (handleOpenChange) {
						handleOpenChange(false);
					}
				},
				onFinish: () => {
					setIsLoading(false);
				},
			},
		);

		console.log("Brand successfully created...");
	}

	// side-effect for server validation
	useEffect(() => {
		if (!globalProps?.errors) return;

		for (const [key, value] of Object.entries(globalProps?.errors)) {
			form.setError(key as any, {
				type: "custom",
				message: (value as string[]).join(", "),
			});
		}
	}, [globalProps.errors, form.setError]);

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn("grid gap-4 grid-cols-1 items-start", className)}
			>
				<div className="grid gap-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input
										{...field}
										autoFocus
										type="text"
										placeholder="Enter the brand name..."
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="code"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Code</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="text"
										placeholder="Enter the brand code..."
										className="w-[35%]"
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Description{" "}
									<span className="text-sm italic font-light">
										- (optional)
									</span>
								</FormLabel>
								<FormControl>
									<Textarea
										placeholder="Enter the brand description..."
										// className="resize-none"
										{...field}
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<ResponsiveDialogButton {...buttonProps} className="col-span-full" />
			</form>
		</Form>
	);
}

// for delete service alert dialog
export interface DeleteServiceAlertDialogProps
	extends ComponentProps<"dialog"> {
	isOpen: boolean;
	onOpenChange?: (open: boolean) => void;
	selectedService: Service | null;
}

export function DeleteServiceAlertDialog({
	isOpen,
	onOpenChange,
	selectedService,
}: DeleteServiceAlertDialogProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);
	const handler = () => {
		console.log(`Deleting the Brand with name: ${selectedService?.name}...`);
		const routeURL = `${globalProps.adminPortal.router.adminPortal.serviceManagement.index}/${selectedService?.id}`;
		router.delete(routeURL, {
			preserveScroll: true,
			preserveState: true,
			onStart: () => {
				setIsLoading(true);
			},
			onFinish: () => {
				setIsLoading(false);
			},
		});
		console.log(
			`Successfully to deleted the Brand with name:  ${selectedService?.name}...`,
		);
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action is irreversible. Deleting actions will permanently
						remove data from our servers and cannot be recovered.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<Button
						variant="destructive"
						disabled={isLoading}
						onClick={(event) => {
							event.preventDefault();
							handler();
						}}
					>
						{isLoading ? (
							<>
								<LoaderIcon className="animate-spin" />
								<span>Deleting...</span>
							</>
						) : (
							<span>Delete</span>
						)}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// for activate/inactive the service
export interface ActivateServiceDialog extends ComponentProps<"form"> {
	selectedService: Service | null;
	forceMode?: ResponsiveDialogMode;
	handleOpenChange?: (value: boolean) => void;
}

export function ActivateServiceDialog({
	className,
	selectedService,
}: ActivateServiceDialog) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);
	const formSchema = z.object({
		name: z.string(),
		code: z.string(),
		active: z.boolean(),
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: selectedService?.name || "",
			code: selectedService?.code || "",
			active: !!selectedService?.active,
		},
		mode: "onBlur",
	});
	function onSubmit(values: z.infer<typeof formSchema>) {
		console.log(
			`Update the status of the brand with brand name: ${values.name}...`,
		);
		const routeURL =
			globalProps.adminPortal.router.adminPortal.serviceManagement.updateStatus;
		router.put(
			routeURL,
			deepTransformKeysToSnakeCase({ id: selectedService?.id }),
			{
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading(true);
				},
				onFinish: () => {
					setIsLoading(false);
				},
			},
		);
		console.log(
			`Successfully to update the status of the brand with brand name: ${values.name}...`,
		);
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn("grid gap-4", className)}
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input
									{...field}
									readOnly
									type="text"
									placeholder="Enter the brand name..."
								/>
							</FormControl>
							<FormDescription>
								This service is currently{" "}
								<b>{selectedService?.active ? "active" : "inactive"}</b>.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex w-full">
					<Button
						type="submit"
						variant={selectedService?.active ? "destructive" : "default"}
						className="w-full"
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								<LoaderIcon className="animate-spin" />
								<span>Please wait...</span>
							</>
						) : (
							<span>{selectedService?.active ? "Inactive" : "Activate"}</span>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
