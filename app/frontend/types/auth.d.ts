import type { Timestamp } from "./globals";

export type User = {
	id: number;
	email: string;
	lastOnlineAt: string | null;
	lastSignInAt: string | null;
	currentSignInIp: string | null;
	lastSignInIp: string | null;
	"isOnline?": boolean;
	"suspended?": boolean;
	suspendAt: string | null;
	suspendEnd: string | null;
} & Timestamp;
