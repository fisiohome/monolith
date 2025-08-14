import { compareDesc, format, parseISO } from "date-fns";
import { Activity } from "lucide-react";
import { type ComponentProps, memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDateContext } from "@/components/providers/date-provider";
import { cn } from "@/lib/utils";
import type { ScheduleListProps } from "../appointment-list";

export interface HistoryListProps extends ComponentProps<"div"> {
	histories: ScheduleListProps["schedule"]["statusHistories"];
}

const HistoryList: React.FC<HistoryListProps> = memo(function Component({
	className,
	histories,
}) {
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
	const { t } = useTranslation("appointments");

	const { grouped, sortedDates } = useMemo(() => {
		// Group by date
		const grouped: Record<
			string,
			ScheduleListProps["schedule"]["statusHistories"]
		> = {};
		for (const item of histories) {
			const dateKey = format(parseISO(item.changedAt), "yyyy-MM-dd", {
				locale,
				in: tzDate,
			});
			if (!grouped[dateKey]) {
				grouped[dateKey] = [];
			}
			grouped[dateKey].push(item);
		}

		// Sort dates descending
		const sortedDates = Object.keys(grouped).sort((a, b) =>
			compareDesc(parseISO(a, { in: tzDate }), parseISO(b, { in: tzDate })),
		);
		// Sort entries within each date descending by time
		for (const date of sortedDates) {
			grouped[date].sort((a, b) =>
				compareDesc(
					parseISO(a.changedAt, { in: tzDate }),
					parseISO(b.changedAt, { in: tzDate }),
				),
			);
		}

		return { grouped, sortedDates };
	}, [histories, locale, tzDate]);

	/** Make one nice sentence for each history row */
	const getHistoryMessage = useCallback(
		(h: HistoryListProps["histories"][number]) => {
			if (!h.oldStatus || h.oldStatus === "UNSCHEDULED") {
				// first save / “created”
				return t("list.status_histories.created");
			}

			if (h.newStatus === "CANCELLED") {
				return t("list.status_histories.cancelled");
			}

			if (h.oldStatus !== h.newStatus) {
				// genuine transition
				return t("list.status_histories.updated");
			}

			// same → same  (e.g. an admin pressed “save” without changing)
			return t("list.status_histories.reapplied");
		},
		[t],
	);

	return (
		<div className={cn("w-full", className)}>
			{!sortedDates?.length ? (
				<div className="flex flex-col items-center justify-center rounded-md">
					<Activity className="mb-2 size-6 text-muted-foreground/75" />
					<p className="text-sm text-center text-muted-foreground">
						{t("list.status_histories.empty")}
					</p>
				</div>
			) : (
				sortedDates.map((date) => (
					<div key={date} className="mb-2">
						<p className="mb-4 font-medium">
							{format(date, "PPP", { locale, in: tzDate })}
						</p>

						<div className="relative">
							{grouped[date].map((item, index) => (
								<div key={`${date}-${String(index)}`} className="flex gap-4">
									{/* Timeline line and dot */}
									<div className="flex flex-col items-center mt-1">
										<div className="w-4 h-4 rounded-md bg-primary shrink-0" />
										{index !== grouped[date].length - 1 && (
											<div className="w-0.5 h-full bg-border mt-2" />
										)}
									</div>

									{/* Content */}
									<div className="flex-1 pb-4">
										<div className="flex justify-between gap-2">
											<p className="text-sm font-light">
												{format(item.changedAt, timeFormatDateFns, {
													locale,
													in: tzDate,
												})}
											</p>

											<p className="flex-1 font-medium text-right uppercase break-all line-clamp-1 text-pretty">
												{t("list.status_histories.by")}{" "}
												{item.changedBy.profile.name}
											</p>
										</div>

										<div className="my-1">
											<p className="text-pretty">
												<span>{getHistoryMessage(item)}</span>{" "}
												{item.newStatus !== "CANCELLED" && (
													<span className="font-medium">
														{t(
															`statuses.${item.newStatus.toLowerCase().replaceAll(" ", "_")}`,
														)}
													</span>
												)}
											</p>
										</div>

										{item.reason && (
											<div className="font-light">
												<p>
													{t("list.status_histories.reason")}: {item.reason}
												</p>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				))
			)}
		</div>
	);
});

export default HistoryList;
