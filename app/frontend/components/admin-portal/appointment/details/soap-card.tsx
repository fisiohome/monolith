import { format } from "date-fns";
import { FileTextIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AppointmentSoap } from "@/types/admin-portal/appointment";

interface SoapCardProps {
	soap: AppointmentSoap | null | undefined;
}

export default function SoapCard({ soap }: SoapCardProps) {
	if (!soap) {
		return (
			<div className="p-4 border rounded-lg shadow-inner border-border bg-sidebar">
				<div className="flex flex-col items-center justify-center rounded-md">
					<FileTextIcon className="mb-2 size-6 text-muted-foreground/75" />
					<p className="text-sm text-center text-muted-foreground">
						No SOAP notes available
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="grid gap-6 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
			<div className="flex items-center justify-between">
				{soap.isFinalVisit && (
					<Badge variant="secondary" className="text-xs">
						Final Visit
					</Badge>
				)}

				<div className="flex flex-col text-xs text-muted-foreground/75">
					<span>Created: {format(new Date(soap.createdAt), "PPp")}</span>

					{soap.updatedAt !== soap.createdAt && (
						<span>• Updated: {format(new Date(soap.updatedAt), "PPp")}</span>
					)}
				</div>
			</div>

			<Separator />

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<div>
					<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
						Subjective
					</h4>
					<p className="whitespace-pre-wrap">{soap?.subject || "N/A"}</p>
				</div>

				<div>
					<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
						Objective
					</h4>
					<p className="whitespace-pre-wrap">{soap?.objective || "N/A"}</p>
				</div>

				<div>
					<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
						Assessment
					</h4>
					<p className="whitespace-pre-wrap">{soap?.assessment || "N/A"}</p>
				</div>

				<div>
					<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
						Planning
					</h4>
					<p className="whitespace-pre-wrap">{soap?.planning || "N/A"}</p>
				</div>

				<div>
					<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
						Additional Notes
					</h4>
					<p className="whitespace-pre-wrap">
						{soap?.additionalNotes || "N/A"}
					</p>
				</div>

				{soap.isFinalVisit && (
					<>
						<Separator className="col-span-full" />

						<div>
							<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
								Initial Physical Condition
							</h4>
							<p className="whitespace-pre-wrap">
								{soap?.initialPhysicalCondition || "N/A"}
							</p>
						</div>

						<div>
							<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
								Therapy Goal Evaluation
							</h4>
							<p className="whitespace-pre-wrap">
								{soap?.therapyGoalEvaluation || "N/A"}
							</p>
						</div>

						<div>
							<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
								Follow-up Therapy Plan
							</h4>
							<p className="whitespace-pre-wrap">
								{soap?.followUpTherapyPlan || "N/A"}
							</p>
						</div>

						<div>
							<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
								Next Physiotherapy Goals
							</h4>
							<p className="whitespace-pre-wrap">
								{soap?.nextPhysiotherapyGoals || "N/A"}
							</p>
						</div>

						<div>
							<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
								Therapy Outcome Summary
							</h4>
							<p className="whitespace-pre-wrap">
								{soap?.therapyOutcomeSummary || "N/A"}
							</p>
						</div>

						<div>
							<h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground/75 mb-1">
								Notes
							</h4>
							<p className="whitespace-pre-wrap">{soap?.notes || "N/A"}</p>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
