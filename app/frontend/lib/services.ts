export const getBrandBadgeVariant = (code: string) => {
	const fh =
		"text-violet-800 bg-violet-100 dark:bg-violet-900 dark:text-violet-100";
	const ph = "text-rose-800 bg-rose-100 dark:bg-rose-900 dark:text-rose-100";
	const w = "text-sky-800 bg-sky-100 dark:bg-sky-900 dark:text-sky-100";
	const po =
		"text-emerald-800 bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-100";

	return code === "FH"
		? fh
		: code === "PH"
			? ph
			: code === "W"
				? w
				: code === "PO"
					? po
					: "";
};
