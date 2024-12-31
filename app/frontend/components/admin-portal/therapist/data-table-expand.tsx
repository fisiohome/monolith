import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { getEmpStatusBadgeVariant } from "@/lib/therapists";
import { cn, formatPhoneNumber, generateInitials } from "@/lib/utils";
import type { TableRowDataProps } from "@/pages/AdminPortal/Therapist/Index";
import type { GlobalPageProps } from "@/types/globals";
import { usePage } from "@inertiajs/react";
import { format, formatDistanceToNow } from "date-fns";
import {
	Activity,
	BriefcaseMedical,
	CreditCard,
	Fingerprint,
	Group,
	Hospital,
	InfinityIcon,
	Mail,
	MapPinHouse,
	Microscope,
	Phone,
	Stethoscope,
	Users,
} from "lucide-react";
import { Fragment, useMemo } from "react";

export interface ExpandSubTableProps {
	row: TableRowDataProps;
	// routeTo: {
	// 	editAdmin: (id: number) => void;
	// 	changePassword: (id: number) => void;
	// 	suspendAdmin: (id: number) => void;
	// };
}
export default function ExpandSubTable({ row }: ExpandSubTableProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	const data = row.original;
	const nameInitial = generateInitials(data.name);
	const isCurrent =
		row.original.user.email === globalProps.auth.currentUser?.user.email;
	const isOnline = row.original.user["isOnline?"];
	const currentIP = row.original.user.currentSignInIp;
	const lastIP = row.original.user.lastSignInIp;
	const lastOnlineAt = row.original.user.lastOnlineAt;
	const isSuspended = row.original.user["suspended?"];
	const suspendedAt = row.original.user.suspendAt;
	const suspendEnd = row.original.user.suspendEnd;
	const profiles = useMemo(() => {
		const personalDetails = [
			{ icon: Users, label: "Gender", value: data.gender },
			{
				icon: Phone,
				label: "Phone",
				value: formatPhoneNumber(data?.phoneNumber) || "-",
			},
			{ icon: Mail, label: "Email", value: data.user.email },
		];
		const employmentDetails = [
			{ icon: Group, label: "Batch", value: data.batch },
			{
				icon: Activity,
				label: "Status",
				value: (
					<Badge className={getEmpStatusBadgeVariant(data.employmentStatus)}>
						{data.employmentStatus}
					</Badge>
				),
			},
			{
				icon: Hospital,
				label: "Therapist at",
				value: `${data.service.code} - ${data.service.name}`,
			},
			{ icon: BriefcaseMedical, label: "Type", value: data.employmentType },
			{
				icon: Microscope,
				label: "Specializations",
				value: data.specializations?.length ? (
					<div className="flex flex-wrap items-center justify-end gap-1 text-center">
						{data.specializations.map((specialization) => (
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
				value: data.modalities?.length ? (
					<div className="flex flex-wrap items-center justify-end gap-1 text-center">
						{data.modalities.map((modality) => (
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
	}, [data]);
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
				value: data?.user?.lastOnlineAt
					? formatDistanceToNow(data?.user?.lastOnlineAt, {
							includeSeconds: true,
							addSuffix: true,
						})
					: "-",
			},
			{
				id: "lastSignInAt" as itemID,
				title: "Last Sign-in",
				value: data?.user?.lastSignInAt
					? formatDistanceToNow(data?.user?.lastSignInAt, {
							includeSeconds: true,
							addSuffix: true,
						})
					: "-",
			},
		];

		if (globalProps.auth.currentUserType === "ADMIN") {
			items.push({
				id: "currentSignInIp" as itemID,
				title: "Current IP Address",
				value: data?.user?.currentSignInIp || "-",
			});
			items.push({
				id: "lastSignInIp" as itemID,
				title: "Last IP Address",
				value: data?.user?.lastSignInIp || "-",
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
	}, [
		data?.user,
		globalProps.auth.currentUserType,
		isSuspended,
		suspendedAt,
		suspendEnd,
	]);

	return (
		<div className="grid w-full grid-cols-12 gap-2 text-sm motion-preset-bounce">
			<Card className="col-span-full lg:col-span-5">
				<CardHeader>
					<div className="flex items-center w-full gap-2 text-left">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger>
									<Avatar className="border rounded-lg size-10">
										<AvatarImage src="#" alt={data.name} />
										<AvatarFallback
											className={cn(
												"text-sm rounded-lg",
												isSuspended
													? "bg-destructive text-destructive-foreground"
													: isCurrent
														? "bg-primary text-primary-foreground"
														: isOnline
															? "bg-emerald-700 text-white"
															: "",
											)}
										>
											{nameInitial}
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
									) : globalProps.auth.currentUser?.["isSuperAdmin?"] ? (
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
										<div className="flex items-center space-x-2">
											<div
												className={cn(
													"rounded-full size-2",
													isOnline ? "bg-green-700" : "bg-gray-500",
												)}
											/>
											<span>{isOnline ? "Online" : "Offline"}</span>
										</div>
									)}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<div className="flex-1 leading-tight text-left">
							<CardTitle className="text-base">{data.name}</CardTitle>
							<CardDescription>#{data.registrationNumber}</CardDescription>
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
						{data.bankDetails?.length ? (
							<div className="grid gap-4">
								{data.bankDetails.map((detail) => (
									<Fragment key={detail.id}>
										<div className="grid gap-2">
											<div className="flex items-start justify-between gap-2">
												<p className="font-medium">
													{detail.bankName.toUpperCase()}
												</p>

												<Badge
													className={
														detail.active ? "bg-emerald-500" : "bg-gray-500"
													}
												>
													{detail.active ? "Active" : "Inactive"}
												</Badge>
											</div>

											<div className="grid font-light">
												<span>{detail.accountHolderName}</span>
												<span>{detail.accountNumber}</span>
											</div>
										</div>

										<Separator />
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
						{data.addresses?.length ? (
							<div className="grid gap-4">
								{data.addresses.map((item) => (
									<Fragment key={item.id}>
										<div className="grid gap-2">
											<div className="flex items-start justify-between gap-2">
												<p className="font-medium">
													{item.location.country} - {item.location.state}
												</p>

												<Badge
													className={
														item.active ? "bg-emerald-500" : "bg-gray-500"
													}
												>
													{item.active ? "Active" : "Inactive"}
												</Badge>
											</div>

											<div className="flex flex-col font-light text-pretty">
												<span>Country:</span>
												<span className="font-medium">
													{item.location.countryCode} - {item.location.country}
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
												<span className="font-medium">{item.postalCode}</span>
											</div>

											<div className="flex flex-col font-light text-pretty">
												<span>Address:</span>
												<span className="font-medium">{item.address}</span>
											</div>
										</div>

										<Separator />
									</Fragment>
								))}
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
		</div>
	);
}
