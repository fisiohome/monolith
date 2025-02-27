import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { useActionPermissions } from "@/hooks/admin-portal/use-therapist-utils";
import { useAuth } from "@/hooks/use-auth";
import { getEmpStatusBadgeVariant } from "@/lib/therapists";
import { cn, generateInitials } from "@/lib/utils";
import type { TableRowDataProps } from "@/pages/AdminPortal/Therapist/Index";
import type { GlobalPageProps } from "@/types/globals";
import { usePage } from "@inertiajs/react";
import { format, formatDistanceToNow } from "date-fns";
import {
	Activity,
	BriefcaseMedical,
	CreditCard,
	Dot,
	Fingerprint,
	Group,
	Hospital,
	InfinityIcon,
	Mail,
	MapPinHouse,
	Microscope,
	Pencil,
	Phone,
	Stethoscope,
	Trash2,
	Users,
} from "lucide-react";
import { Fragment, useMemo } from "react";
import { formatPhoneNumberIntl } from "react-phone-number-input";

export interface ExpandSubTableProps {
	row: TableRowDataProps;
	routeTo: {
		edit: (id: string | number) => void;
		changePassword: (id: string | number) => void;
		delete: (id: string | number) => void;
	};
}
export default function ExpandSubTable({ row, routeTo }: ExpandSubTableProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const { isAuthCurrentUser, isAuthAdmin, isAuthSuperAdmin } = useAuth({
		user: row.original.user,
		auth: globalProps.auth,
	});
	const { isShowEdit, isShowChangePassword, isShowDelete, isPermitted } =
		useActionPermissions({
			authData: globalProps.auth,
			user: row.original.user,
		});

	const isOnline = row.original.user["isOnline?"];
	const currentIP = row.original.user.currentSignInIp;
	const lastIP = row.original.user.lastSignInIp;
	const lastOnlineAt = row.original.user.lastOnlineAt;
	const isSuspended = row.original.user["suspended?"];
	const suspendedAt = row.original.user.suspendAt;
	const suspendEnd = row.original.user.suspendEnd;
	const profiles = useMemo(() => {
		const personalDetails = [
			{ icon: Users, label: "Gender", value: row.original.gender },
			{
				icon: Phone,
				label: "Phone",
				value: row.original?.phoneNumber
					? formatPhoneNumberIntl(row.original.phoneNumber)
					: "-",
			},
			{ icon: Mail, label: "Email", value: row.original.user.email },
		];
		const employmentDetails = [
			{ icon: Group, label: "Batch", value: row.original.batch },
			{
				icon: Activity,
				label: "Status",
				value: (
					<Badge
						className={cn(
							"text-xs",
							getEmpStatusBadgeVariant(row.original.employmentStatus),
						)}
					>
						{row.original.employmentStatus}
					</Badge>
				),
			},
			{
				icon: Hospital,
				label: "Therapist at",
				value: `${row.original.service.code} - ${row.original.service.name.replaceAll("_", " ")}`,
			},
			{
				icon: BriefcaseMedical,
				label: "Type",
				value: row.original.employmentType,
			},
			{
				icon: Microscope,
				label: "Specializations",
				value: row.original.specializations?.length ? (
					<div className="flex flex-wrap items-center justify-end gap-1 text-center">
						{row.original.specializations.map((specialization) => (
							<Badge key={specialization}>{specialization}</Badge>
						))}
					</div>
				) : (
					"-"
				),
			},
			{
				icon: Stethoscope,
				label: "Treatment Modalities",
				value: row.original.modalities?.length ? (
					<div className="flex flex-wrap items-center justify-end gap-1 text-center">
						{row.original.modalities.map((modality) => (
							<Badge key={modality} variant="secondary">
								{modality}
							</Badge>
						))}
					</div>
				) : (
					"-"
				),
			},
		];

		return [
			{
				id: "personal" as const,
				title: "Personal Details",
				items: personalDetails,
			},
			{
				id: "employment" as const,
				title: "Employment Details",
				items: employmentDetails,
			},
		];
	}, [row.original]);
	const accounts = useMemo(() => {
		type itemID =
			| "lastOnlineAt"
			| "lastSignInAt"
			| "currentSignInIp"
			| "lastSignInIp"
			| "suspendedAt"
			| "suspendEnd";
		const items = [
			{
				id: "lastOnlineAt" as itemID,
				title: "Last Online Session",
				value: row.original?.user?.lastOnlineAt
					? formatDistanceToNow(row.original?.user?.lastOnlineAt, {
							includeSeconds: true,
							addSuffix: true,
						})
					: "-",
			},
			{
				id: "lastSignInAt" as itemID,
				title: "Last Sign-in",
				value: row.original?.user?.lastSignInAt
					? formatDistanceToNow(row.original?.user?.lastSignInAt, {
							includeSeconds: true,
							addSuffix: true,
						})
					: "-",
			},
		];

		if (isAuthAdmin) {
			items.push({
				id: "currentSignInIp" as itemID,
				title: "Current IP Address",
				value: row.original?.user?.currentSignInIp || "-",
			});
			items.push({
				id: "lastSignInIp" as itemID,
				title: "Last IP Address",
				value: row.original?.user?.lastSignInIp || "-",
			});
		}

		if (isSuspended) {
			items.push({
				id: "suspendedAt" as itemID,
				title: "Suspend on",
				value: suspendedAt ? format(suspendedAt, "PP") : "-",
			});
			items.push({
				id: "suspendEnd" as itemID,
				title: "Suspend until",
				value: suspendEnd ? format(suspendEnd, "PP") : "",
			});
		}

		return {
			title: "Account Activity",
			icon: Fingerprint,
			items,
		};
	}, [row.original?.user, isAuthAdmin, isSuspended, suspendedAt, suspendEnd]);

	return (
		<div className="grid w-full grid-cols-12 gap-2 text-sm motion-preset-bounce">
			<Card className="col-span-full lg:col-span-5">
				<CardHeader>
					<div className="flex items-center w-full gap-2 text-left">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger>
									<Avatar className="border rounded-lg size-10">
										<AvatarImage src="#" alt={row.original.name} />
										<AvatarFallback
											className={cn(
												"text-sm rounded-lg",
												isSuspended
													? "bg-destructive text-destructive-foreground"
													: isAuthCurrentUser
														? "bg-primary text-primary-foreground"
														: isOnline
															? "bg-emerald-700 text-white"
															: "",
											)}
										>
											{generateInitials(row.original.name)}
										</AvatarFallback>
									</Avatar>
								</TooltipTrigger>
								<TooltipContent>
									{isSuspended ? (
										<div className="flex flex-col">
											{suspendedAt && (
												<span>
													Suspend on: <b>{format(suspendedAt, "PP")}</b>
												</span>
											)}
											<span className="flex items-center">
												Suspend until:{" "}
												<b>
													{suspendEnd ? (
														format(suspendEnd, "PP")
													) : (
														<InfinityIcon className="ml-1 size-4" />
													)}
												</b>
											</span>
										</div>
									) : isAuthSuperAdmin ? (
										<div className="flex flex-col">
											{isOnline ? (
												<span>
													Current IP: <b>{currentIP}</b>
												</span>
											) : (
												<>
													<span>
														Last IP: <b>{lastIP}</b>
													</span>
													{lastOnlineAt && (
														<span>
															Last Online:{" "}
															<b>
																{formatDistanceToNow(lastOnlineAt, {
																	includeSeconds: true,
																	addSuffix: true,
																})}
															</b>
														</span>
													)}
												</>
											)}
										</div>
									) : (
										<span>{isOnline ? "Online" : "Offline"}</span>
									)}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<div className="flex-1 leading-tight text-left">
							<CardTitle className="text-base uppercase">
								{row.original.name}
							</CardTitle>
							<CardDescription className="text-xs">
								#{row.original.registrationNumber}
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-3">
					{profiles.map((profile) => (
						<div key={profile.id} className="grid gap-3">
							{profile.id === "employment" && <h3>{profile.title}</h3>}

							{profile.items.map((item) => (
								<Fragment key={item.label}>
									<div
										key={item.label}
										className="flex items-start justify-between gap-4 font-light text-pretty"
									>
										<div className="flex items-center gap-2">
											<item.icon className="size-4 text-muted-foreground/75" />
											<span>{item.label}: </span>
										</div>
										<div className="font-medium text-right break-words truncate whitespace-normal hyphens-manual">
											{item.value}
										</div>
									</div>
								</Fragment>
							))}

							{profile.id !== "employment" && <Separator />}
						</div>
					))}
				</CardContent>
			</Card>

			<div className="grid grid-cols-12 gap-2 col-span-full lg:col-span-7">
				<Card className="col-span-full">
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<accounts.icon className="size-4" />
							{accounts.title}
						</CardTitle>
					</CardHeader>
					<CardContent className="grid items-center grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
						{accounts.items.map((item) => (
							<div
								key={item.id}
								className="flex flex-col font-light text-pretty"
							>
								<span>{item.title}: </span>
								<span className="font-medium break-words truncate whitespace-normal hyphens-manual">
									{item.id === "suspendEnd" && !item.value ? (
										<InfinityIcon className="size-4" />
									) : (
										item.value
									)}
								</span>
							</div>
						))}
					</CardContent>
				</Card>

				<Card className="col-span-full md:col-span-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<CreditCard className="size-4" />
							Bank Accounts
						</CardTitle>
					</CardHeader>
					<CardContent>
						{row.original.bankDetails?.length ? (
							<div className="grid gap-4">
								{row.original.bankDetails.map((detail, index) => (
									<Fragment key={detail.id}>
										<div className="grid gap-2">
											<p className="flex items-center gap-2 font-medium">
												<span>{detail.bankName.toUpperCase()}</span>
												{detail.active && (
													<Dot
														className="text-emerald-600"
														width={10}
														height={10}
														strokeWidth={20}
													/>
												)}
											</p>

											<div className="grid font-light">
												<span>{detail.accountHolderName}</span>
												<span>{detail.accountNumber}</span>
											</div>
										</div>

										{row.original.bankDetails.length > 1 &&
											index + 1 !== row.original.bankDetails.length && (
												<Separator />
											)}
									</Fragment>
								))}
							</div>
						) : (
							<p>
								There's no bank details yet, let's get started by adding the
								data first.
							</p>
						)}
					</CardContent>
				</Card>

				<Card className="col-span-full md:col-span-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<MapPinHouse className="size-4" />
							Addresses
						</CardTitle>
					</CardHeader>
					<CardContent>
						{row.original.addresses?.length ? (
							<div className="grid gap-4">
								<Accordion type="multiple" className="w-full">
									{row.original.addresses.map((item) => (
										<AccordionItem key={item.id} value={String(item.id)}>
											<AccordionTrigger>
												<div className="flex items-center">
													<p className="flex-1 font-medium">
														{item.location.state} - {item.location.city}
													</p>
													{item.active && (
														<Dot
															className="flex-none mr-3 text-emerald-600"
															width={10}
															height={10}
															strokeWidth={20}
														/>
													)}
												</div>
											</AccordionTrigger>
											<AccordionContent>
												<div className="grid gap-2">
													<div className="flex flex-col font-light text-pretty">
														<span>Country:</span>
														<span className="font-medium">
															{item.location.countryCode} -{" "}
															{item.location.country}
														</span>
													</div>

													<div className="flex flex-col font-light text-pretty">
														<span>State - City:</span>
														<span className="font-medium">
															{item.location.state} - {item.location.city}
														</span>
													</div>

													<div className="flex flex-col font-light text-pretty">
														<span>Postal Code:</span>
														<span className="font-medium">
															{item.postalCode}
														</span>
													</div>

													<div className="flex flex-col font-light text-pretty">
														<span>Address:</span>
														<span className="font-medium">{item.address}</span>
													</div>
												</div>
											</AccordionContent>
										</AccordionItem>
									))}
								</Accordion>
							</div>
						) : (
							<p>
								There's no addresses yet, let's get started by adding the data
								first.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			{isPermitted && (
				<div className="grid items-center gap-2 mt-6 col-span-full lg:flex">
					{isShowEdit && (
						<Button
							variant="outline"
							onClick={() => routeTo.edit(row.original.id)}
						>
							<Pencil />
							Edit
						</Button>
					)}

					{isShowChangePassword && (
						<Button
							variant="outline"
							onClick={() => routeTo.changePassword(row.original.id)}
						>
							<Fingerprint />
							Change Password
						</Button>
					)}

					{isShowDelete && (
						<Button
							variant="destructive"
							onClick={() => routeTo.delete(row.original.id)}
						>
							<Trash2 />
							Delete
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
