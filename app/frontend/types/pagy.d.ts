export interface Metadata {
	scaffoldUrl: string;
	firstUrl: string;
	prevUrl: string;
	pageUrl: string;
	nextUrl: string;
	lastUrl: string;
	count: number;
	page: number;
	limit: number;
	vars: Vars;
	pages: number;
	last: number;
	in: number;
	from: number;
	to: number;
	prev: any;
	next: any;
	series: string[];
}

export interface Vars {
	countArgs: string[];
	ends: boolean;
	limit: number;
	outset: number;
	page: number;
	pageParam: string;
	size: number;
	countlessMinimal: boolean;
	headers: Headers;
	metadata: string[];
	steps: boolean;
	limitParam: string;
	limitMax: number;
	limitExtra: boolean;
	items: number;
	count: number;
}

export interface Headers {
	page: string;
	limit: string;
	count: string;
	pages: string;
}
