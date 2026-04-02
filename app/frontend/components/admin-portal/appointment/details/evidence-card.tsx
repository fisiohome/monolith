import { format } from "date-fns";
import { Camera, FileImage, MapPin, ShieldIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AppointmentEvidence } from "@/types/admin-portal/appointment";

interface EvidenceCardProps {
	evidence: AppointmentEvidence | null | undefined;
}

export default function EvidenceCard({ evidence }: EvidenceCardProps) {
	if (!evidence) {
		return (
			<div className="p-4 border rounded-lg shadow-inner border-border bg-sidebar">
				<div className="flex flex-col items-center justify-center rounded-md">
					<ShieldIcon className="mb-2 size-6 text-muted-foreground/75" />
					<p className="text-sm text-center text-muted-foreground">
						No evidence available
					</p>
				</div>
			</div>
		);
	}

	const getPhotoTypeLabel = (type: string) => {
		switch (type.toLowerCase()) {
			case "environment":
				return "Environment";
			case "selfie":
				return "Selfie";
			case "document":
				return "Document";
			default:
				return type;
		}
	};

	const formatFileSize = (bytes?: number) => {
		if (!bytes) return "Unknown size";
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
	};

	return (
		<div className="grid gap-4 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
			<div className="flex items-center">
				<div className="flex flex-col text-xs text-muted-foreground/75">
					<span>Created: {format(new Date(evidence.createdAt), "PPp")}</span>

					{evidence.updatedAt !== evidence.createdAt && (
						<span>
							• Updated: {format(new Date(evidence.updatedAt), "PPp")}
						</span>
					)}
				</div>
			</div>

			<Separator />

			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 text-sm">
				<div>
					<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
						Coordinate
					</h4>
					<p className="whitespace-pre-wrap flex items-center gap-2">
						<MapPin className="size-4 shrink-0" />
						{evidence?.latitude || evidence?.longitude
							? `${evidence.latitude?.toFixed(6)}, ${evidence.longitude?.toFixed(6)}`
							: "N/A"}
					</p>
				</div>

				<div>
					<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
						IP Address
					</h4>
					<p className="whitespace-pre-wrap">{evidence?.ipAddress || "N/A"}</p>
				</div>

				<div className="col-span-full xl:col-span-2">
					<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
						User Agent
					</h4>
					<p className="whitespace-pre-wrap">{evidence?.userAgent || "N/A"}</p>
				</div>

				<div>
					<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
						Notes
					</h4>
					<p className="whitespace-pre-wrap">{evidence?.notes || "N/A"}</p>
				</div>

				{/* Photos */}
				<div className="col-span-full space-y-3">
					<h4 className="flex items-center gap-2 font-medium text-xs uppercase tracking-wide text-muted-foreground/75">
						<Camera className="size-4 shrink-0" />
						Evidence Photos ({evidence.photos.length})
					</h4>

					{evidence.photos.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
							{evidence.photos.map((photo, index) => (
								<div
									key={`${photo.objectKey}-${index}`}
									className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
								>
									<div className="flex items-center gap-3">
										<FileImage className="size-4 text-muted-foreground shrink-0" />
										<div className="text-sm">
											<p className="font-medium">
												{photo.fileName || `Photo ${index + 1}`}
											</p>
											<p className="text-muted-foreground/75 text-xs">
												<span>{formatFileSize(photo.fileSize)}</span>
												{photo.contentType && (
													<>
														<span className="mx-1">&bull;</span>
														<span>{photo.contentType}</span>
													</>
												)}
											</p>
										</div>
									</div>
									<Badge variant="outline" className="text-xs">
										{getPhotoTypeLabel(photo.photoType)}
									</Badge>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No photos available</p>
					)}
				</div>
			</div>
		</div>
	);
}
